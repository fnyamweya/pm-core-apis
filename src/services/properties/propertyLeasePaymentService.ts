import { PropertyLeasePaymentEntity } from '../../entities/properties/propertyLeasePaymentEntity';
import propertyLeasePaymentRepository from '../../repositories/properties/propertyLeasePaymentRepository';
import { logger } from '../../utils/logger';
import RedisCache from '../../utils/redisCache';
import { BaseService } from '../baseService';
import propertyLeaseAgreementRepository from '../../repositories/properties/propertyLeaseAgreementRepository';
import transactionRepository from '../../repositories/transactions/transactionRepository';
import { TransactionStatus, TransactionType } from '../../constants/transactions';
import smsService from '../sms/smsService';

interface CreatePaymentDTO {
  leaseId: string;
  tenantId: string;
  amount: number;
  paidAt: Date;
  typeCode: string;
  metadata?: Record<string, any>;
}

interface UpdatePaymentDTO {
  amount?: number;
  paidAt?: Date;
  metadata?: Record<string, any>;
}

class PropertyLeasePaymentService extends BaseService<PropertyLeasePaymentEntity> {
  private paymentCache: RedisCache<PropertyLeasePaymentEntity>;

  constructor() {
    super(
      {
        repository: propertyLeasePaymentRepository,
        redisCache: new RedisCache<PropertyLeasePaymentEntity>(3600),
        logger,
      },
      'leasePayment'
    );
    this.paymentCache = new RedisCache<PropertyLeasePaymentEntity>(3600);
    this.logger.info('PropertyLeasePaymentService initialized');
  }

  private async cachePayment(payment: PropertyLeasePaymentEntity): Promise<void> {
    await this.paymentCache.setToCache('leasePayment', payment.id, payment);
    this.logger.info('Lease payment cached', { paymentId: payment.id });
  }

  private async invalidatePaymentCache(paymentId: string): Promise<void> {
    await this.paymentCache.deleteKey('leasePayment', paymentId);
    this.logger.info('Lease payment cache invalidated', { paymentId });
  }

  async createPayment(data: CreatePaymentDTO): Promise<PropertyLeasePaymentEntity> {
    this.logger.info('Creating lease payment', { data });
    // fetch lease with relations to derive organization and currency
    const lease = await propertyLeaseAgreementRepository.findOne({ where: { id: data.leaseId } });
    if (!lease) throw new Error(`Lease ${data.leaseId} not found`);

    // derive organization from lease.organization or lease.unit.property.organization
    const organization = (lease as any).organization || (lease as any).unit?.property?.organization;

    // Create transaction record
    const txn = await transactionRepository.createTransaction({
      type: TransactionType.PAYMENT,
      status: TransactionStatus.COMPLETED,
      amount: data.amount,
      currency: 'KES',
      signature: `${data.tenantId}:${data.leaseId}:${Date.now()}`,
      metadata: { leaseId: data.leaseId, tenantId: data.tenantId, typeCode: data.typeCode },
    });

    // Validate payment type belongs to org (or is global)
    const type = (await (await import('../../repositories/properties/propertyLeasePaymentTypeRepository')).default.getPaymentTypeByCode(data.typeCode));
    if (!type) throw new Error(`Payment type ${data.typeCode} not found`);
    if (organization && (type as any).organization && (type as any).organization.id !== (organization as any).id) {
      throw new Error('Payment type not allowed for this organization');
    }

    const payment = await propertyLeasePaymentRepository.create({
      lease:  { id: data.leaseId }   as any,
      tenant: { id: data.tenantId }  as any,
      organization: organization ? ({ id: (organization as any).id } as any) : undefined,
      amount: data.amount,
      paidAt: data.paidAt,
      type:   { code: data.typeCode } as any,
      metadata: { ...data.metadata, transactionId: txn.id },
    });
    await this.cachePayment(payment);

    // fire-and-forget SMS confirmation to tenant
    try {
      const tenantUser = (payment.tenant as any)?.user;
      const phone = tenantUser?.phone;
      if (phone) {
        const msg = `Payment received: ${data.amount} for lease ${data.leaseId}. Thank you.`;
        await smsService.sendSms(phone, msg, 'LEASE_PAYMENT_RECEIVED');
      }
    } catch (e) {
      logger.warn('Failed to send payment confirmation SMS', { error: e });
    }
    return payment;
  }

  async updatePayment(
    paymentId: string,
    data: UpdatePaymentDTO
  ): Promise<PropertyLeasePaymentEntity> {
    this.logger.info('Updating lease payment', { paymentId, data });
    await propertyLeasePaymentRepository.update(paymentId, data as any);

    const updated = await propertyLeasePaymentRepository.findOne({ where: { id: paymentId } });
    if (!updated) throw new Error(`Payment ${paymentId} not found`);

    await this.invalidatePaymentCache(paymentId);
    await this.cachePayment(updated);
    return updated;
  }

  async getPaymentById(paymentId: string): Promise<PropertyLeasePaymentEntity | null> {
    this.logger.info('Fetching payment by ID', { paymentId });
    let payment = (await this.paymentCache.getFromCache(
      'leasePayment',
      paymentId
    )) as PropertyLeasePaymentEntity | null;

    if (!payment) {
      payment = await propertyLeasePaymentRepository.findOne({ where: { id: paymentId } });
      if (payment) {
        await this.cachePayment(payment);
      }
    }

    return payment;
  }

  async getPaymentsByLease(leaseId: string): Promise<PropertyLeasePaymentEntity[]> {
    this.logger.info('Fetching payments by lease', { leaseId });
    return propertyLeasePaymentRepository.getPaymentsByLease(leaseId);
  }

  async getPaymentsByTenant(tenantId: string): Promise<PropertyLeasePaymentEntity[]> {
    this.logger.info('Fetching payments by tenant', { tenantId });
    return propertyLeasePaymentRepository.getPaymentsByTenant(tenantId);
  }

  async getPaymentsInDateRange(
    start: Date,
    end: Date
  ): Promise<PropertyLeasePaymentEntity[]> {
    this.logger.info('Fetching payments in date range', { start, end });
    return propertyLeasePaymentRepository.getPaymentsInDateRange(start, end);
  }

  async getPaymentsByType(typeCode: string): Promise<PropertyLeasePaymentEntity[]> {
    this.logger.info('Fetching payments by type', { typeCode });
    return propertyLeasePaymentRepository.getPaymentsByType(typeCode);
  }

  async getPaymentsByProperty(
    propertyId: string,
    unitId?: string
  ): Promise<PropertyLeasePaymentEntity[]> {
    this.logger.info('Fetching payments by property', { propertyId, unitId });
    return propertyLeasePaymentRepository.getPaymentsByProperty(propertyId, unitId);
  }

  async getTotalPaidForLease(leaseId: string): Promise<number> {
    this.logger.info('Calculating total paid for lease', { leaseId });
    return propertyLeasePaymentRepository.getTotalPaidForLease(leaseId);
  }
}

export default new PropertyLeasePaymentService();

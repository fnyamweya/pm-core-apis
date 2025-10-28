import { BaseService } from '../baseService';
import { logger } from '../../utils/logger';
import RedisCache from '../../utils/redisCache';
import PropertyLeaseTransactionEntity from '../../entities/properties/propertyLeaseTransactionEntity';
import leaseTxRepo from '../../repositories/properties/propertyLeaseTransactionRepository';
import chargeTxRepo from '../../repositories/properties/propertyLeaseChargeTransactionRepository';
import transactionRepository from '../../repositories/transactions/transactionRepository';
import { TransactionStatus, TransactionType } from '../../constants/transactions';

interface AllocationInput {
  chargeId: string;
  amount: number;
  appliesToDate?: Date;
}

interface CreateLeaseTransactionDTO {
  leaseId: string;
  tenantId: string;
  organizationId: string;
  amount: number;
  currency?: string;
  paidAt?: Date;
  typeCode: string;
  paymentMethodCode?: string;
  allocations?: AllocationInput[];
  metadata?: Record<string, any>;
}

class PropertyLeaseTransactionService extends BaseService<PropertyLeaseTransactionEntity> {
  constructor() {
    super(
      {
        repository: leaseTxRepo,
        redisCache: new RedisCache<PropertyLeaseTransactionEntity>(600),
        logger,
      },
      'leaseTransaction'
    );
  }

  async createLeaseTransaction(data: CreateLeaseTransactionDTO): Promise<PropertyLeaseTransactionEntity> {
    // Derive organization from lease if not provided
    let organizationId = data.organizationId;
    if (!organizationId) {
      const leaseRepo = (await import('../../repositories/properties/propertyLeaseAgreementRepository')).default;
      const lease = await leaseRepo.findOne({ where: { id: data.leaseId } });
      if (!lease) throw new Error(`Lease ${data.leaseId} not found`);
      organizationId = ((lease as any).organization && (lease as any).organization.id) || ((lease as any).unit?.property?.organization?.id);
      if (!organizationId) throw new Error('Organization not found for lease');
    }
    // Create canonical transaction record
    const txn = await transactionRepository.createTransaction({
      type: TransactionType.PAYMENT,
      status: TransactionStatus.COMPLETED,
      amount: data.amount,
      currency: data.currency || 'KES',
      signature: `${data.tenantId}:${data.leaseId}:${Date.now()}`,
      metadata: { leaseId: data.leaseId, tenantId: data.tenantId, typeCode: data.typeCode, ...(data.metadata || {}) },
    });

    // Validate payment type exists
    const type = (await (await import('../../repositories/properties/propertyLeasePaymentTypeRepository')).default.getPaymentTypeByCode(data.typeCode));
    if (!type) throw new Error(`Payment type ${data.typeCode} not found`);

    // Build lease transaction row
    const leaseTx = await leaseTxRepo.create({
      lease: { id: data.leaseId } as any,
      tenant: { id: data.tenantId } as any,
      organization: { id: organizationId } as any,
      transaction: { id: txn.id } as any,
      type: { code: data.typeCode } as any,
      paidAt: data.paidAt ?? new Date(),
      metadata: data.metadata,
    } as any);

    // Optional charge allocations
    if (data.allocations && data.allocations.length > 0) {
      for (const a of data.allocations) {
        await chargeTxRepo.create({
          leaseTransaction: { id: leaseTx.id } as any,
          charge: { id: a.chargeId } as any,
          amount: a.amount,
          appliesToDate: a.appliesToDate ?? null,
        } as any);
      }
    }

    return leaseTx;
  }

  async getByLease(leaseId: string): Promise<PropertyLeaseTransactionEntity[]> {
    return leaseTxRepo.getByLease(leaseId);
  }

  async getByTenant(tenantId: string): Promise<PropertyLeaseTransactionEntity[]> {
    return leaseTxRepo.getByTenant(tenantId);
  }
}

export default new PropertyLeaseTransactionService();

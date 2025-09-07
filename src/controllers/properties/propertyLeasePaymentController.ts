import { Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import { PropertyLeasePaymentEntity } from '../../entities/properties/propertyLeasePaymentEntity';
import propertyLeasePaymentService from '../../services/properties/propertyLeasePaymentService';
import ALLOWED_KINDS from '../../constants/allowedKinds';
import { AllowedKind } from '../../constants/allowedKinds';
import BaseController from '../baseController';
import { logger } from '../../utils/logger';
import mpesaProvider from '../../services/payments/providers/mpesaDaraja';
import transactionRepository from '../../repositories/transactions/transactionRepository';
import { TransactionStatus, TransactionType } from '../../constants/transactions';
import smsService from '../../services/sms/smsService';

const RESPONSE_MESSAGES = {
  SUCCESS: {
    CREATE:          'Payment recorded successfully',
    UPDATE:          'Payment updated successfully',
    RETRIEVE:        'Payment retrieved successfully',
    DELETE:          'Payment deleted successfully',
    BY_LEASE:        'Payments for lease retrieved successfully',
    BY_TENANT:       'Payments for tenant retrieved successfully',
    IN_DATE_RANGE:   'Payments in date range retrieved successfully',
    BY_TYPE:         'Payments by type retrieved successfully',
    BY_PROPERTY:     'Payments for property retrieved successfully',
    TOTAL_PAID:      'Total paid amount retrieved successfully',
  },
  ERROR: {
    PAYMENT_NOT_FOUND: 'Payment not found.',
    INVALID_INPUT:     'Invalid input data.',
  },
};

class PropertyLeasePaymentController extends BaseController<PropertyLeasePaymentEntity> {
  constructor() {
    super(
      propertyLeasePaymentService,
      'LEASE_PAYMENT' as AllowedKind
    );
  }

  /** POST /payments */
  public async createPayment(req: Request, res: Response): Promise<void> {
    const { leaseId } = req.params;
    logger.info('Creating lease payment', { body: req.body, leaseId });
    try {
      const payment = await propertyLeasePaymentService.createPayment({
        ...req.body,
        leaseId,
      });
      this.sendCreated(req, res, payment, RESPONSE_MESSAGES.SUCCESS.CREATE);
    } catch (error: any) {
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.INVALID_INPUT);
    }
  }

  /** PUT /payments/:id */
  public async updatePayment(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    logger.info('Updating lease payment', { paymentId: id, body: req.body });
    try {
      const updated = await propertyLeasePaymentService.updatePayment(id, req.body);
      this.sendOrNotFound(
        updated,
        req,
        res,
        RESPONSE_MESSAGES.SUCCESS.UPDATE,
        RESPONSE_MESSAGES.ERROR.PAYMENT_NOT_FOUND
      );
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /** GET /payments/:id */
  public async getPaymentById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    logger.info('Fetching payment by ID', { paymentId: id });
    try {
      const payment = await propertyLeasePaymentService.getPaymentById(id);
      this.sendOrNotFound(
        payment,
        req,
        res,
        RESPONSE_MESSAGES.SUCCESS.RETRIEVE,
        RESPONSE_MESSAGES.ERROR.PAYMENT_NOT_FOUND
      );
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /** DELETE /payments/:id */
  public async deletePayment(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    logger.info('Deleting lease payment', { paymentId: id });
    try {
      await propertyLeasePaymentService.delete(id);
      res.status(httpStatus.NO_CONTENT).send();
    } catch (error) {
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.PAYMENT_NOT_FOUND);
    }
  }

  /** GET /payments/lease/:leaseId */
  public async getPaymentsByLease(req: Request, res: Response): Promise<void> {
    const { leaseId } = req.params;
    logger.info('Fetching payments for lease', { leaseId });
    try {
      const payments = await propertyLeasePaymentService.getPaymentsByLease(leaseId);
      this.sendSuccess(req, res, payments, RESPONSE_MESSAGES.SUCCESS.BY_LEASE);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /** GET /payments/tenant/:tenantId */
  public async getPaymentsByTenant(req: Request, res: Response): Promise<void> {
    const { tenantId } = req.params;
    const userId = req.user?.sub;
    if (!userId) {
      return this.sendError(req, res, httpStatus.UNAUTHORIZED, 'UNAUTHORIZED', 'Not authenticated');
    }
    // Strong tenant self-access check
    const tenantRepo = (await import('../../repositories/properties/propertyUnitTenantRepository')).default;
    const tenant = await tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant || (tenant as any)?.user?.id !== userId) {
      return this.sendError(req, res, httpStatus.FORBIDDEN, 'FORBIDDEN', 'Not authorized to view these payments');
    }
    logger.info('Fetching payments for tenant', { tenantId });
    try {
      const payments = await propertyLeasePaymentService.getPaymentsByTenant(tenantId);
      this.sendSuccess(req, res, payments, RESPONSE_MESSAGES.SUCCESS.BY_TENANT);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /** POST /leases/:leaseId/payments/initiate (tenant-initiated) */
  public async initiateTenantPayment(req: Request, res: Response): Promise<void> {
    const { leaseId } = req.params;
    const { amount } = req.body as { amount: number };
    const userId = req.user?.sub;
    if (!userId) return this.sendError(req, res, httpStatus.UNAUTHORIZED, 'UNAUTHORIZED', 'Not authenticated');

    try {
      // Load lease to validate tenant owns it and derive org + phone + currency
      const leaseRepo = (await import('../../repositories/properties/propertyLeaseAgreementRepository')).default;
      const lease = await leaseRepo.findOne({ where: { id: leaseId } });
      if (!lease) return this.sendError(req, res, httpStatus.NOT_FOUND, 'NOT_FOUND', 'Lease not found');
      const tenantUser = (lease as any)?.tenant?.user;
      if (!tenantUser || tenantUser.id !== userId) {
        return this.sendError(req, res, httpStatus.FORBIDDEN, 'FORBIDDEN', 'Not your lease');
      }
      const orgId = (lease as any)?.organization?.id || (lease as any)?.unit?.property?.organization?.id;
      if (!orgId) return this.sendError(req, res, httpStatus.BAD_REQUEST, 'INVALID_ORG', 'Organization missing on lease');

      const currency = (lease as any)?.organization?.metadata?.currency || (lease as any)?.unit?.property?.organization?.metadata?.currency || 'KES';
      const payerPhone = tenantUser.phone;
      const initResp = await mpesaProvider.initiatePayment({ amount, currency, payerPhone, metadata: { leaseId, tenantId: (lease as any).tenant?.id, orgId } }, orgId);

      // Create pending transaction linked to this checkout
      const txn = await transactionRepository.createTransaction({
        type: TransactionType.PAYMENT,
        status: TransactionStatus.PENDING,
        amount,
        currency,
        providerTransactionId: initResp.reference,
        signature: `${tenantUser.id}:${leaseId}:${Date.now()}`,
        metadata: { leaseId, tenantId: (lease as any).tenant?.id, orgId },
      });

      this.sendCreated(req, res, { checkout: initResp, transactionId: txn.id }, 'Payment initiated');
    } catch (error) {
      this.handleError(error as any, req, res);
    }
  }

  /** POST /payments/webhooks/mpesa */
  public async mpesaWebhook(req: Request, res: Response): Promise<Response> {
    try {
      const parsed = mpesaProvider.parseWebhook({ provider: 'MPESA', payload: req.body });
      if (!parsed.providerTransactionId) return res.status(httpStatus.BAD_REQUEST).send('missing providerTxnId');
      const txn = await transactionRepository.getTransactionByProviderId(parsed.providerTransactionId);
      if (!txn) return res.status(httpStatus.NOT_FOUND).send('txn not found');
      // verify per-org shared token if configured
      const orgId = (txn.metadata as any)?.orgId;
      if (orgId) {
        const ok = await mpesaProvider.verifyWebhook(orgId, req.headers as any, (req as any).rawBody);
        if (!ok) return res.status(httpStatus.FORBIDDEN).send('invalid signature');
      }

      if (parsed.status === 'COMPLETED') {
        await transactionRepository.updateTransactionStatus(txn.id, TransactionStatus.COMPLETED);
        const meta = txn.metadata || {} as any;
        // Create payment record
        const payment = await propertyLeasePaymentService.createPayment({
          leaseId: meta.leaseId,
          tenantId: meta.tenantId,
          amount: parsed.amount || txn.amount,
          paidAt: new Date(),
          typeCode: 'RENT',
          metadata: { provider: 'MPESA', providerTransactionId: parsed.providerTransactionId },
        });
        // SMS confirmation
        const phone = (payment.tenant as any)?.user?.phone;
        if (phone) await smsService.sendSms(phone, `Payment received: ${payment.amount}`, 'LEASE_PAYMENT_RECEIVED');
      } else if (parsed.status === 'FAILED') {
        await transactionRepository.updateTransactionStatus(txn.id, TransactionStatus.FAILED);
      }
      return res.status(httpStatus.OK).send('ok');
    } catch (e) {
      logger.error('MPESA webhook error', { e });
      return res.status(httpStatus.INTERNAL_SERVER_ERROR).send('error');
    }
  }

  /** POST /payments/webhooks/mpesa/c2b/validate */
  public async mpesaC2BValidate(req: Request, res: Response): Promise<Response> {
    try {
      const orgId = (req.query.orgId as string) || '';
      if (orgId) {
        const ok = await mpesaProvider.verifyWebhook(orgId, req.headers as any, (req as any).rawBody);
        if (!ok) return res.status(httpStatus.OK).json({ ResultCode: 1, ResultDesc: 'Rejected' });
      }
      const decision = mpesaProvider.parseC2BValidation(req.body);
      if (decision.accept) return res.status(httpStatus.OK).json({ ResultCode: 0, ResultDesc: 'Accepted' });
      return res.status(httpStatus.OK).json({ ResultCode: 1, ResultDesc: decision.reason || 'Rejected' });
    } catch (e) {
      logger.error('MPESA C2B validate error', { e });
      return res.status(httpStatus.OK).json({ ResultCode: 1, ResultDesc: 'Error' });
    }
  }

  /** POST /payments/webhooks/mpesa/c2b/confirm */
  public async mpesaC2BConfirm(req: Request, res: Response): Promise<void> {
    try {
      const orgId = (req.query.orgId as string) || '';
      if (orgId) {
        const ok = await mpesaProvider.verifyWebhook(orgId, req.headers as any, (req as any).rawBody);
        if (!ok) {
          res.status(httpStatus.FORBIDDEN).send('invalid');
          return;
        }
      }
      const conf = mpesaProvider.parseC2BConfirmation(req.body);
      logger.info('C2B confirmation received', conf);
      res.status(httpStatus.OK).json({ ResultCode: 0, ResultDesc: 'Received' });
    } catch (e) {
      logger.error('MPESA C2B confirm error', { e });
      res.status(httpStatus.OK).json({ ResultCode: 1, ResultDesc: 'Error' });
    }
  }

  /** POST /leases/:leaseId/payments/remind-due */
  public async remindDuePayment(req: Request, res: Response): Promise<void> {
    const { leaseId } = req.params;
    logger.info('Sending due payment reminder', { leaseId });
    try {
      const lease = await (await import('../../repositories/properties/propertyLeaseAgreementRepository')).default.findOne({ where: { id: leaseId } });
      if (!lease) return this.sendError(req, res, httpStatus.NOT_FOUND, 'NOT_FOUND', 'Lease not found');
      const service = (await import('../../services/properties/propertyLeaseAgreementService')).default;
      const nextDue = service.computeNextDueDate(lease);
      if (!nextDue) return this.sendSuccess(req, res, { sent: false }, 'No upcoming due date');
      // simple rule: remind if due today or past
      const today = new Date();
      const isDue = nextDue <= new Date(today.getFullYear(), today.getMonth(), today.getDate());
      if (!isDue) return this.sendSuccess(req, res, { sent: false }, 'Not yet due');

      const smsSvc = (await import('../../services/sms/smsService')).default;
      const tenantUser = (lease as any)?.tenant?.user;
      const phone = tenantUser?.phone;
      if (phone) {
        const msg = `Reminder: Rent of ${lease.amount} is due for your lease. Due date: ${nextDue.toISOString().slice(0,10)}`;
        await smsSvc.sendSms(phone, msg, 'LEASE_PAYMENT_DUE');
      }
      this.sendSuccess(req, res, { sent: !!phone }, 'Reminder processed');
    } catch (error) {
      this.handleError(error as any, req, res);
    }
  }

  /** GET /payments/range?start=YYYY-MM-DD&end=YYYY-MM-DD */
  public async getPaymentsInDateRange(req: Request, res: Response): Promise<void> {
    const { start, end } = req.query;
    const startDate = new Date(start as string);
    const endDate   = new Date(end as string);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return this.sendError(
        req,
        res,
        httpStatus.BAD_REQUEST,
        'INVALID_INPUT',
        RESPONSE_MESSAGES.ERROR.INVALID_INPUT
      );
    }
    logger.info('Fetching payments in date range', { start: startDate, end: endDate });
    try {
      const payments = await propertyLeasePaymentService.getPaymentsInDateRange(startDate, endDate);
      this.sendSuccess(req, res, payments, RESPONSE_MESSAGES.SUCCESS.IN_DATE_RANGE);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /** GET /payments/type/:typeCode */
  public async getPaymentsByType(req: Request, res: Response): Promise<void> {
    const { typeCode } = req.params;
    logger.info('Fetching payments by type', { typeCode });
    try {
      const payments = await propertyLeasePaymentService.getPaymentsByType(typeCode);
      this.sendSuccess(req, res, payments, RESPONSE_MESSAGES.SUCCESS.BY_TYPE);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /** GET /payments/property/:propertyId?unitId=… */
  public async getPaymentsByProperty(req: Request, res: Response): Promise<void> {
    const { propertyId } = req.params;
    const unitId = req.query.unitId as string | undefined;
    logger.info('Fetching payments for property', { propertyId, unitId });
    try {
      const payments = await propertyLeasePaymentService.getPaymentsByProperty(propertyId, unitId);
      this.sendSuccess(req, res, payments, RESPONSE_MESSAGES.SUCCESS.BY_PROPERTY);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /** GET /payments/total/:leaseId */
  public async getTotalPaidForLease(req: Request, res: Response): Promise<void> {
    const { leaseId } = req.params;
    logger.info('Calculating total paid for lease', { leaseId });
    try {
      const total = await propertyLeasePaymentService.getTotalPaidForLease(leaseId);
      this.sendSuccess(req, res, { total }, RESPONSE_MESSAGES.SUCCESS.TOTAL_PAID);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }
}

export default new PropertyLeasePaymentController();

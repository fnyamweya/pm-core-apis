import { Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import { PropertyLeasePaymentEntity } from '../../entities/properties/propertyLeasePaymentEntity';
import propertyLeasePaymentService from '../../services/properties/propertyLeasePaymentService';
import ALLOWED_KINDS from '../../constants/allowedKinds';
import { AllowedKind } from '../../constants/allowedKinds';
import BaseController from '../baseController';
import { logger } from '../../utils/logger';

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
    logger.info('Fetching payments for tenant', { tenantId });
    try {
      const payments = await propertyLeasePaymentService.getPaymentsByTenant(tenantId);
      this.sendSuccess(req, res, payments, RESPONSE_MESSAGES.SUCCESS.BY_TENANT);
    } catch (error) {
      this.handleError(error, req, res);
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

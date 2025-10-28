import { Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import BaseController from '../baseController';
import { PropertyLeasePaymentCycleEntity } from '../../entities/properties/propertyLeasePaymentCycleEntity';
import propertyLeasePaymentCycleService from '../../services/properties/propertyLeasePaymentCycleService';
import ALLOWED_KINDS, { AllowedKind } from '../../constants/allowedKinds';
import { logger } from '../../utils/logger';

const RESPONSE_MESSAGES = {
  GENERATED: 'Payment cycles generated successfully',
  DUE_FOR_LEASE: 'Due payment cycles retrieved successfully',
  DUE_FOR_TENANT: 'Tenant due payment cycles retrieved successfully',
};

class PropertyLeasePaymentCycleController extends BaseController<PropertyLeasePaymentCycleEntity> {
  constructor() {
    super(
      propertyLeasePaymentCycleService,
      ALLOWED_KINDS.PROPERTY.LEASE_PAYMENT_CYCLE as AllowedKind
    );
  }

  public async generateForLease(req: Request, res: Response): Promise<void> {
    const { leaseId } = req.params;
    const { asOf, horizon } = (req.body ?? {}) as { asOf?: string | Date; horizon?: number };
    try {
      const items = await propertyLeasePaymentCycleService.ensureCyclesForLease(leaseId, {
        asOf: asOf ? new Date(asOf) : undefined,
        horizon,
      });
      this.sendSuccess(req, res, { items }, RESPONSE_MESSAGES.GENERATED);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  public async listDueForLease(req: Request, res: Response): Promise<void> {
    const { leaseId } = req.params;
    const { asOf } = req.query as { asOf?: string };
    try {
      const items = await propertyLeasePaymentCycleService.listDueCyclesForLease(
        leaseId,
        asOf ? new Date(asOf) : new Date()
      );
      this.sendSuccess(req, res, { items }, RESPONSE_MESSAGES.DUE_FOR_LEASE);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  public async listDueForTenant(req: Request, res: Response): Promise<void> {
    const { tenantId } = req.params;
    const { asOf } = req.query as { asOf?: string };
    const userId = req.user?.sub;
    if (!userId) {
      this.sendError(req, res, httpStatus.UNAUTHORIZED, 'UNAUTHORIZED', 'Not authenticated');
      return;
    }
    try {
      const tenantRepo = (await import('../../repositories/properties/propertyUnitTenantRepository')).default;
      const tenant = await tenantRepo.findOne({ where: { id: tenantId } });
      if (!tenant || (tenant as any)?.user?.id !== userId) {
        this.sendError(req, res, httpStatus.FORBIDDEN, 'FORBIDDEN', 'Not authorized to view these cycles');
        return;
      }
      const items = await propertyLeasePaymentCycleService.listDueCyclesForTenant(
        tenantId,
        asOf ? new Date(asOf) : new Date()
      );
      this.sendSuccess(req, res, { items }, RESPONSE_MESSAGES.DUE_FOR_TENANT);
    } catch (error) {
      logger.error('Failed to list tenant due payment cycles', { error, tenantId });
      this.handleError(error, req, res);
    }
  }
}

export default new PropertyLeasePaymentCycleController();

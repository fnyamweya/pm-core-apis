import { Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import BaseController from '../baseController';
import ALLOWED_KINDS, { AllowedKind } from '../../constants/allowedKinds';
import PropertyLeaseTransactionEntity from '../../entities/properties/propertyLeaseTransactionEntity';
import leaseTransactionService from '../../services/properties/propertyLeaseTransactionService';

class PropertyLeaseTransactionController extends BaseController<PropertyLeaseTransactionEntity> {
  constructor() {
    super(leaseTransactionService, (ALLOWED_KINDS.PROPERTY.LEASE_AGREEMENT as unknown) as AllowedKind);
  }

  public async create(req: Request, res: Response): Promise<void> {
    const { leaseId, propertyId } = req.params as any;
    const orgId = (req.body && req.body.organizationId) || (req as any).organizationId;
    const payload = {
      ...req.body,
      leaseId,
      organizationId: orgId,
    };
    const tx = await leaseTransactionService.createLeaseTransaction(payload);
    this.sendCreated(req, res, tx, 'Lease transaction created');
  }

  public async listByLease(req: Request, res: Response): Promise<void> {
    const { leaseId } = req.params as any;
    const rows = await leaseTransactionService.getByLease(leaseId);
    this.sendSuccess(req, res, rows, 'Lease transactions retrieved');
  }

  public async listByTenant(req: Request, res: Response): Promise<void> {
    const { tenantId } = req.params as any;
    const rows = await leaseTransactionService.getByTenant(tenantId);
    this.sendSuccess(req, res, rows, 'Tenant transactions retrieved');
  }
}

export default new PropertyLeaseTransactionController();


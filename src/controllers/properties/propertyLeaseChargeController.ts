import { Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import PropertyLeaseChargeService from '../../services/properties/propertyLeaseChargeService';
import BaseController from '../baseController';
import ALLOWED_KINDS, { AllowedKind } from '../../constants/allowedKinds';

class PropertyLeaseChargeController extends BaseController<any> {
  constructor() {
    super(PropertyLeaseChargeService as any, ALLOWED_KINDS.PROPERTY.LEASE_AGREEMENT as AllowedKind);
  }

  public async create(req: Request, res: Response): Promise<void> {
    const { leaseId } = req.params as any;
    const data = { ...req.body, leaseId };
    const charge = await PropertyLeaseChargeService.createCharge(data);
    this.sendCreated(req, res, charge, 'Lease charge created');
  }

  public async list(req: Request, res: Response): Promise<void> {
    const { leaseId } = req.params as any;
    const charges = await PropertyLeaseChargeService.getChargesByLease(leaseId);
    this.sendSuccess(req, res, charges, 'Lease charges retrieved');
  }

  public async update(req: Request, res: Response): Promise<void> {
    const { chargeId } = req.params as any;
    const updated = await PropertyLeaseChargeService.updateCharge(chargeId, req.body);
    this.sendSuccess(req, res, updated, 'Lease charge updated');
  }

  public async remove(req: Request, res: Response): Promise<void> {
    const { chargeId } = req.params as any;
    await (PropertyLeaseChargeService as any).delete(chargeId);
    res.status(httpStatus.NO_CONTENT).send();
  }

  public async notifyDue(req: Request, res: Response): Promise<void> {
    const count = await (PropertyLeaseChargeService as any).notifyDueCharges(new Date());
    this.sendSuccess(req, res, { notified: count }, 'Lease charge due notifications sent');
  }

  public async getDueByTenant(req: Request, res: Response): Promise<void> {
    const { tenantId } = req.params as any;
    const { from, to, asOf, leaseId, chargeType } = req.query as any;
    const result = await (PropertyLeaseChargeService as any).getDueByTenant(tenantId, {
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      asOf: asOf ? new Date(asOf) : undefined,
      leaseId,
      chargeType,
    });
    this.sendSuccess(req, res, result, 'Tenant due charges computed');
  }
}

export default new PropertyLeaseChargeController();

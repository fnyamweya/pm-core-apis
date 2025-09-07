import { Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import { PropertyLeaseAgreement } from '../../entities/properties/propertyLeaseAgreementEntity';
import propertyLeaseAgreementService from '../../services/properties/propertyLeaseAgreementService';
import ALLOWED_KINDS, { AllowedKind } from '../../constants/allowedKinds';
import BaseController from '../baseController';
import { logger } from '../../utils/logger';

const RESPONSE_MESSAGES = {
  SUCCESS: {
    CREATE:             'Lease agreement created successfully',
    UPDATE:             'Lease agreement updated successfully',
    RETRIEVE:           'Lease agreement retrieved successfully',
    DELETE:             'Lease agreement deleted successfully',
    TENANT_LIST:        'Leases for tenant retrieved successfully',
    LANDLORD_LIST:      'Leases for landlord retrieved successfully',
    DETAILS:            'Lease details retrieved successfully',
    ESIGN_REMINDERS:    'Leases needing e-signature reminders retrieved successfully',
    MISSING_PAYMENTS:   'Leases with missing payments retrieved successfully',
    UPCOMING_RENEWALS:  'Upcoming lease renewals retrieved successfully',
  },
  ERROR: {
    LEASE_NOT_FOUND:    'Lease agreement not found.',
    INVALID_INPUT:      'Invalid input.',
  },
};

/**
 * PropertyLeaseAgreementController handles all lease-agreement–related HTTP requests.
 */
class PropertyLeaseAgreementController extends BaseController<PropertyLeaseAgreement> {
  constructor() {
    super(
      propertyLeaseAgreementService,
        ALLOWED_KINDS.PROPERTY.LEASE_AGREEMENT as AllowedKind
    );
  }

  /** Create a new lease agreement */
  public async createLeaseAgreement(req: Request, res: Response): Promise<void> {
    const { unitId, propertyId } = req.params as { unitId?: string; propertyId?: string };
    logger.info('Creating lease agreement', { body: req.body, unitId });
    try {
      const payload: any = {
        ...req.body,
        unitId: unitId ?? req.body.unitId,
        propertyId,
      };
      const lease = await propertyLeaseAgreementService.createLeaseAgreement(payload);
      const nextDueDate = propertyLeaseAgreementService.computeNextDueDate(lease);
      this.sendCreated(
        req,
        res,
        { ...lease, nextDueDate },
        RESPONSE_MESSAGES.SUCCESS.CREATE
      );
    } catch (error: any) {
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.INVALID_INPUT);
    }
  }

  /** Update an existing lease agreement */
  public async updateLeaseAgreement(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    logger.info('Updating lease agreement', { leaseId: id, body: req.body });
    try {
      const updated = await propertyLeaseAgreementService.updateLeaseAgreement(id, req.body);
      const nextDueDate = updated ? propertyLeaseAgreementService.computeNextDueDate(updated) : null;
      this.sendOrNotFound(
        updated && { ...updated, nextDueDate },
        req,
        res,
        RESPONSE_MESSAGES.SUCCESS.UPDATE,
        RESPONSE_MESSAGES.ERROR.LEASE_NOT_FOUND
      );
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /** Retrieve a lease agreement by ID */
  public async getLeaseById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    logger.info('Fetching lease agreement by ID', { leaseId: id });
    try {
      const lease = await propertyLeaseAgreementService.getById(id);
      const nextDueDate = lease ? propertyLeaseAgreementService.computeNextDueDate(lease) : null;
      this.sendOrNotFound(
        lease && { ...lease, nextDueDate },
        req,
        res,
        RESPONSE_MESSAGES.SUCCESS.RETRIEVE,
        RESPONSE_MESSAGES.ERROR.LEASE_NOT_FOUND
      );
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /** Delete a lease agreement */
  public async deleteLeaseAgreement(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    logger.info('Deleting lease agreement', { leaseId: id });
    try {
      await propertyLeaseAgreementService.deleteLeaseAgreement(id);
      res.status(httpStatus.NO_CONTENT).send();
    } catch (error) {
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.LEASE_NOT_FOUND);
    }
  }

  /** Get all leases for a given tenant */
  public async getLeasesByTenant(req: Request, res: Response): Promise<void> {
    const { tenantId } = req.params;
    logger.info('Fetching leases for tenant', { tenantId });
    try {
      const leases = await propertyLeaseAgreementService.getByTenant(tenantId);
      const withComputed = (leases || []).map((l) => ({ ...l, nextDueDate: propertyLeaseAgreementService.computeNextDueDate(l) }));
      this.sendSuccess(req, res, withComputed, RESPONSE_MESSAGES.SUCCESS.TENANT_LIST);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /** Get all leases for a given unit */
  public async getLeasesByUnit(req: Request, res: Response): Promise<void> {
    const { unitId } = req.params;
    logger.info('Fetching leases for unit', { unitId });
    try {
      const leases = await propertyLeaseAgreementService.getByUnit(unitId);
      const withComputed = (leases || []).map((l) => ({ ...l, nextDueDate: propertyLeaseAgreementService.computeNextDueDate(l) }));
      this.sendSuccess(req, res, withComputed, RESPONSE_MESSAGES.SUCCESS.RETRIEVE);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /** GET /leases/:id/ledger */
  public async getLeaseLedger(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    logger.info('Fetching lease ledger', { leaseId: id });
    try {
      const ledger = await propertyLeaseAgreementService.getLeaseLedger(id);
      this.sendSuccess(req, res, ledger, 'Lease ledger retrieved successfully');
    } catch (error) {
      this.handleError(error as any, req, res);
    }
  }

  /** GET /properties/:propertyId/leases/rent-roll?month=YYYY-MM */
  public async getPropertyRentRoll(req: Request, res: Response): Promise<void> {
    const { propertyId } = req.params;
    const month = (req.query.month as string) || '';
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return this.sendError(req, res, httpStatus.BAD_REQUEST, 'INVALID_INPUT', 'Invalid month format. Use YYYY-MM');
    }
    try {
      const rows = await propertyLeaseAgreementService.getPropertyRentRoll(propertyId, month);
      this.sendSuccess(req, res, rows, 'Property rent roll retrieved successfully');
    } catch (error) {
      this.handleError(error as any, req, res);
    }
  }

  /** GET /properties/:propertyId/leases/arrears?asOf=YYYY-MM-DD */
  public async getArrearsAging(req: Request, res: Response): Promise<void> {
    const { propertyId } = req.params;
    const asOfStr = req.query.asOf as string;
    const asOf = new Date(asOfStr);
    if (!asOfStr || isNaN(asOf.getTime())) {
      return this.sendError(req, res, httpStatus.BAD_REQUEST, 'INVALID_INPUT', 'Invalid asOf date');
    }
    try {
      const aging = await propertyLeaseAgreementService.getArrearsAging(propertyId, asOf);
      this.sendSuccess(req, res, aging, 'Arrears aging retrieved successfully');
    } catch (error) {
      this.handleError(error as any, req, res);
    }
  }

  // ---------- CSV Exports ----------
  private toCsv(headers: string[], rows: Array<Record<string, any>>): string {
    const esc = (v: any) => {
      if (v === null || v === undefined) return '';
      const s = String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const headerLine = headers.join(',');
    const dataLines = rows.map(r => headers.map(h => esc(r[h])).join(','));
    return [headerLine, ...dataLines].join('\n');
  }

  /** GET /properties/:propertyId/leases/rent-roll.csv */
  public async exportRentRollCsv(req: Request, res: Response): Promise<void> {
    const { propertyId } = req.params;
    const month = (req.query.month as string) || '';
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return this.sendError(req, res, httpStatus.BAD_REQUEST, 'INVALID_INPUT', 'Invalid month format. Use YYYY-MM');
    }
    const rows = await propertyLeaseAgreementService.getPropertyRentRoll(propertyId, month);
    const headers = ['leaseId', 'unitId', 'tenantId', 'due', 'paid', 'balance'];
    const csv = this.toCsv(headers, rows as any);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="rent-roll-${propertyId}-${month}.csv"`);
    res.status(httpStatus.OK).send(csv);
  }

  /** GET /properties/:propertyId/leases/rent-roll-tax.csv */
  public async exportRentRollTaxCsv(req: Request, res: Response): Promise<void> {
    const { propertyId } = req.params;
    const month = (req.query.month as string) || '';
    const multiplier = Number(req.query.multiplier ?? 0.4);
    if (!/^\d{4}-\d{2}$/.test(month) || !(multiplier > 0)) {
      return this.sendError(req, res, httpStatus.BAD_REQUEST, 'INVALID_INPUT', 'Provide month=YYYY-MM and a positive multiplier');
    }
    const rows = await propertyLeaseAgreementService.getPropertyRentRoll(propertyId, month);
    const scaled = rows.map(r => ({
      leaseId: r.leaseId,
      unitId: r.unitId,
      tenantId: r.tenantId,
      due: (r.due * multiplier).toFixed(2),
      paid: (r.paid * multiplier).toFixed(2),
      balance: (r.balance * multiplier).toFixed(2),
    }));
    const headers = ['leaseId', 'unitId', 'tenantId', 'due', 'paid', 'balance'];
    const csv = this.toCsv(headers, scaled as any);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="rent-roll-tax-${propertyId}-${month}-x${multiplier}.csv"`);
    res.status(httpStatus.OK).send(csv);
  }

  /** GET /properties/:propertyId/leases/arrears.csv */
  public async exportArrearsCsv(req: Request, res: Response): Promise<void> {
    const { propertyId } = req.params;
    const asOfStr = req.query.asOf as string;
    const asOf = new Date(asOfStr);
    if (!asOfStr || isNaN(asOf.getTime())) {
      return this.sendError(req, res, httpStatus.BAD_REQUEST, 'INVALID_INPUT', 'Invalid asOf date');
    }
    const data = await propertyLeaseAgreementService.getArrearsAging(propertyId, asOf);
    const rows = data.rows.map(r => ({
      leaseId: r.leaseId,
      unitId: r.unitId,
      tenantId: r.tenantId,
      outstanding: r.outstanding.toFixed(2),
      maxDaysPastDue: r.maxDaysPastDue,
      bucket: r.maxDaysPastDue <= 30 ? '0-30' : r.maxDaysPastDue <= 60 ? '31-60' : r.maxDaysPastDue <= 90 ? '61-90' : '90+',
    }));
    const headers = ['leaseId', 'unitId', 'tenantId', 'outstanding', 'maxDaysPastDue', 'bucket'];
    const csv = this.toCsv(headers, rows as any);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="arrears-${propertyId}-${asOfStr}.csv"`);
    res.status(httpStatus.OK).send(csv);
  }

  /** GET /properties/:propertyId/leases/arrears-tax.csv */
  public async exportArrearsTaxCsv(req: Request, res: Response): Promise<void> {
    const { propertyId } = req.params;
    const asOfStr = req.query.asOf as string;
    const asOf = new Date(asOfStr);
    const multiplier = Number(req.query.multiplier ?? 0.4);
    if (!asOfStr || isNaN(asOf.getTime()) || !(multiplier > 0)) {
      return this.sendError(req, res, httpStatus.BAD_REQUEST, 'INVALID_INPUT', 'Provide asOf=YYYY-MM-DD and a positive multiplier');
    }
    const data = await propertyLeaseAgreementService.getArrearsAging(propertyId, asOf);
    const rows = data.rows.map(r => ({
      leaseId: r.leaseId,
      unitId: r.unitId,
      tenantId: r.tenantId,
      outstanding: (r.outstanding * multiplier).toFixed(2),
      maxDaysPastDue: r.maxDaysPastDue,
      bucket: r.maxDaysPastDue <= 30 ? '0-30' : r.maxDaysPastDue <= 60 ? '31-60' : r.maxDaysPastDue <= 90 ? '61-90' : '90+',
    }));
    const headers = ['leaseId', 'unitId', 'tenantId', 'outstanding', 'maxDaysPastDue', 'bucket'];
    const csv = this.toCsv(headers, rows as any);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="arrears-tax-${propertyId}-${asOfStr}-x${multiplier}.csv"`);
    res.status(httpStatus.OK).send(csv);
  }

  /** Extend a lease */
  public async extendLease(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { newEndDate, amount } = req.body as { newEndDate: string; amount?: number };
    try {
      const lease = await propertyLeaseAgreementService.extendLease(
        id,
        new Date(newEndDate),
        amount
      );
      this.sendSuccess(req, res, lease, RESPONSE_MESSAGES.SUCCESS.UPDATE);
    } catch (error) {
      this.handleError(error as any, req, res);
    }
  }

  /** Terminate a lease */
  public async terminateLease(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { terminationDate, reason } = req.body as { terminationDate: string; reason?: string };
    try {
      const lease = await propertyLeaseAgreementService.terminateLease(
        id,
        new Date(terminationDate),
        reason
      );
      this.sendSuccess(req, res, lease, RESPONSE_MESSAGES.SUCCESS.UPDATE);
    } catch (error) {
      this.handleError(error as any, req, res);
    }
  }

  /** Get all leases for a given landlord */
  public async getLeasesByLandlord(req: Request, res: Response): Promise<void> {
    const { landlordId } = req.params;
    logger.info('Fetching leases for landlord', { landlordId });
    try {
      const leases = await propertyLeaseAgreementService.getByLandlord(landlordId);
      this.sendSuccess(req, res, leases, RESPONSE_MESSAGES.SUCCESS.LANDLORD_LIST);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /** Get a lease with full details and relations */
  public async getLeaseWithDetails(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    logger.info('Fetching lease agreement details', { leaseId: id });
    try {
      const lease = await propertyLeaseAgreementService.getLeaseAgreementWithDetails(id);
      this.sendOrNotFound(
        lease,
        req,
        res,
        RESPONSE_MESSAGES.SUCCESS.DETAILS,
        RESPONSE_MESSAGES.ERROR.LEASE_NOT_FOUND
      );
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /** Find leases that need e-signature reminders */
  public async findEsignatureReminders(req: Request, res: Response): Promise<void> {
    const days = Number(req.query.daysSinceSent) || 1;
    logger.info('Finding leases needing e-signature reminders', { days });
    try {
      const leases = await propertyLeaseAgreementService.findLeasesNeedingEsignatureReminders(days);
      this.sendSuccess(req, res, leases, RESPONSE_MESSAGES.SUCCESS.ESIGN_REMINDERS);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /** Find leases with missing payments */
  public async findMissingPayments(req: Request, res: Response): Promise<void> {
    logger.info('Finding leases with missing payments');
    try {
      const leases = await propertyLeaseAgreementService.findLeasesWithMissingPayments();
      this.sendSuccess(req, res, leases, RESPONSE_MESSAGES.SUCCESS.MISSING_PAYMENTS);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /** Find upcoming lease renewals within a given window (days) */
  public async findUpcomingRenewals(req: Request, res: Response): Promise<void> {
    const windowInDays = Number(req.query.windowInDays);
    if (isNaN(windowInDays)) {
      return this.sendError(
        req,
        res,
        httpStatus.BAD_REQUEST,
        'INVALID_INPUT',
        RESPONSE_MESSAGES.ERROR.INVALID_INPUT
      );
    }
    logger.info('Finding upcoming lease renewals', { windowInDays });
    try {
      const leases = await propertyLeaseAgreementService.findUpcomingLeaseRenewals(windowInDays);
      this.sendSuccess(req, res, leases, RESPONSE_MESSAGES.SUCCESS.UPCOMING_RENEWALS);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }
}

export default new PropertyLeaseAgreementController();

import { PropertyLeaseAgreement, LeaseStatus, LeaseType, LeaseChargeType, PaymentFrequency } from '../../entities/properties/propertyLeaseAgreementEntity';
import propertyLeaseAgreementRepository from '../../repositories/properties/propertyLeaseAgreementRepository';
import { logger } from '../../utils/logger';
import RedisCache from '../../utils/redisCache';
import { BaseService } from '../baseService';
import propertyService from './propertyService';

interface CreateLeaseAgreementDTO {
  unitId: string;
  tenantId: string;
  ownerId?: string; // landlord optional
  organizationId: string;
  startDate: Date;
  endDate: Date;
  amount: number;
  leaseType?: LeaseType;
  chargeType?: LeaseChargeType;
  paymentFrequency?: PaymentFrequency;
  firstPaymentDate?: Date | null;
  status?: LeaseStatus;
  esignatures?: any[];
  signedDocumentUrl?: string;
  contractHash?: string;
  terms?: Record<string, any>;
  metadata?: Record<string, any>;
  propertyId?: string; // for cross-checking organization
}

interface UpdateLeaseAgreementDTO {
  startDate?: Date;
  endDate?: Date;
  amount?: number;
  leaseType?: LeaseType;
  chargeType?: LeaseChargeType;
  paymentFrequency?: PaymentFrequency;
  firstPaymentDate?: Date | null;
  status?: LeaseStatus;
  esignatures?: any[];
  signedDocumentUrl?: string;
  contractHash?: string;
  terms?: Record<string, any>;
  metadata?: Record<string, any>;
}

class PropertyLeaseAgreementService extends BaseService<PropertyLeaseAgreement> {
  private leaseCache: RedisCache<PropertyLeaseAgreement>;

  constructor() {
    super(
      {
        repository: propertyLeaseAgreementRepository,
        redisCache: new RedisCache<PropertyLeaseAgreement>(3600),
        logger,
      },
      'leaseAgreement',
    );
    this.leaseCache = new RedisCache<PropertyLeaseAgreement>(3600);
    this.logger.info('PropertyLeaseAgreementService initialized');
  }

  private generateCacheKey(namespace: string, key: string): string {
    return `${namespace}:${key}`;
  }

  private async cacheLease(lease: PropertyLeaseAgreement): Promise<void> {
    await this.leaseCache.setToCache(
      'leaseAgreement',
      lease.id,
      lease,
    );
    this.logger.info('Lease agreement cached', { leaseId: lease.id });
  }

  // ---------- helpers for schedule derivation ----------
  private toDateOnly(d: Date | string): Date {
    const dt = new Date(d);
    // normalize to 00:00 local to avoid TZ surprises in comparisons
    return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  }

  private addByFrequency(date: Date, freq: PaymentFrequency): Date {
    const d = new Date(date.getTime());
    switch (freq) {
      case PaymentFrequency.WEEKLY:
        d.setDate(d.getDate() + 7);
        break;
      case PaymentFrequency.BIWEEKLY:
        d.setDate(d.getDate() + 14);
        break;
      case PaymentFrequency.MONTHLY: {
        const day = d.getDate();
        d.setMonth(d.getMonth() + 1);
        // anchor to same day when possible; JS auto-rolls
        if (d.getDate() !== day) d.setDate(Math.min(day, 28));
        break;
      }
      case PaymentFrequency.QUARTERLY: {
        const day = d.getDate();
        d.setMonth(d.getMonth() + 3);
        if (d.getDate() !== day) d.setDate(Math.min(day, 28));
        break;
      }
      case PaymentFrequency.YEARLY: {
        const month = d.getMonth();
        const day = d.getDate();
        d.setFullYear(d.getFullYear() + 1, month, day);
        break;
      }
      default:
        break;
    }
    return d;
  }

  private firstDueOnOrAfter(
    start: Date,
    firstPayment: Date,
    freq: PaymentFrequency
  ): Date {
    let due = new Date(firstPayment.getTime());
    while (due < start) {
      due = this.addByFrequency(due, freq);
    }
    return due;
  }

  /**
   * Compute next due date (>= today) based on lease fields.
   * Returns null if there is no next due within the term window.
   */
  public computeNextDueDate(lease: PropertyLeaseAgreement): Date | null {
    try {
      const start = this.toDateOnly(lease.startDate);
      const end = this.toDateOnly(lease.endDate);
      const freq = (lease.paymentFrequency || PaymentFrequency.MONTHLY) as PaymentFrequency;
      const first = this.toDateOnly((lease as any).firstPaymentDate || lease.startDate);
      const today = this.toDateOnly(new Date());

      // if today is before start, next due is first due on/after start
      let next = this.firstDueOnOrAfter(start, first, freq);
      while (next < today) {
        const n = this.addByFrequency(next, freq);
        if (n <= next) break; // guard
        next = n;
        if (next > end) return null;
      }
      if (next > end) return null;
      return next;
    } catch (e) {
      return null;
    }
  }

  // ---------- Reporting helpers ----------
  public buildBillingSchedule(lease: PropertyLeaseAgreement): Array<{
    dueDate: Date;
    amountDue: number;
  }> {
    const start = this.toDateOnly(lease.startDate);
    const end = this.toDateOnly(lease.endDate);
    const freq = (lease.paymentFrequency || PaymentFrequency.MONTHLY) as PaymentFrequency;
    const first = this.toDateOnly((lease as any).firstPaymentDate || lease.startDate);
    const periods: Array<{ dueDate: Date; amountDue: number }> = [];

    // start from first due on or after start
    let due = this.firstDueOnOrAfter(start, first, freq);
    while (due <= end) {
      periods.push({ dueDate: new Date(due), amountDue: Number(lease.amount) });
      due = this.addByFrequency(due, freq);
      if (periods.length > 1000) break; // safety guard
    }
    return periods;
  }

  public async getLeaseLedger(leaseId: string): Promise<{
    lease: PropertyLeaseAgreement;
    periods: Array<{ dueDate: Date; amountDue: number; amountPaid: number; balance: number; payments: Array<{ id: string; amount: number; paidAt: Date }>; }>
    totals: { totalDue: number; totalPaid: number; outstanding: number };
  }> {
    const lease = await this.getById(leaseId);
    const schedule = this.buildBillingSchedule(lease);

    // Fetch payments for this lease
    const payments = await (await import('../../repositories/properties/propertyLeasePaymentRepository')).default.getPaymentsByLease(leaseId);
    const payQueue = payments
      .map(p => ({ id: p.id, amount: Number(p.amount), paidAt: new Date(p.paidAt) }))
      .sort((a, b) => a.paidAt.getTime() - b.paidAt.getTime());

    const periods = schedule.map(s => ({
      dueDate: s.dueDate,
      amountDue: s.amountDue,
      amountPaid: 0,
      balance: s.amountDue,
      payments: [] as Array<{ id: string; amount: number; paidAt: Date }>,
    }));

    // Allocate payments FIFO
    for (const p of payQueue) {
      let remaining = p.amount;
      for (const period of periods) {
        if (remaining <= 0) break;
        if (period.balance <= 0) continue;
        const applied = Math.min(period.balance, remaining);
        period.amountPaid += applied;
        period.balance -= applied;
        remaining -= applied;
        period.payments.push({ id: p.id, amount: applied, paidAt: p.paidAt });
      }
    }

    const totalDue = periods.reduce((sum, p) => sum + p.amountDue, 0);
    const totalPaid = periods.reduce((sum, p) => sum + p.amountPaid, 0);
    const outstanding = Math.max(0, totalDue - totalPaid);

    return { lease, periods, totals: { totalDue, totalPaid, outstanding } };
  }

  public async getPropertyRentRoll(propertyId: string, month: string): Promise<Array<{
    leaseId: string;
    unitId: string;
    tenantId: string;
    due: number;
    paid: number;
    balance: number;
  }>> {
    const [year, mon] = month.split('-').map((v) => Number(v));
    if (!year || !mon) throw new Error('Invalid month format. Expected YYYY-MM');
    const monthStart = new Date(year, mon - 1, 1);
    const monthEnd = new Date(year, mon, 0); // last day of month

    // Find leases whose term intersects the month
    const leases = await this.repository.find({
      where: {
        unit: { property: { id: propertyId } } as any,
      } as any,
      relations: { unit: true, tenant: true },
    });

    const out: Array<{ leaseId: string; unitId: string; tenantId: string; due: number; paid: number; balance: number }> = [];
    for (const lease of leases) {
      const schedule = this.buildBillingSchedule(lease);
      const monthPeriods = schedule.filter(p => p.dueDate >= monthStart && p.dueDate <= monthEnd);
      if (!monthPeriods.length) continue; // no due this month
      const due = monthPeriods.reduce((s, p) => s + p.amountDue, 0);

      // Sum payments in month
      const pays = await (await import('../../repositories/properties/propertyLeasePaymentRepository')).default.getPaymentsByLease(lease.id);
      const paid = pays
        .filter(p => {
          const d = new Date(p.paidAt);
          return d >= monthStart && d <= monthEnd;
        })
        .reduce((s, p) => s + Number(p.amount), 0);
      out.push({ leaseId: lease.id, unitId: (lease.unit as any).id, tenantId: (lease.tenant as any).id, due, paid, balance: Math.max(0, due - paid) });
    }
    return out;
  }

  public async getArrearsAging(propertyId: string, asOf: Date): Promise<{ summary: Record<string, number>; rows: Array<{ leaseId: string; tenantId: string; unitId: string; outstanding: number; maxDaysPastDue: number }> }> {
    const leases = await this.repository.find({
      where: { unit: { property: { id: propertyId } } } as any,
      relations: { unit: true, tenant: true },
    });

    const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 } as Record<string, number>;
    const rows: Array<{ leaseId: string; tenantId: string; unitId: string; outstanding: number; maxDaysPastDue: number }> = [];

    for (const lease of leases) {
      const schedule = this.buildBillingSchedule(lease);
      const periods = schedule.filter(p => p.dueDate <= asOf);
      if (!periods.length) continue;

      const pays = await (await import('../../repositories/properties/propertyLeasePaymentRepository')).default.getPaymentsByLease(lease.id);
      const paidUntil = pays
        .filter(p => new Date(p.paidAt) <= asOf)
        .reduce((s, p) => s + Number(p.amount), 0);
      const dueUntil = periods.reduce((s, p) => s + p.amountDue, 0);
      const outstanding = Math.max(0, dueUntil - paidUntil);
      if (outstanding <= 0) continue;

      // Determine most overdue period with unpaid amount
      let remaining = outstanding;
      let maxPastDays = 0;
      for (const p of periods) {
        if (remaining <= 0) break;
        remaining -= p.amountDue;
        const days = Math.floor((asOf.getTime() - p.dueDate.getTime()) / (1000 * 60 * 60 * 24));
        maxPastDays = Math.max(maxPastDays, days);
      }

      const bucket = maxPastDays <= 30 ? '0-30' : maxPastDays <= 60 ? '31-60' : maxPastDays <= 90 ? '61-90' : '90+';
      buckets[bucket] += outstanding;
      rows.push({ leaseId: lease.id, tenantId: (lease.tenant as any).id, unitId: (lease.unit as any).id, outstanding, maxDaysPastDue: maxPastDays });
    }
    return { summary: buckets, rows };
  }

  private async invalidateLeaseCache(leaseId: string): Promise<void> {
    await this.leaseCache.deleteKey('leaseAgreement', leaseId);
    this.logger.info('Lease cache invalidated', { leaseId });
  }

  async createLeaseAgreement(
    data: CreateLeaseAgreementDTO
  ): Promise<PropertyLeaseAgreement> {
    this.logger.info('Creating a new lease agreement', { data });

    // Basic input validation and sensible defaults
    if (!data.unitId || !data.tenantId || !data.organizationId) {
      throw new Error('unitId, tenantId and organizationId are required');
    }
    if (!data.startDate || !data.endDate) {
      throw new Error('startDate and endDate are required');
    }
    if (!(data.amount > 0)) {
      throw new Error('amount must be a positive number');
    }

    const start = this.toDateOnly(data.startDate);
    const end = this.toDateOnly(data.endDate);
    if (!(end > start)) {
      throw new Error('endDate must be after startDate');
    }

    const leaseType = data.leaseType ?? LeaseType.FIXED_TERM;
    const chargeType = data.chargeType ?? LeaseChargeType.RENT;
    const paymentFrequency = data.paymentFrequency ?? PaymentFrequency.MONTHLY;
    const firstPaymentDate = this.toDateOnly(
      data.firstPaymentDate ?? data.startDate
    );

    // Derive billing schedule metadata for client dashboards/automation
    const nextDueDate = this.firstDueOnOrAfter(
      start,
      firstPaymentDate,
      paymentFrequency
    );
    const billingCycleDay = paymentFrequency === PaymentFrequency.MONTHLY ||
      paymentFrequency === PaymentFrequency.QUARTERLY ||
      paymentFrequency === PaymentFrequency.YEARLY
      ? firstPaymentDate.getDate()
      : undefined;

    // Estimated number of periods in the lease (for fixed-term projections)
    let estimatedPeriods: number | undefined;
    try {
      const tmpStart = new Date(firstPaymentDate.getTime());
      let count = 0;
      while (tmpStart <= end && count < 10_000) {
        count += 1;
        const n = this.addByFrequency(tmpStart, paymentFrequency);
        if (n <= tmpStart) break; // guard
        tmpStart.setTime(n.getTime());
      }
      estimatedPeriods = count;
    } catch (_) {
      // ignore if estimation fails
    }

    const mergedTerms = {
      ...(data.terms || {}),
      billing: {
        leaseType,
        chargeType,
        paymentFrequency,
        firstPaymentDate,
        nextDueDate,
        billingCycleDay,
        estimatedPeriods,
      },
    } as Record<string, any>;

    // determine organization from request; if propertyId present, cross-check
    let organizationId = data.organizationId;
    const propertyId = (data as any).propertyId;
    if (propertyId) {
      try {
        const prop = await propertyService.getById(propertyId);
        const derived = (prop as any)?.organization?.id;
        if (derived && derived !== organizationId) {
          throw new Error('organizationId does not match the property organization');
        }
        organizationId = derived || organizationId;
      } catch (_) {}
    }

    const lease = await this.repository.create({
      unit: { id: data.unitId } as any,
      tenant: { id: data.tenantId } as any,
      landlord: data.ownerId ? ({ id: data.ownerId } as any) : undefined,
      organization: { id: organizationId } as any,
      startDate: start as any,
      endDate: end as any,
      amount: data.amount,
      leaseType,
      chargeType,
      paymentFrequency,
      firstPaymentDate,
      status: data.status,
      esignatures: data.esignatures,
      signedDocumentUrl: data.signedDocumentUrl,
      contractHash: data.contractHash,
      terms: mergedTerms,
      metadata: data.metadata,
    });

    await this.cacheLease(lease);
    return lease;
  }

  async updateLeaseAgreement(
    leaseId: string,
    data: UpdateLeaseAgreementDTO
  ): Promise<PropertyLeaseAgreement> {
    this.logger.info('Updating lease agreement', { leaseId, data });

    await this.repository.update(leaseId, data as any);

    const updated = await this.getById(leaseId);
    await this.invalidateLeaseCache(leaseId);
    await this.cacheLease(updated);

    return updated;
  }

  async getByTenant(tenantId: string): Promise<PropertyLeaseAgreement[]> {
    this.logger.info('Fetching leases by tenant', { tenantId });
    const cacheKey = this.generateCacheKey('leaseAgreementTenant', tenantId);

    let leases = (await this.leaseCache.getFromCache(
      'leaseAgreementTenant',
      cacheKey
    )) as PropertyLeaseAgreement[] | null;

    if (!leases) {
      leases = await propertyLeaseAgreementRepository.getActiveLeasesByTenant(tenantId);
      await this.leaseCache.setToCache('leaseAgreementTenant', cacheKey, leases);
      this.logger.info('Tenant leases cached', { tenantId });
    }

    return leases;
  }

  async getByLandlord(landlordId: string): Promise<PropertyLeaseAgreement[]> {
    this.logger.info('Fetching leases by landlord', { landlordId });
    const cacheKey = this.generateCacheKey('leaseAgreementLandlord', landlordId);

    let leases = (await this.leaseCache.getFromCache(
      'leaseAgreementLandlord',
      cacheKey
    )) as PropertyLeaseAgreement[] | null;

    if (!leases) {
      leases = await propertyLeaseAgreementRepository.getPendingOrSignedLeasesForLandlord(landlordId);
      await this.leaseCache.setToCache('leaseAgreementLandlord', cacheKey, leases);
      this.logger.info('Landlord leases cached', { landlordId });
    }

    return leases;
  }

  /**
   * List leases for a specific unit.
   */
  async getByUnit(unitId: string): Promise<PropertyLeaseAgreement[]> {
    this.logger.info('Fetching leases by unit', { unitId });
    return propertyLeaseAgreementRepository.getLeasesByUnit(unitId);
  }

  /**
   * Returns the lease with all relations, or null if not found.
   */
  async getLeaseAgreementWithDetails(
    leaseId: string
  ): Promise<PropertyLeaseAgreement | null> {
    this.logger.info('Fetching lease details', { leaseId });
    const cacheKey = this.generateCacheKey('leaseAgreement', `details:${leaseId}`);

    let lease = (await this.leaseCache.getFromCache(
      'leaseAgreement',
      cacheKey
    )) as PropertyLeaseAgreement | null;

    if (!lease) {
      lease = await propertyLeaseAgreementRepository.getLeaseWithDetails(leaseId);
      if (lease) {
        await this.leaseCache.setToCache('leaseAgreement', cacheKey, lease);
        this.logger.info('Lease details cached', { leaseId });
      } else {
        this.logger.info('Lease details not found', { leaseId });
      }
    }

    return lease;
  }

  async deleteLeaseAgreement(leaseId: string): Promise<void> {
    this.logger.info('Deleting lease agreement', { leaseId });
    await this.repository.delete(leaseId);
    await this.invalidateLeaseCache(leaseId);
  }

  async findLeasesNeedingEsignatureReminders(
    daysSinceSent = 1
  ): Promise<PropertyLeaseAgreement[]> {
    this.logger.info('Finding leases needing e-sign reminders', { daysSinceSent });
    return propertyLeaseAgreementRepository.findLeasesNeedingEsignatureReminders(daysSinceSent);
  }

  async findLeasesWithMissingPayments(): Promise<PropertyLeaseAgreement[]> {
    this.logger.info('Finding leases with missing payments');
    return propertyLeaseAgreementRepository.findLeasesWithMissingPayments();
  }

  async findUpcomingLeaseRenewals(
    windowInDays: number
  ): Promise<PropertyLeaseAgreement[]> {
    this.logger.info('Finding upcoming lease renewals', { windowInDays });
    return propertyLeaseAgreementRepository.findUpcomingLeaseRenewals(windowInDays);
  }

  /**
   * Extend a lease by updating its end date (and optionally amount).
   * Enforces newEndDate to be after current endDate.
   */
  async extendLease(
    leaseId: string,
    newEndDate: Date,
    amount?: number
  ): Promise<PropertyLeaseAgreement> {
    const lease = await this.getById(leaseId);
    const currentEnd = new Date(lease.endDate);
    const nextEnd = new Date(newEndDate);
    if (!(nextEnd > currentEnd)) {
      throw new Error('New end date must be after current end date');
    }
    await this.repository.update(leaseId, {
      endDate: nextEnd as any,
      ...(typeof amount === 'number' ? { amount } : {}),
    } as any);
    return this.getById(leaseId);
  }

  /**
   * Terminate a lease early. Sets status to TERMINATED and snaps endDate to terminationDate if sooner.
   */
  async terminateLease(
    leaseId: string,
    terminationDate: Date,
    reason?: string
  ): Promise<PropertyLeaseAgreement> {
    const lease = await this.getById(leaseId);
    const termDate = new Date(terminationDate);
    const newEnd = termDate < new Date(lease.endDate) ? termDate : new Date(lease.endDate);
    const mergedTerms = { ...(lease.terms || {}), termination: { reason, at: termDate.toISOString() } };
    await this.repository.update(leaseId, {
      status: 'terminated' as any,
      endDate: newEnd as any,
      terms: mergedTerms as any,
    } as any);
    return this.getById(leaseId);
  }
}

export default new PropertyLeaseAgreementService();

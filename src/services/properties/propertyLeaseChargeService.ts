import { BaseService } from '../baseService';
import propertyLeaseChargeRepository from '../../repositories/properties/propertyLeaseChargeRepository';
import { logger } from '../../utils/logger';
import RedisCache from '../../utils/redisCache';
import PropertyLeaseCharge, { LeaseChargeFrequency } from '../../entities/properties/propertyLeaseChargeEntity';
import smsService from '../sms/smsService';

interface CreateLeaseChargeDTO {
  leaseId: string;
  chargeType: string;
  label?: string;
  amount: number;
  frequency: LeaseChargeFrequency;
  isActive?: boolean;
}

interface UpdateLeaseChargeDTO extends Partial<CreateLeaseChargeDTO> {}

class PropertyLeaseChargeService extends BaseService<PropertyLeaseCharge> {
  constructor() {
    super(
      {
        repository: propertyLeaseChargeRepository,
        redisCache: new RedisCache<PropertyLeaseCharge>(600),
        logger,
      },
      'leaseCharge'
    );
  }

  async createCharge(data: CreateLeaseChargeDTO): Promise<PropertyLeaseCharge> {
    if (!(data.amount > 0)) throw new Error('amount must be positive');
    const payload: any = {
      lease: { id: data.leaseId },
      chargeType: data.chargeType,
      label: data.label,
      amount: Number(data.amount),
      frequency: data.frequency,
      isActive: data.isActive !== false,
    };
    return this.repository.create(payload);
  }

  async updateCharge(id: string, data: UpdateLeaseChargeDTO): Promise<PropertyLeaseCharge> {
    await this.repository.update(id, {
      ...(data.leaseId ? { lease: { id: data.leaseId } as any } : {}),
      ...(data.chargeType ? { chargeType: data.chargeType } : {}),
      ...(data.label !== undefined ? { label: data.label } : {}),
      ...(data.amount !== undefined ? { amount: Number(data.amount) } : {}),
      ...(data.frequency ? { frequency: data.frequency } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    } as any);
    return this.getById(id);
  }

  async getChargesByLease(leaseId: string): Promise<PropertyLeaseCharge[]> {
    return propertyLeaseChargeRepository.getByLease(leaseId);
  }

  // ---------- Due detection and notifications ----------
  private dateOnly(d: Date): Date {
    const x = new Date(d);
    return new Date(x.getFullYear(), x.getMonth(), x.getDate());
  }

  private* iterateOccurrences(charge: PropertyLeaseCharge, windowStart: Date, windowEnd: Date): Generator<Date> {
    const { frequency } = charge;
    // Use lease dates as the authoritative window
    const lease: any = charge.lease as any;
    const start = this.dateOnly(lease?.startDate || windowStart);
    const end = this.dateOnly(lease?.endDate || windowEnd);
    let cur = this.dateOnly(start);

    const step = (d: Date): Date => {
      const c = new Date(d);
      switch (frequency) {
        case LeaseChargeFrequency.DAILY:    c.setDate(c.getDate() + 1); break;
        case LeaseChargeFrequency.WEEKLY:   c.setDate(c.getDate() + 7); break;
        case LeaseChargeFrequency.BIWEEKLY: c.setDate(c.getDate() + 14); break;
        case LeaseChargeFrequency.QUARTERLY: c.setMonth(c.getMonth() + 3); break;
        case LeaseChargeFrequency.MONTHLY:  c.setMonth(c.getMonth() + 1); break;
        case LeaseChargeFrequency.BIYEARLY: c.setMonth(c.getMonth() + 6); break;
        case LeaseChargeFrequency.YEARLY:   c.setFullYear(c.getFullYear() + 1); break;
        case LeaseChargeFrequency.ONE_OFF:
        default: return new Date(8640000000000000); // far future to stop
      }
      return c;
    };

    if (frequency === LeaseChargeFrequency.ONE_OFF) {
      // One-off charges are due on lease start
      const due = this.dateOnly(start);
      if (due >= windowStart && due <= windowEnd) yield due;
      return;
    }

    while (cur < windowStart) cur = step(cur);
    while (cur <= end && cur <= windowEnd) {
      yield this.dateOnly(cur);
      const n = step(cur);
      if (n <= cur) break;
      cur = n;
    }
  }

  async notifyDueCharges(asOf: Date = new Date()): Promise<number> {
    const today = this.dateOnly(asOf);
    // Fetch potentially relevant charges (active only)
    const charges = await this.repository.find({ where: { isActive: true } as any, relations: { lease: true } });
    let sent = 0;
    for (const ch of charges) {
      const lease: any = ch.lease as any;
      const windowStart = this.dateOnly(lease?.startDate || today);
      const windowEnd = this.dateOnly(lease?.endDate || today);
      for (const due of this.iterateOccurrences(ch, windowStart, windowEnd)) {
        if (due.getTime() !== today.getTime()) continue;
        // send SMS to tenant on lease
        const tenant: any = (ch.lease as any)?.tenant;
        const user: any = tenant?.user;
        const phone: string | undefined = user?.phone;
        if (!phone) break;
        const label = ch.label || ch.chargeType;
        const text = `Reminder: ${label} of ${Number(ch.amount).toFixed(2)} is due today for your lease.`;
        try {
          await smsService.sendSms(phone, text, 'LEASE_CHARGE_DUE', { trackDelivery: true });
          sent += 1;
          await this.repository.update(ch.id, { lastNotifiedAt: new Date() } as any);
        } catch (err) {
          logger.warn('Failed to send lease charge due SMS', { chargeId: ch.id, err });
        }
      }
    }
    return sent;
  }

  // ---------- Tenant due computation ----------
  public async getDueByTenant(tenantId: string, opts?: {
    from?: Date | string;
    to?: Date | string;
    asOf?: Date | string; // alias for to
    leaseId?: string;
    chargeType?: string;
  }): Promise<{
    occurrences: Array<{
      leaseId: string;
      unitId?: string;
      chargeId: string;
      chargeType: string;
      label?: string | null;
      frequency: LeaseChargeFrequency;
      dueDate: Date;
      amount: number;
      paid: number;
      balance: number;
    }>;
    totals: { totalDue: number; totalPaid: number; outstanding: number };
  }> {
    const toDateOnly = (x: Date | string | undefined): Date | undefined => x ? this.dateOnly(new Date(x)) : undefined;
    const filterFrom = toDateOnly(opts?.from);
    const filterTo = toDateOnly(opts?.to || opts?.asOf) || this.dateOnly(new Date());

    // Load active leases for the tenant
    const leaseRepo = (await import('../../repositories/properties/propertyLeaseAgreementRepository')).default;
    let leases = await leaseRepo.getActiveLeasesByTenant(tenantId);
    if (opts?.leaseId) leases = leases.filter(l => (l as any).id === opts.leaseId);

    // Accumulate all occurrences and payments across leases
    type Occ = {
      key: string; // leaseId|chargeId|yyyy-mm-dd
      leaseId: string;
      unitId?: string;
      chargeId: string;
      chargeType: string;
      label?: string | null;
      frequency: LeaseChargeFrequency;
      dueDate: Date;
      amount: number;
      paid: number;
    };
    const occurrences: Map<string, Occ> = new Map();

    const chargeTxRepository = (await import('../../repositories/properties/propertyLeaseChargeTransactionRepository')).default;
    const leaseTxRepository = (await import('../../repositories/properties/propertyLeaseTransactionRepository')).default;

    // Preload charges and payments per lease
    for (const lease of leases) {
      const leaseId = (lease as any).id as string;
      const unitId = (lease as any)?.unit?.id as string | undefined;
      const charges = await propertyLeaseChargeRepository.getByLease(leaseId);
      const leaseStart = this.dateOnly(new Date((lease as any).startDate));
      const leaseEnd = this.dateOnly(new Date((lease as any).endDate));
      const windowStart = this.dateOnly(new Date(Math.max(leaseStart.getTime(), (filterFrom ?? leaseStart).getTime())));
      const windowEnd = this.dateOnly(new Date(Math.min(leaseEnd.getTime(), filterTo.getTime())));
      if (!(windowEnd >= windowStart)) continue;

      for (const ch of charges) {
        if (!ch.isActive) continue;
        if (opts?.chargeType && ch.chargeType !== opts.chargeType) continue;
        // Ensure lease relation present for iterateOccurrences
        (ch as any).lease = lease as any;
        for (const due of this.iterateOccurrences(ch, windowStart, windowEnd)) {
          const key = `${leaseId}|${ch.id}|${due.toISOString().slice(0,10)}`;
          occurrences.set(key, {
            key,
            leaseId,
            unitId,
            chargeId: ch.id,
            chargeType: ch.chargeType,
            label: ch.label,
            frequency: ch.frequency,
            dueDate: due,
            amount: Number(ch.amount),
            paid: 0,
          });
        }
      }

      // Allocate from new charge-level transactions (exact)
      const chargeTxs = await chargeTxRepository.getByLease(leaseId);
      for (const ct of chargeTxs) {
        const chargeId = (ct as any).charge?.id as string;
        const dateKey = this.dateOnly(new Date((ct as any).appliesToDate || windowStart)).toISOString().slice(0,10);
        const key = `${leaseId}|${chargeId}|${dateKey}`;
        const occ = occurrences.get(key);
        if (occ) {
          const amt = Number((ct as any).amount);
          const remaining = Math.max(0, occ.amount - occ.paid);
          const apply = Math.min(remaining, amt);
          occ.paid += apply;
        }
      }

      // Helper to allocate across a set of occurrences (FIFO)
      const alloc = (amount: number, filter?: (o: Occ) => boolean) => {
        let remaining = amount;
        const list = Array.from(occurrences.values())
          .filter(o => o.leaseId === leaseId)
          .filter(o => !filter || filter(o))
          .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
        for (const occ of list) {
          if (remaining <= 0) break;
          const gap = Math.max(0, occ.amount - occ.paid);
          if (gap <= 0) continue;
          const apply = Math.min(gap, remaining);
          occ.paid += apply;
          remaining -= apply;
        }
        return remaining;
      };

      // Allocate remaining from lease-level transactions (amount minus any explicit charge allocations)
      const leaseTxs = await leaseTxRepository.getByLease(leaseId);
      for (const lt of leaseTxs) {
        const txnAmount = Number((lt as any).transaction?.amount || 0);
        if (!(txnAmount > 0)) continue;
        // Sum allocations belonging to this lease transaction
        const ctForLt = chargeTxs.filter((ct: any) => (ct as any).leaseTransaction?.id === (lt as any).id);
        const allocated = ctForLt.reduce((s: number, ct: any) => s + Number(ct.amount || 0), 0);
        const remainder = Math.max(0, txnAmount - allocated);
        if (remainder > 0) alloc(remainder);
      }
    }

    const rows = Array.from(occurrences.values()).map(o => ({
      leaseId: o.leaseId,
      unitId: o.unitId,
      chargeId: o.chargeId,
      chargeType: o.chargeType,
      label: o.label ?? undefined,
      frequency: o.frequency,
      dueDate: o.dueDate,
      amount: o.amount,
      paid: o.paid,
      balance: Math.max(0, o.amount - o.paid),
    }));

    // Only return outstanding occurrences within filters
    const outstandingRows = rows.filter(r => r.balance > 0);
    const totalDue = rows.reduce((s, r) => s + r.amount, 0);
    const totalPaid = rows.reduce((s, r) => s + Math.min(r.paid, r.amount), 0);
    const outstanding = outstandingRows.reduce((s, r) => s + r.balance, 0);

    return { occurrences: outstandingRows, totals: { totalDue, totalPaid, outstanding } };
  }
}

export default new PropertyLeaseChargeService();

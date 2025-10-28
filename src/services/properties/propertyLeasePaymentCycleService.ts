import { BaseService } from '../baseService';
import propertyLeasePaymentCycleRepository from '../../repositories/properties/propertyLeasePaymentCycleRepository';
import { logger } from '../../utils/logger';
import RedisCache from '../../utils/redisCache';
import PropertyLeasePaymentCycleEntity, {
  LeasePaymentCycleStatus,
} from '../../entities/properties/propertyLeasePaymentCycleEntity';
import propertyLeaseAgreementRepository from '../../repositories/properties/propertyLeaseAgreementRepository';
import propertyLeaseChargeRepository from '../../repositories/properties/propertyLeaseChargeRepository';
import PropertyLeaseCharge, { LeaseChargeFrequency } from '../../entities/properties/propertyLeaseChargeEntity';
import { PaymentFrequency, PropertyLeaseAgreement } from '../../entities/properties/propertyLeaseAgreementEntity';
import { ApiError } from '../../errors/apiError';
import { StatusCodes } from 'http-status-codes';

interface GenerateOptions {
  asOf?: Date;
  horizon?: number; // number of additional periods beyond asOf to pre-generate
}

interface CycleSource {
  charge: PropertyLeaseCharge | null;
  chargeType: string;
  frequency: LeaseChargeFrequency;
  amount: number;
}

class PropertyLeasePaymentCycleService extends BaseService<PropertyLeasePaymentCycleEntity> {
  constructor() {
    super(
      {
        repository: propertyLeasePaymentCycleRepository,
        redisCache: new RedisCache<PropertyLeasePaymentCycleEntity>(300),
        logger,
      },
      'leasePaymentCycle'
    );
  }

  private toDateOnly(value: Date | string): Date {
    const d = new Date(value);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  private addByFrequency(base: Date, frequency: LeaseChargeFrequency, steps = 1): Date {
    const direction = steps >= 0 ? 1 : -1;
    const count = Math.abs(steps);
    let current = new Date(base);
    for (let i = 0; i < count; i += 1) {
      switch (frequency) {
        case LeaseChargeFrequency.DAILY:
          current.setDate(current.getDate() + direction);
          break;
        case LeaseChargeFrequency.WEEKLY:
          current.setDate(current.getDate() + 7 * direction);
          break;
        case LeaseChargeFrequency.BIWEEKLY:
          current.setDate(current.getDate() + 14 * direction);
          break;
        case LeaseChargeFrequency.QUARTERLY:
          current.setMonth(current.getMonth() + 3 * direction);
          break;
        case LeaseChargeFrequency.MONTHLY:
          current.setMonth(current.getMonth() + 1 * direction);
          break;
        case LeaseChargeFrequency.BIYEARLY:
          current.setMonth(current.getMonth() + 6 * direction);
          break;
        case LeaseChargeFrequency.YEARLY:
          current.setFullYear(current.getFullYear() + 1 * direction);
          break;
        case LeaseChargeFrequency.ONE_OFF:
        default:
          return new Date(base);
      }
    }
    return this.toDateOnly(current);
  }

  private frequencyFromPayment(freq: PaymentFrequency): LeaseChargeFrequency {
    switch (freq) {
      case PaymentFrequency.WEEKLY:
        return LeaseChargeFrequency.WEEKLY;
      case PaymentFrequency.BIWEEKLY:
        return LeaseChargeFrequency.BIWEEKLY;
      case PaymentFrequency.MONTHLY:
        return LeaseChargeFrequency.MONTHLY;
      case PaymentFrequency.QUARTERLY:
        return LeaseChargeFrequency.QUARTERLY;
      case PaymentFrequency.YEARLY:
        return LeaseChargeFrequency.YEARLY;
      default:
        return LeaseChargeFrequency.MONTHLY;
    }
  }

  private determineStatus(
    cycle: PropertyLeasePaymentCycleEntity,
    asOf: Date
  ): LeasePaymentCycleStatus {
    const due = this.toDateOnly(cycle.dueDate);
    const paid = Number(cycle.amountPaid || 0);
    const dueAmount = Number(cycle.amountDue || 0);
    if (paid >= dueAmount - 0.01) {
      return LeasePaymentCycleStatus.PAID;
    }
    if (paid > 0 && due <= asOf) {
      return LeasePaymentCycleStatus.PARTIAL;
    }
    if (due > asOf) {
      return LeasePaymentCycleStatus.UPCOMING;
    }
    if (due.getTime() === asOf.getTime()) {
      return LeasePaymentCycleStatus.DUE;
    }
    return LeasePaymentCycleStatus.OVERDUE;
  }

  private async refreshStatusesForLease(leaseId: string, asOf: Date): Promise<void> {
    const cycles = await propertyLeasePaymentCycleRepository.getByLease(leaseId);
    for (const cycle of cycles) {
      const nextStatus = this.determineStatus(cycle, asOf);
      if (cycle.status !== nextStatus) {
        cycle.status = nextStatus;
        await propertyLeasePaymentCycleRepository.save(cycle);
      }
    }
  }

  private buildSources(
    lease: PropertyLeaseAgreement,
    charges: PropertyLeaseCharge[]
  ): CycleSource[] {
    if (charges.length) {
      return charges.map((charge) => ({
        charge,
        chargeType: charge.chargeType,
        frequency: charge.frequency,
        amount: Number(charge.amount),
      }));
    }
    // fall back to lease amount if no explicit charges are configured
    const freq = this.frequencyFromPayment(lease.paymentFrequency);
    return [
      {
        charge: null,
        chargeType: 'rent',
        frequency: freq,
        amount: Number(lease.amount ?? 0),
      },
    ];
  }

  public async ensureCyclesForLease(
    leaseId: string,
    options: GenerateOptions = {}
  ): Promise<PropertyLeasePaymentCycleEntity[]> {
    const asOf = this.toDateOnly(options.asOf ?? new Date());
    const lease = await propertyLeaseAgreementRepository.findOne({ where: { id: leaseId } });
    if (!lease) {
      throw new ApiError(StatusCodes.NOT_FOUND, `Lease ${leaseId} not found`);
    }

    const charges = await propertyLeaseChargeRepository.getByLease(leaseId);
    const sources = this.buildSources(lease as PropertyLeaseAgreement, charges ?? []);

    const generated: PropertyLeasePaymentCycleEntity[] = [];
    const leaseStart = this.toDateOnly((lease as any).startDate);
    const leaseEnd = this.toDateOnly((lease as any).endDate);
    const firstDue = this.toDateOnly((lease as any).firstPaymentDate ?? leaseStart);
    const currency = ((lease as any).organization?.metadata?.currency as string) || 'KES';

    for (const source of sources) {
      if (!(source.amount > 0)) continue;
      const chargeId = source.charge ? (source.charge as any).id : null;
      let previousCycle = chargeId
        ? await propertyLeasePaymentCycleRepository.getLastForCharge(chargeId)
        : null;
      let nextDue = previousCycle ? this.addByFrequency(previousCycle.dueDate, source.frequency, 1) : firstDue;
      if (nextDue < leaseStart) {
        while (nextDue < leaseStart) {
          const advanced = this.addByFrequency(nextDue, source.frequency, 1);
          if (advanced.getTime() === nextDue.getTime()) break;
          nextDue = advanced;
        }
      }

      const limitDate = options.horizon && options.horizon > 0
        ? this.addByFrequency(asOf, source.frequency, options.horizon)
        : asOf;

      while (nextDue <= limitDate && nextDue <= leaseEnd) {
        const existing = await propertyLeasePaymentCycleRepository.findExisting(
          leaseId,
          chargeId,
          nextDue,
        );
        if (!existing) {
          const periodStart = previousCycle
            ? this.toDateOnly(new Date(previousCycle.periodEnd.getTime() + 86400000))
            : leaseStart;
          const periodEnd = nextDue;
          const cycle = await propertyLeasePaymentCycleRepository.create({
            lease: { id: leaseId } as any,
            tenant: { id: (lease as any).tenant?.id } as any,
            organization: { id: (lease as any).organization?.id } as any,
            charge: chargeId ? ({ id: chargeId } as any) : null,
            chargeType: source.chargeType,
            periodStart,
            periodEnd,
            dueDate: nextDue,
            amountDue: source.amount,
            amountPaid: 0,
            currency,
            status: LeasePaymentCycleStatus.UPCOMING,
          });
          cycle.status = this.determineStatus(cycle, asOf);
          await propertyLeasePaymentCycleRepository.save(cycle);
          generated.push(cycle);
          previousCycle = cycle;
        }
        const advanced = this.addByFrequency(nextDue, source.frequency, 1);
        if (advanced.getTime() === nextDue.getTime()) break;
        nextDue = advanced;
      }
    }

    await this.refreshStatusesForLease(leaseId, asOf);
    return generated;
  }

  public async listDueCyclesForLease(
    leaseId: string,
    asOf: Date = new Date()
  ): Promise<PropertyLeasePaymentCycleEntity[]> {
    await this.ensureCyclesForLease(leaseId, { asOf });
    return propertyLeasePaymentCycleRepository.listDueCycles(asOf, leaseId);
  }

  public async listDueCyclesForTenant(
    tenantId: string,
    asOf: Date = new Date()
  ): Promise<PropertyLeasePaymentCycleEntity[]> {
    const leases = await propertyLeaseAgreementRepository.getActiveLeasesByTenant(tenantId);
    await Promise.all(
      leases.map((lease: any) =>
        this.ensureCyclesForLease(lease.id, { asOf })
      )
    );
    return propertyLeasePaymentCycleRepository.listDueCycles(asOf, undefined, tenantId);
  }

  public async applyPayment(
    cycleId: string,
    amount: number,
    paidAt: Date
  ): Promise<PropertyLeasePaymentCycleEntity> {
    const cycle = await propertyLeasePaymentCycleRepository.findOne({ where: { id: cycleId } });
    if (!cycle) {
      throw new ApiError(StatusCodes.NOT_FOUND, `Payment cycle ${cycleId} not found`);
    }
    const newAmountPaid = Number(cycle.amountPaid || 0) + Number(amount || 0);
    cycle.amountPaid = Number(newAmountPaid.toFixed(2));
    const asOf = this.toDateOnly(new Date());
    const amountDue = Number(cycle.amountDue || 0);
    if (cycle.amountPaid >= amountDue - 0.01) {
      cycle.status = LeasePaymentCycleStatus.PAID;
      cycle.paidAt = paidAt;
    } else if (cycle.dueDate > asOf) {
      cycle.status = LeasePaymentCycleStatus.UPCOMING;
      cycle.paidAt = null;
    } else if (cycle.amountPaid > 0) {
      cycle.status = LeasePaymentCycleStatus.PARTIAL;
      cycle.paidAt = null;
    } else if (cycle.dueDate.getTime() === asOf.getTime()) {
      cycle.status = LeasePaymentCycleStatus.DUE;
      cycle.paidAt = null;
    } else {
      cycle.status = LeasePaymentCycleStatus.OVERDUE;
      cycle.paidAt = null;
    }
    return propertyLeasePaymentCycleRepository.save(cycle);
  }
}

export default new PropertyLeasePaymentCycleService();

import { PropertyLeaseAgreement, LeaseStatus } from '../../entities/properties/propertyLeaseAgreementEntity';
import BaseRepository from '../baseRepository';
import { logger } from '../../utils/logger';
import { FindManyOptions, Raw, LessThan } from 'typeorm';

class PropertyLeaseAgreementRepository extends BaseRepository<PropertyLeaseAgreement> {
  constructor() {
    super(PropertyLeaseAgreement);
  }

  /**
   * Find all active leases for a given tenant.
   */
  async getActiveLeasesByTenant(tenantId: string): Promise<PropertyLeaseAgreement[]> {
    try {
      return await this.find({
        where: {
          tenant: { id: tenantId },
          status: LeaseStatus.ACTIVE,
        },
        relations: { unit: true, landlord: true },
      });
    } catch (error) {
      this.handleError(error, `Error finding active leases for tenant ${tenantId}`);
    }
  }

  /**
   * Find all leases for a given landlord.
   */
  async getLeasesByLandlord(landlordId: string): Promise<PropertyLeaseAgreement[]> {
    try {
      return await this.find({
        where: { landlord: { id: landlordId } },
        relations: { tenant: true, unit: true },
      });
    } catch (error) {
      this.handleError(error, `Error finding leases for landlord ${landlordId}`);
    }
  }

  /**
   * Find leases for a specific property unit.
   */
  async getLeasesByUnit(
    unitId: string,
    options?: Partial<FindManyOptions<PropertyLeaseAgreement>>
  ): Promise<PropertyLeaseAgreement[]> {
    try {
      return await this.find({
        where: { unit: { id: unitId } },
        ...(options ?? {}),
      });
    } catch (error) {
      this.handleError(error, `Error finding leases for unit ${unitId}`);
    }
  }

  /**
   * Find all pending or signed e-signature leases for a landlord.
   */
  async getPendingOrSignedLeasesForLandlord(landlordId: string): Promise<PropertyLeaseAgreement[]> {
    try {
      return await this.find({
        where: [
          { landlord: { id: landlordId }, status: LeaseStatus.PENDING },
          { landlord: { id: landlordId }, status: LeaseStatus.ACTIVE },
        ],
        relations: { tenant: true, unit: true },
      });
    } catch (error) {
      this.handleError(error, `Error finding pending or signed leases for landlord ${landlordId}`);
    }
  }

  /**
   * Get a lease by ID, including all relations.
   */
  async getLeaseWithDetails(leaseId: string): Promise<PropertyLeaseAgreement | null> {
    try {
      return await this.findOne({
        where: { id: leaseId },
        relations: {
          unit: true,
          tenant: true,
          landlord: true,
          payments: true,
        },
      });
    } catch (error) {
      this.handleError(error, `Error getting lease details for lease ${leaseId}`);
    }
  }

  /**
   * Find all expired leases as of a specific date.
   */
  async getExpiredLeases(asOf: Date): Promise<PropertyLeaseAgreement[]> {
    try {
      return await this.find({
        where: {
          status: LeaseStatus.EXPIRED,
          endDate: asOf,  // or use Raw(alias => `${alias} < :asOf`, { asOf })
        },
      });
    } catch (error) {
      this.handleError(error, `Error finding expired leases as of ${asOf.toISOString()}`);
    }
  }

  /**
   * Find all leases needing e-signature reminders.
   */
  async findLeasesNeedingEsignatureReminders(daysSinceSent = 1): Promise<PropertyLeaseAgreement[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysSinceSent);

      return await this.find({
        where: {
          createdAt: LessThan(cutoffDate),
          esignatures: Raw(alias => `
            EXISTS (
              SELECT 1
              FROM jsonb_array_elements(${alias}) AS elem
              WHERE (elem->>'status') = 'pending'
            )`
          ),
        },
      });
    } catch (error) {
      this.handleError(error, `Error finding leases needing e-signature reminders`);
    }
  }

  /**
   * Find all active leases with no payment this month.
   */
  async findLeasesWithMissingPayments(): Promise<PropertyLeaseAgreement[]> {
    try {
      const today = new Date();
      const month = today.getMonth() + 1;
      const year = today.getFullYear();

      return await this.executeCustomQuery(repo =>
        repo
          .createQueryBuilder('lease')
          .where('lease.status = :status', { status: LeaseStatus.ACTIVE })
          .andWhere('lease.startDate <= :today', { today })
          .andWhere('lease.endDate >= :today', { today })
          .andWhere(qb => {
            const sub = qb
              .subQuery()
              .select('1')
              .from('property_lease_payments', 'p')
              .where('p.lease_id = lease.id')
              .andWhere('EXTRACT(MONTH FROM p.payment_date) = :month', { month })
              .andWhere('EXTRACT(YEAR FROM p.payment_date) = :year', { year })
              .getQuery();
            return `NOT EXISTS ${sub}`;
          })
      );
    } catch (error) {
      this.handleError(error, `Error finding leases with missing payments`);
    }
  }

  /**
   * Find upcoming lease renewals within the next `windowInDays` days.
   */
  async findUpcomingLeaseRenewals(windowInDays: number): Promise<PropertyLeaseAgreement[]> {
    try {
      const today = new Date();
      const renewalCutoff = new Date();
      renewalCutoff.setDate(today.getDate() + windowInDays);

      return await this.find({
        where: {
          status: LeaseStatus.ACTIVE,
          endDate: Raw(
            alias => `${alias} BETWEEN :today AND :cutoff`,
            { today, cutoff: renewalCutoff }
          ),
        },
      });
    } catch (error) {
      this.handleError(error, `Error finding upcoming lease renewals`);
    }
  }
}

const propertyLeaseAgreementRepository = new PropertyLeaseAgreementRepository();
export { propertyLeaseAgreementRepository as default, PropertyLeaseAgreementRepository };

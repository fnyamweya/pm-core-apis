import { PropertyLeasePaymentEntity } from '../../entities/properties/propertyLeasePaymentEntity';
import BaseRepository from '../baseRepository';
import { logger } from '../../utils/logger';
import { Raw, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';

class PropertyLeasePaymentRepository extends BaseRepository<PropertyLeasePaymentEntity> {
  constructor() {
    super(PropertyLeasePaymentEntity);
  }

  /**
   * Find all payments for a specific lease.
   */
  async getPaymentsByLease(leaseId: string): Promise<PropertyLeasePaymentEntity[]> {
    try {
      return await this.find({
        where: { lease: { id: leaseId } },
        order: { paidAt: 'DESC' }
      });
    } catch (error) {
      this.handleError(error, `Error fetching payments for lease ${leaseId}`);
    }
  }

  /**
   * Find all payments made by a tenant.
   */
  async getPaymentsByTenant(tenantId: string): Promise<PropertyLeasePaymentEntity[]> {
    try {
      return await this.find({
        where: { tenant: { id: tenantId } },
        order: { paidAt: 'DESC' }
      });
    } catch (error) {
      this.handleError(error, `Error fetching payments for tenant ${tenantId}`);
    }
  }

  /**
   * Find payments within a date range.
   */
  async getPaymentsInDateRange(start: Date, end: Date): Promise<PropertyLeasePaymentEntity[]> {
    try {
      return await this.find({
        where: {
          paidAt: Between(start, end)
        },
        order: { paidAt: 'DESC' }
      });
    } catch (error) {
      this.handleError(error, `Error fetching payments in date range`);
    }
  }

  /**
   * Find all payments of a given type (e.g., RENT, DEPOSIT).
   */
  async getPaymentsByType(typeCode: string): Promise<PropertyLeasePaymentEntity[]> {
    try {
      return await this.find({
        where: { type: { code: typeCode } },
        order: { paidAt: 'DESC' }
      });
    } catch (error) {
      this.handleError(error, `Error fetching payments of type ${typeCode}`);
    }
  }

  /**
   * Find all payments for a property (optional: filter by unit).
   */
  async getPaymentsByProperty(propertyId: string, unitId?: string): Promise<PropertyLeasePaymentEntity[]> {
    try {
      const qb = this.repository.createQueryBuilder('payment')
        .leftJoinAndSelect('payment.lease', 'lease')
        .leftJoinAndSelect('lease.unit', 'unit')
        .leftJoinAndSelect('lease.property', 'property')
        .orderBy('payment.paidAt', 'DESC')
        .where('lease.property_id = :propertyId', { propertyId });

      if (unitId) {
        qb.andWhere('lease.unit_id = :unitId', { unitId });
      }

      return await qb.getMany();
    } catch (error) {
      this.handleError(error, `Error fetching payments for property ${propertyId}`);
    }
  }

  /**
   * Get total amount paid for a lease.
   */
  async getTotalPaidForLease(leaseId: string): Promise<number> {
    try {
      const result = await this.repository
        .createQueryBuilder('payment')
        .select('SUM(payment.amount)', 'total')
        .where('payment.lease_id = :leaseId', { leaseId })
        .getRawOne();
      return Number(result?.total ?? 0);
    } catch (error) {
      this.handleError(error, `Error calculating total paid for lease ${leaseId}`);
    }
  }

  /**
   * Get Payments by Lease
   */

}

const propertyLeasePaymentRepository = new PropertyLeasePaymentRepository();
export { propertyLeasePaymentRepository as default, PropertyLeasePaymentRepository };

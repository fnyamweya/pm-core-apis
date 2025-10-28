import { Between, LessThanOrEqual, In } from 'typeorm';
import BaseRepository from '../baseRepository';
import { logger } from '../../utils/logger';
import PropertyLeasePaymentCycleEntity, {
  LeasePaymentCycleStatus,
} from '../../entities/properties/propertyLeasePaymentCycleEntity';

class PropertyLeasePaymentCycleRepository extends BaseRepository<PropertyLeasePaymentCycleEntity> {
  constructor() {
    super(PropertyLeasePaymentCycleEntity);
  }

  async getLastForCharge(chargeId: string): Promise<PropertyLeasePaymentCycleEntity | null> {
    try {
      return await this.repository.findOne({
        where: { charge: { id: chargeId } } as any,
        order: { dueDate: 'DESC' },
      });
    } catch (error) {
      this.handleError(error, `Error fetching last cycle for charge ${chargeId}`);
    }
  }

  async getByLease(leaseId: string): Promise<PropertyLeasePaymentCycleEntity[]> {
    try {
      return await this.find({ where: { lease: { id: leaseId } } as any, order: { dueDate: 'ASC' } });
    } catch (error) {
      this.handleError(error, `Error fetching cycles for lease ${leaseId}`);
    }
  }

  async findExisting(leaseId: string, chargeId: string | null, dueDate: Date): Promise<PropertyLeasePaymentCycleEntity | null> {
    try {
      return await this.repository.findOne({
        where: {
          lease: { id: leaseId },
          ...(chargeId ? { charge: { id: chargeId } } : { charge: null }),
          dueDate,
        } as any,
      });
    } catch (error) {
      this.handleError(error, `Error checking existing cycle for lease ${leaseId}`);
    }
  }

  async listDueCycles(asOf: Date, leaseId?: string, tenantId?: string): Promise<PropertyLeasePaymentCycleEntity[]> {
    try {
      const day = new Date(asOf.toISOString().slice(0, 10));
      return await this.repository.find({
        where: {
          ...(leaseId ? { lease: { id: leaseId } } : {}),
          ...(tenantId ? { tenant: { id: tenantId } } : {}),
          status: In([
            LeasePaymentCycleStatus.DUE,
            LeasePaymentCycleStatus.OVERDUE,
            LeasePaymentCycleStatus.PARTIAL,
          ]) as any,
          dueDate: LessThanOrEqual(day),
        },
        order: { dueDate: 'ASC' },
      });
    } catch (error) {
      this.handleError(error, 'Error listing due payment cycles');
    }
  }

  async findWindow(leaseId: string, chargeId: string | null, windowStart: Date, windowEnd: Date): Promise<PropertyLeasePaymentCycleEntity[]> {
    try {
      return await this.repository.find({
        where: {
          lease: { id: leaseId },
          ...(chargeId ? { charge: { id: chargeId } } : { charge: null }),
          dueDate: Between(windowStart, windowEnd),
        } as any,
        order: { dueDate: 'ASC' },
      });
    } catch (error) {
      this.handleError(error, 'Error fetching payment cycles window');
    }
  }
}

const propertyLeasePaymentCycleRepository = new PropertyLeasePaymentCycleRepository();
export {
  propertyLeasePaymentCycleRepository as default,
  PropertyLeasePaymentCycleRepository,
};

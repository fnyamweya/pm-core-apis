import { FindManyOptions } from 'typeorm';
import BaseRepository from '../baseRepository';
import { logger } from '../../utils/logger';
import PropertyLeaseCharge from '../../entities/properties/propertyLeaseChargeEntity';

class PropertyLeaseChargeRepository extends BaseRepository<PropertyLeaseCharge> {
  constructor() {
    super(PropertyLeaseCharge);
  }

  async getByLease(leaseId: string, options?: Partial<FindManyOptions<PropertyLeaseCharge>>): Promise<PropertyLeaseCharge[]> {
    try {
      return await this.find({ where: { lease: { id: leaseId } } as any, ...(options ?? {}) });
    } catch (error) {
      this.handleError(error, `Error fetching charges for lease ${leaseId}`);
    }
  }
}

const propertyLeaseChargeRepository = new PropertyLeaseChargeRepository();
export { propertyLeaseChargeRepository as default, PropertyLeaseChargeRepository };


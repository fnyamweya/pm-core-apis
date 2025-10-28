import BaseRepository from '../baseRepository';
import PropertyLeaseTransactionEntity from '../../entities/properties/propertyLeaseTransactionEntity';

class PropertyLeaseTransactionRepository extends BaseRepository<PropertyLeaseTransactionEntity> {
  constructor() {
    super(PropertyLeaseTransactionEntity);
  }

  async getByLease(leaseId: string): Promise<PropertyLeaseTransactionEntity[]> {
    return this.find({ where: { lease: { id: leaseId } } as any, order: { createdAt: 'DESC' } });
  }

  async getByTenant(tenantId: string): Promise<PropertyLeaseTransactionEntity[]> {
    return this.find({ where: { tenant: { id: tenantId } } as any, order: { createdAt: 'DESC' } });
  }
}

const propertyLeaseTransactionRepository = new PropertyLeaseTransactionRepository();
export { propertyLeaseTransactionRepository as default, PropertyLeaseTransactionRepository };


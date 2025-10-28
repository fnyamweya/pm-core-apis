import BaseRepository from '../baseRepository';
import PropertyLeaseChargeTransactionEntity from '../../entities/properties/propertyLeaseChargeTransactionEntity';

class PropertyLeaseChargeTransactionRepository extends BaseRepository<PropertyLeaseChargeTransactionEntity> {
  constructor() {
    super(PropertyLeaseChargeTransactionEntity);
  }

  async getByLease(leaseId: string): Promise<PropertyLeaseChargeTransactionEntity[]> {
    return this.executeCustomQuery(repo =>
      repo
        .createQueryBuilder('ct')
        .leftJoinAndSelect('ct.leaseTransaction', 'lt')
        .leftJoinAndSelect('lt.lease', 'lease')
        .leftJoinAndSelect('ct.charge', 'charge')
        .where('lease.id = :leaseId', { leaseId })
        .orderBy('ct.appliesToDate', 'ASC')
    );
  }

  async getByCharge(chargeId: string): Promise<PropertyLeaseChargeTransactionEntity[]> {
    return this.find({ where: { charge: { id: chargeId } } as any, order: { appliesToDate: 'ASC' } });
  }
}

const propertyLeaseChargeTransactionRepository = new PropertyLeaseChargeTransactionRepository();
export { propertyLeaseChargeTransactionRepository as default, PropertyLeaseChargeTransactionRepository };

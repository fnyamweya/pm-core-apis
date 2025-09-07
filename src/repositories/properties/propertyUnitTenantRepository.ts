import { PropertyUnitTenantEntity, UnitTenantStatus } from '../../entities/properties/propertyUnitTenantEntity';
import BaseRepository from '../baseRepository';
import { logger } from '../../utils/logger';
import { IsNull, Raw } from 'typeorm';

class PropertyUnitTenantRepository extends BaseRepository<PropertyUnitTenantEntity> {
  constructor() {
    super(PropertyUnitTenantEntity);
  }

  /**
   * Find tenants for all properties within an organization.
   */
  async getTenantsByOrganizationId(orgId: string): Promise<PropertyUnitTenantEntity[]> {
    try {
      const qb = this.repository
        .createQueryBuilder('tenancy')
        .leftJoinAndSelect('tenancy.property', 'property')
        .leftJoinAndSelect('property.organization', 'org')
        .leftJoinAndSelect('tenancy.unit', 'unit')
        .leftJoinAndSelect('tenancy.user', 'user')
        .where('org.id = :orgId', { orgId })
        .andWhere('tenancy.deletedAt IS NULL')
        .orderBy('tenancy.createdAt', 'DESC');
      return await qb.getMany();
    } catch (error) {
      this.handleError(error, `Error finding tenants for organization ${orgId}`);
    }
  }

  /**
   * Find tenants for all properties within any of the provided organizations.
   */
  async getTenantsByOrganizationIds(orgIds: string[]): Promise<PropertyUnitTenantEntity[]> {
    try {
      if (!orgIds.length) return [];
      const qb = this.repository
        .createQueryBuilder('tenancy')
        .leftJoinAndSelect('tenancy.property', 'property')
        .leftJoinAndSelect('property.organization', 'org')
        .leftJoinAndSelect('tenancy.unit', 'unit')
        .leftJoinAndSelect('tenancy.user', 'user')
        .where('org.id IN (:...orgIds)', { orgIds })
        .andWhere('tenancy.deletedAt IS NULL')
        .orderBy('tenancy.createdAt', 'DESC');
      return await qb.getMany();
    } catch (error) {
      this.handleError(error, `Error finding tenants for organizations ${orgIds.join(',')}`);
    }
  }

  /**
   * Find all tenants for a given property.
   */
  async getTenantsByProperty(propertyId: string): Promise<PropertyUnitTenantEntity[]> {
    try {
      return await this.find({
        where: { property: { id: propertyId } },
        relations: { unit: true, user: true }
      });
    } catch (error) {
      this.handleError(error, `Error finding tenants for property ${propertyId}`);
    }
  }

  /**
   * Find all tenants for a specific unit.
   */
  async getTenantsByUnit(unitId: string): Promise<PropertyUnitTenantEntity[]> {
    try {
      return await this.find({
        where: { unit: { id: unitId } },
        relations: { user: true }
      });
    } catch (error) {
      this.handleError(error, `Error finding tenants for unit ${unitId}`);
    }
  }

  /**
   * Find active tenant for a specific unit.
   */
  async getActiveTenantByUnit(unitId: string): Promise<PropertyUnitTenantEntity | null> {
    try {
      return await this.findOne({
        where: { unit: { id: unitId }, status: UnitTenantStatus.ACTIVE },
        relations: { user: true }
      });
    } catch (error) {
      this.handleError(error, `Error finding active tenant for unit ${unitId}`);
    }
  }

  /**
   * Find all tenants for a given user (across all properties/units).
   */
  async getTenanciesByUser(userId: string): Promise<PropertyUnitTenantEntity[]> {
    try {
      return await this.find({
        where: { user: { id: userId } },
        relations: { property: true, unit: true }
      });
    } catch (error) {
      this.handleError(error, `Error finding tenancies for user ${userId}`);
    }
  }

  /**
   * Find tenants by status (active, pending, evicted, etc) for a property.
   */
  async getTenantsByStatus(propertyId: string, status: UnitTenantStatus): Promise<PropertyUnitTenantEntity[]> {
    try {
      return await this.find({
        where: { property: { id: propertyId }, status },
        relations: { unit: true, user: true }
      });
    } catch (error) {
      this.handleError(error, `Error finding tenants with status ${status} for property ${propertyId}`);
    }
  }

  /**
   * Find evicted or past tenants for dunning/analytics.
   */
  async getPastOrEvictedTenants(propertyId: string): Promise<PropertyUnitTenantEntity[]> {
    try {
      return await this.find({
        where: [
          { property: { id: propertyId }, status: UnitTenantStatus.PAST },
          { property: { id: propertyId }, status: UnitTenantStatus.EVICTED }
        ],
        relations: { unit: true, user: true }
      });
    } catch (error) {
      this.handleError(error, `Error finding past or evicted tenants for property ${propertyId}`);
    }
  }

  /**
   * Find all active tenants whose KYC is missing or incomplete.
   */
  async getActiveTenantsWithIncompleteKYC(propertyId: string): Promise<PropertyUnitTenantEntity[]> {
    try {
      // Here, assumes your KYC is set as a required property or has a completeness flag.
      // This logic can be adjusted per your real data structure.
      return await this.find({
        where: [
        {
          property: { id: propertyId },
          status: UnitTenantStatus.ACTIVE,
          kyc: IsNull(),
        },
        {
          property: { id: propertyId },
          status: UnitTenantStatus.ACTIVE,
          kyc: Raw(alias => `${alias} = '{}'`),
        }
      ],
        relations: { unit: true, user: true }
      });
    } catch (error) {
      this.handleError(error, `Error finding active tenants with incomplete KYC for property ${propertyId}`);
    }
  }
}

const propertyUnitTenantRepository = new PropertyUnitTenantRepository();
export { propertyUnitTenantRepository as default, PropertyUnitTenantRepository };

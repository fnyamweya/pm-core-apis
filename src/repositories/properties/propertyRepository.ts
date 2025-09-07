import { Property } from '../../entities/properties/propertyEntity';
import { logger } from '../../utils/logger';
import BaseRepository from '../baseRepository';
import { FindManyOptions, In, Raw } from 'typeorm';

class PropertyRepository extends BaseRepository<Property> {
  constructor() {
    super(Property);
  }

  async getPropertyByCode(code: string): Promise<Property | null> {
    try {
      const property = await this.findOne({ where: { code } });
      if (!property) {
        logger.info(`Property with code ${code} not found.`);
      }
      return property;
    } catch (error) {
      this.handleError(error, `Error finding property by code: ${code}`);
    }
  }

  async getPropertiesByOrganizationId(organizationId: string): Promise<Property[]> {
    try {
      return await this.find({
        where: { organization: { id: organizationId } },
        relations: ['organization', 'addresses', 'units', 'owners'],
      });
    } catch (error) {
      this.handleError(error, `Error finding properties by organization: ${organizationId}`);
    }
  }

  async getPropertiesByOrganizationIds(organizationIds: string[]): Promise<Property[]> {
    try {
      if (!organizationIds.length) return [];
      return await this.find({
        where: { organization: { id: In(organizationIds) } as any },
        relations: ['organization'],
      });
    } catch (error) {
      this.handleError(error, `Error finding properties by organization IDs: ${organizationIds.join(',')}`);
    }
  }

  /**
   * Find properties that are owned by any of the given organizations, either:
   * - directly via property.organization, or
   * - via property_owners rows with organization owner.
   */
  async getPropertiesOwnedByOrganizations(organizationIds: string[]): Promise<Property[]> {
    try {
      if (!organizationIds.length) return [];
      const qb = this.repository
        .createQueryBuilder('property')
        .leftJoinAndSelect('property.organization', 'organization')
        .leftJoin('property.owners', 'owners')
        .leftJoin('owners.organization', 'ownerOrg')
        .where('organization.id IN (:...orgIds)', { orgIds: organizationIds })
        .orWhere('ownerOrg.id IN (:...orgIds)', { orgIds: organizationIds })
        .distinct(true);
      return await qb.getMany();
    } catch (error) {
      this.handleError(error, `Error finding properties owned by organizations: ${organizationIds.join(',')}`);
    }
  }

  async getPropertiesByOwnerId(ownerId: string): Promise<Property[]> {
    try {
      return await this.repository
        .createQueryBuilder('property')
        .innerJoin('property.owners', 'owner', 'owner.id = :ownerId', { ownerId })
        .leftJoinAndSelect('property.organization', 'organization')
        .leftJoinAndSelect('property.addresses', 'addresses')
        .leftJoinAndSelect('property.units', 'units')
        .getMany();
    } catch (error) {
      this.handleError(error, `Error finding properties by owner: ${ownerId}`);
    }
  }

  /**
   * Find all properties that are listed (e.g. visible to market).
   */
  async getListedProperties(): Promise<Property[]> {
    try {
      return await this.find({
        where: { isListed: true },
        relations: { addresses: true }
      });
    } catch (error) {
      this.handleError(error, `Error finding listed properties`);
    }
  }

  async findByConfigKeyValue(key: string, value: any): Promise<Property[]> {
    try {
      // This uses JSONB path queries, which are fast and scalable in Postgres
      return await this.find({
        where: {
          config: Raw(
            (alias) => `${alias} @> :match`,
            { match: JSON.stringify({ [key]: value }) }
          )
        }
      });
    } catch (error) {
      this.handleError(error, `Error finding properties by config key: ${key}`);
    }
  }
}

const propertyRepository = new PropertyRepository();
export { PropertyRepository, propertyRepository as default };

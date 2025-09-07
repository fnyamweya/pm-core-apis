import { Organization } from '../../entities/organizations/organizationEntity';
import organizationRepository from '../../repositories/organizations/organizationRepository';
import { logger } from '../../utils/logger';
import RedisCache from '../../utils/redisCache';
import { BaseService } from '../baseService';

class OrganizationService extends BaseService<Organization> {
  private organizationCache: RedisCache<Organization>;

  constructor() {
    super(
      {
        repository: organizationRepository,
        redisCache: new RedisCache<Organization>(3600), // Cache TTL: 1 hour
        logger,
      },
      'organization'
    );

    this.organizationCache = new RedisCache<Organization>(3600);
    this.logger.info('OrganizationService initialized');
  }

  /**
   * Retrieves an organization by its ID, using cache if available.
   * @param id - The ID of the organization.
   * @returns The organization entity or null if not found.
   */
  async getOrganizationById(id: string): Promise<Organization | null> {
    this.logger.info('Fetching organization by ID', { id });

    let organization = await this.organizationCache.getFromCache(
      'organization',
      id
    );
    if (!organization) {
      organization = await organizationRepository.findById(id);
      if (organization) {
        await this.organizationCache.setToCache(
          'organization',
          id,
          organization
        );
        this.logger.info('Organization cached by ID', { id });
      }
    } else {
      this.logger.info('Organization found in cache', { id });
    }

    return (organization as Organization) || null;
  }

  /**
   * Creates a new organization.
   * @param data - The data to create the organization.
   * @returns The created organization entity.
   */
  async createOrganization(data: Partial<Organization>): Promise<Organization> {
    this.logger.info('Creating organization', { data });

    const organization = await organizationRepository.create(data);
    await this.organizationCache.setToCache(
      'organization',
      organization.id,
      organization
    );
    return organization;
  }

  /**
   * Updates an organization by its ID.
   * @param id - The ID of the organization.
   * @param updateData - Data to update the organization.
   */
  async updateOrganizationById(
    id: string,
    updateData: Partial<Organization>
  ): Promise<void> {
    this.logger.info('Updating organization by ID', { id, updateData });

    // Accept optional type; no enforced validation

    await organizationRepository.update(id, updateData);
    await this.refreshCache(id);
  }

  /**
   * Updates the configuration for a specific organization.
   * @param id - The ID of the organization.
   * @param config - Configuration data to update.
   */
  async updateOrganizationConfig(
    id: string,
    config: Partial<Organization['config']>
  ): Promise<void> {
    this.logger.info('Updating organization config', { id, config });

    await organizationRepository.update(id, { config });
    await this.refreshCache(id);
  }

  /**
   * Soft deletes an organization by its ID.
   * @param id - The ID of the organization to soft delete.
   */
  async softDeleteOrganization(id: string): Promise<void> {
    this.logger.info('Soft deleting organization', { id });

    await organizationRepository.softDelete(id);
    await this.organizationCache.deleteKey('organization', id);
  }

  /**
   * Restores a soft-deleted organization by its ID.
   * @param id - The ID of the organization to restore.
   */
  async restoreOrganization(id: string): Promise<void> {
    this.logger.info('Restoring organization', { id });

    await organizationRepository.restore(id);
    await this.refreshCache(id);
  }

  /**
   * Deletes an organization by its ID with cascading deletion of related entities.
   * @param id - The ID of the organization to delete.
   */
  async deleteOrganizationById(id: string): Promise<void> {
    this.logger.info('Deleting organization by ID', { id });

    await organizationRepository.delete(id);
    await this.organizationCache.deleteKey('organization', id);
  }

  /**
   * Retrieves an organization with all related members, transactions, and addresses.
   * @param id - The ID of the organization.
   * @returns The organization entity with its related entities or null if not found.
   */
  async getOrganizationWithRelations(id: string): Promise<Organization | null> {
    this.logger.info('Fetching organization with relations by ID', { id });

    const organization = await organizationRepository.findOne({
      where: { id },
      relations: ['members', 'transactions', 'addresses', 'kycProfiles'],
    });
    if (organization) {
      await this.organizationCache.setToCache('organization', id, organization);
    }

    return organization;
  }

  /**
   * Refreshes the cache for a given organization by ID.
   * @param id - The ID of the organization.
   */
  private async refreshCache(id: string): Promise<void> {
    const organization = await this.getOrganizationById(id);
    if (organization) {
      await this.organizationCache.setToCache('organization', id, organization);
      this.logger.info('Organization cache refreshed', { id });
    }
  }
}

export default new OrganizationService();

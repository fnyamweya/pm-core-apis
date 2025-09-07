import { OrganizationType } from '../../entities/organizations/organizationTypeEntity';
import organizationTypeRepository from '../../repositories/organizations/organizationTypeRepository';
import { logger } from '../../utils/logger';
import RedisCache from '../../utils/redisCache';
import { BaseService } from '../baseService';

export class OrganizationTypeService extends BaseService<OrganizationType> {
  private readonly cacheNamespace = 'organizationType';

  constructor() {
    super(
      {
        repository: organizationTypeRepository,
        redisCache: new RedisCache<OrganizationType>(3600), // Cache TTL: 1 hour
        logger,
      },
      'organizationType'
    );
  }

  private generateCacheKey(namespace: string, key: string): string {
    return `${namespace}:${key}`;
  }

  /**
   * Retrieves an organization type by its name, using cache if available.
   * @param name - The name of the organization type.
   * @returns The organization type entity or null if not found.
   */
  async getOrganizationTypeByName(
    name: string
  ): Promise<OrganizationType | null> {
    this.logger.info('Fetching organization type by name', { name });

    const cacheKey = this.generateCacheKey(this.cacheNamespace, name);
    let organizationType = await this.cache.getFromCache(
      this.cacheNamespace,
      cacheKey
    );

    if (!organizationType) {
      organizationType =
        await organizationTypeRepository.getOrganizationTypeByName(name);
      if (organizationType) {
        await this.cache.setToCache(
          this.cacheNamespace,
          cacheKey,
          organizationType
        );
        this.logger.info('Organization type cached by name', { name });
      }
    } else {
      this.logger.info('Organization type found in cache', { name });
    }

    return organizationType;
  }

  /**
   * Retrieves active organization types, using cache if available.
   * @returns Array of active organization type entities.
   */
  async getActiveOrganizationTypes(): Promise<OrganizationType[]> {
    this.logger.info('Fetching active organization types');

    const cacheKey = this.generateCacheKey(this.cacheNamespace, 'active');
    let organizationTypes = await this.cache.getFromCache<OrganizationType[]>(
      this.cacheNamespace,
      cacheKey
    );

    if (!organizationTypes) {
      organizationTypes =
        await organizationTypeRepository.getActiveOrganizationTypes();
      if (organizationTypes) {
        await this.cache.setToCache(
          this.cacheNamespace,
          cacheKey,
          organizationTypes
        );
        this.logger.info('Active organization types cached');
      }
    } else {
      this.logger.info('Active organization types found in cache');
    }

    return organizationTypes;
  }

  /**
   * Creates a new organization type.
   * @param data - The data to create the organization type.
   * @returns The created OrganizationType entity.
   */
  async createOrganizationType(
    data: Partial<OrganizationType>
  ): Promise<OrganizationType> {
    this.logger.info('Creating organization type', { data });

    const organizationType =
      await organizationTypeRepository.createOrganizationType(data);
    const cacheKey = this.generateCacheKey(
      this.cacheNamespace,
      organizationType.id
    );
    await this.cache.setToCache(
      this.cacheNamespace,
      cacheKey,
      organizationType
    );

    this.logger.info('Organization type created successfully', {
      organizationTypeId: organizationType.id,
    });
    return organizationType;
  }

  /**
   * Updates an organization type by its ID.
   * @param id - The ID of the organization type to update.
   * @param data - The data to update the organization type.
   * @returns The updated OrganizationType entity.
   */
  async updateOrganizationType(
    id: string,
    data: Partial<OrganizationType>
  ): Promise<OrganizationType> {
    this.logger.info('Updating organization type', {
      organizationTypeId: id,
      data,
    });

    await organizationTypeRepository.updateOrganizationType(id, data);
    const updatedOrganizationType = await this.getById(id);

    const cacheKey = this.generateCacheKey(this.cacheNamespace, id);
    await this.cache.deleteKey(this.cacheNamespace, cacheKey);
    if (updatedOrganizationType) {
      await this.cache.setToCache(
        this.cacheNamespace,
        cacheKey,
        updatedOrganizationType
      );
    }

    this.logger.info('Organization type updated successfully', {
      organizationTypeId: id,
    });
    return updatedOrganizationType;
  }

  /**
   * Deletes an organization type by its ID.
   * @param id - The ID of the organization type to delete.
   */
  async deleteOrganizationType(id: string): Promise<void> {
    this.logger.info('Deleting organization type', { organizationTypeId: id });

    const cacheKey = this.generateCacheKey(this.cacheNamespace, id);
    await this.cache.deleteKey(this.cacheNamespace, cacheKey);

    await organizationTypeRepository.deleteOrganizationType(id);
    this.logger.info('Organization type deleted successfully', {
      organizationTypeId: id,
    });
  }
}

export default new OrganizationTypeService();

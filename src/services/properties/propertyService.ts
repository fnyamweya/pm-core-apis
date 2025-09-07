import { Property } from '../../entities/properties/propertyEntity';
import propertyRepository from '../../repositories/properties/propertyRepository';
import { logger } from '../../utils/logger';
import RedisCache from '../../utils/redisCache';
import { BaseService } from '../baseService';

interface CreatePropertyDTO {
  code: string;
  name: string;
  type: string;
  description?: string;
  organizationId: string;
  addressId?: string;
  isListed?: boolean;
  config?: Record<string, any>;
}

interface UpdatePropertyDTO {
  name?: string;
  type?: string;
  description?: string;
  organizationId?: string;
  addressId?: string;
  isListed?: boolean;
  config?: Record<string, any>;
}

class PropertyService extends BaseService<Property> {
  private propertyCache: RedisCache<Property>;
  private readonly codeNs = 'propertyCode';
  private readonly orgNs  = 'propertyOrg';
  private readonly ownerNs = 'propertyOwner';
  private readonly listedKey = 'propertyListed';

  constructor() {
    super(
      {
        repository: propertyRepository,
        redisCache: new RedisCache<Property>(3600),
        logger,
      },
      'property',
    );
    this.propertyCache = new RedisCache<Property>(3600);
    this.logger.info('PropertyService initialized');
  }

  private cacheKey(ns: string, key: string): string {
    return `${ns}:${key}`;
  }

  async createProperty(data: CreatePropertyDTO): Promise<Property> {
    this.logger.info('Creating property', { code: data.code });
    const prop = await this.repository.create({
      code: data.code,
      name: data.name,
      type: data.type,
      description: data.description,
      organization: { id: data.organizationId } as any,
      addresses: data.addressId ? [{ id: data.addressId } as any] : undefined,
      isListed: data.isListed,
      config: data.config,
    });
    await this.propertyCache.setToCache('property', prop.id, prop);
    if (prop.code) {
      await this.propertyCache.setToCache(this.codeNs, prop.code, prop);
    }
    return prop;
  }

  async updateProperty(
    id: string,
    data: UpdatePropertyDTO
  ): Promise<Property> {
    this.logger.info('Updating property', { propertyId: id });
    const payload: any = { ...data };
    if (Object.prototype.hasOwnProperty.call(data, 'organizationId')) {
      payload.organization = data.organizationId
        ? ({ id: data.organizationId } as any)
        : null;
      delete payload.organizationId;
    }
    await this.repository.update(id, payload);
    const updated = await this.getById(id);
    // update caches
    await this.propertyCache.deleteKey('property', id);
    await this.propertyCache.setToCache('property', id, updated);
    if (updated.code) {
      await this.propertyCache.setToCache(this.codeNs, updated.code, updated);
    }
    return updated;
  }

  async deleteProperty(id: string): Promise<void> {
    this.logger.info('Deleting property', { propertyId: id });
    const prop = await this.getById(id);
    await this.repository.delete(id);
    // invalidate caches
    await this.propertyCache.deleteKey('property', id);
    if (prop.code) {
      await this.propertyCache.deleteKey(this.codeNs, prop.code);
    }
    // note: org/owner/listed caches may become stale
  }

  async getPropertyByCode(code: string): Promise<Property | null> {
    this.logger.info('Fetching property by code', { code });
    const key = this.cacheKey(this.codeNs, code);
    let prop = await this.propertyCache.getFromCache(this.codeNs, key) as Property | null;
    if (!prop) {
      prop = await propertyRepository.getPropertyByCode(code);
      if (prop) {
        await this.propertyCache.setToCache(this.codeNs, key, prop);
      }
    }
    return prop;
  }

  async getPropertiesByOrganization(organizationId: string): Promise<Property[]> {
    this.logger.info('Fetching properties by organization', { organizationId });
    const key = this.cacheKey(this.orgNs, organizationId);
    let list = await this.propertyCache.getFromCache(this.orgNs, key) as Property[] | null;
    if (!list) {
      list = await propertyRepository.getPropertiesByOrganizationId(organizationId);
      await this.propertyCache.setToCache(this.orgNs, key, list);
    }
    return list;
  }

  async getPropertiesByOwner(ownerId: string): Promise<Property[]> {
    this.logger.info('Fetching properties by owner', { ownerId });
    const key = this.cacheKey(this.ownerNs, ownerId);
    let list = await this.propertyCache.getFromCache(this.ownerNs, key) as Property[] | null;
    if (!list) {
      list = await propertyRepository.getPropertiesByOwnerId(ownerId);
      await this.propertyCache.setToCache(this.ownerNs, key, list);
    }
    return list;
  }

  /**
   * Get properties owned by any of the given organizations
   */
  async getPropertiesByOrganizationIds(organizationIds: string[]): Promise<Property[]> {
    this.logger.info('Fetching properties by organizations', { organizationIds });
    return propertyRepository.getPropertiesOwnedByOrganizations(organizationIds);
  }

  async getListedProperties(): Promise<Property[]> {
    this.logger.info('Fetching listed properties');
    let list = await this.propertyCache.getFromCache('listed', this.listedKey) as Property[] | null;
    if (!list) {
      list = await propertyRepository.getListedProperties();
      await this.propertyCache.setToCache('listed', this.listedKey, list);
    }
    return list;
  }

  async findByConfigKeyValue(key: string, value: any): Promise<Property[]> {
    this.logger.info('Finding properties by config key/value', { key, value });
    return propertyRepository.findByConfigKeyValue(key, value);
  }
}

export default new PropertyService();

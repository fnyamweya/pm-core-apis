import { PropertyStaffEntity } from '../../entities/properties/propertyStaffEntity';
import propertyStaffRepository from '../../repositories/properties/propertyStaffRepository';
import { logger } from '../../utils/logger';
import RedisCache from '../../utils/redisCache';
import { BaseService } from '../baseService';

interface CreateStaffDTO {
  propertyId: string;
  userId: string;
  role?: string;
  status?: string;
}

interface UpdateStaffDTO {
  role?: string;
  status?: string;
}

/**
 * PropertyStaffService provides CRUD operations and caching
 * for PropertyStaffEntity via BaseService.
 */
class PropertyStaffService extends BaseService<PropertyStaffEntity> {
  private listCache = new RedisCache<PropertyStaffEntity[]>(3600);

  constructor() {
    super(
      {
        repository: propertyStaffRepository,
        redisCache: new RedisCache<PropertyStaffEntity>(3600),
        logger,
      },
      'propertyStaff'
    );
    this.logger.info('PropertyStaffService initialized');
  }

  private listCacheKey(prefix: string, id: string): string {
    return `${prefix}:${id}`;
  }

  /**
   * Create a new staff assignment.
   */
  async createStaff(data: CreateStaffDTO): Promise<PropertyStaffEntity> {
    this.logger.info('Creating property staff', { data });
    const staff = await this.repository.create({
      property: { id: data.propertyId } as any,
      user:     { id: data.userId }     as any,
      // spread any additional fields from data here
    });

    // Invalidate cached lists
    await this.listCache.deleteKey('staffByProperty', data.propertyId);
    await this.listCache.deleteKey('staffByUser', data.userId);

    return staff;
  }

  /**
   * Update an existing staff assignment.
   */
  async updateStaff(
    staffId: string,
    data: UpdateStaffDTO
  ): Promise<PropertyStaffEntity> {
    this.logger.info('Updating property staff', { staffId, data });
    await this.repository.update(staffId, data as any);
    const updated = await this.getById(staffId);

    // Invalidate cached lists for this staff's property & user
    await this.listCache.deleteKey('staffByProperty', updated.property.id);
    await this.listCache.deleteKey('staffByUser', updated.user.id);

    return updated;
  }

  /**
   * Delete a staff assignment.
   */
  async deleteStaff(staffId: string): Promise<void> {
    this.logger.info('Deleting property staff', { staffId });
    const existing = await this.getById(staffId);
    await this.repository.delete(staffId);

    await this.listCache.deleteKey('staffByProperty', existing.property.id);
    await this.listCache.deleteKey('staffByUser', existing.user.id);
  }

  /**
   * Get all staff for a given property, with caching.
   */
  async getStaffByProperty(propertyId: string): Promise<PropertyStaffEntity[]> {
    this.logger.info('Fetching staff by property', { propertyId });
    const key = this.listCacheKey('staffByProperty', propertyId);
    let list = (await this.listCache.getFromCache(
      'staffByProperty',
      key
    )) as PropertyStaffEntity[] | null;

    if (!list) {
      list = await propertyStaffRepository.getStaffByPropertyId(propertyId);
      await this.listCache.setToCache('staffByProperty', key, list);
    }
    return list;
  }

  /**
   * Get all staff assignments for a given user.
   */
  async getStaffByUser(userId: string): Promise<PropertyStaffEntity[]> {
    this.logger.info('Fetching staff by user', { userId });
    const key = this.listCacheKey('staffByUser', userId);
    let list = (await this.listCache.getFromCache(
      'staffByUser',
      key
    )) as PropertyStaffEntity[] | null;

    if (!list) {
      list = await propertyStaffRepository.getStaffByUserId(userId);
      await this.listCache.setToCache('staffByUser', key, list);
    }
    return list;
  }
}

export default new PropertyStaffService();

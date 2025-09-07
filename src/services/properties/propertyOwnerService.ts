import { PropertyOwnerEntity, OwnerRole } from '../../entities/properties/propertyOwnerEntity';
import propertyOwnerRepository from '../../repositories/properties/propertyOwnerRepository';
import { logger } from '../../utils/logger';
import RedisCache from '../../utils/redisCache';
import { BaseService } from '../baseService';

interface CreateOwnerDTO {
  propertyId: string;
  userId?: string;
  organizationId?: string;
  role: OwnerRole;
}

interface UpdateOwnerDTO {
  role?: OwnerRole;
}

class PropertyOwnerService extends BaseService<PropertyOwnerEntity> {
  private ownerCache: RedisCache<PropertyOwnerEntity>;

  constructor() {
    super(
      {
        repository: propertyOwnerRepository,
        redisCache: new RedisCache<PropertyOwnerEntity>(3600),
        logger,
      },
      'owner',
    );
    this.ownerCache = new RedisCache<PropertyOwnerEntity>(3600);
    this.logger.info('PropertyOwnerService initialized');
  }

  private async cacheOwner(owner: PropertyOwnerEntity): Promise<void> {
    await this.ownerCache.setToCache('owner', owner.id, owner);
    this.logger.info('Property owner cached', { ownerId: owner.id });
  }

  private async invalidateOwnerCache(ownerId: string): Promise<void> {
    await this.ownerCache.deleteKey('owner', ownerId);
    this.logger.info('Property owner cache invalidated', { ownerId });
  }

  async createOwner(data: CreateOwnerDTO): Promise<PropertyOwnerEntity> {
    this.logger.info('Creating property owner', { data });
    const owner = await this.repository.create({
      property:     { id: data.propertyId }       as any,
      user:         data.userId
                        ? ({ id: data.userId } as any)
                        : undefined,
      organization: data.organizationId
                        ? ({ id: data.organizationId } as any)
                        : undefined,
      role:         data.role,
    });
    await this.cacheOwner(owner);
    return owner;
  }

  async updateOwner(
    ownerId: string,
    data: UpdateOwnerDTO
  ): Promise<PropertyOwnerEntity> {
    this.logger.info('Updating property owner', { ownerId, data });
    await this.repository.update(ownerId, data as any);
    const updated = await this.getById(ownerId);
    await this.invalidateOwnerCache(ownerId);
    await this.cacheOwner(updated);
    return updated;
  }

  async deleteOwner(ownerId: string): Promise<void> {
    this.logger.info('Deleting property owner', { ownerId });
    await this.repository.delete(ownerId);
    await this.invalidateOwnerCache(ownerId);
  }

  async getOwnersByProperty(
    propertyId: string
  ): Promise<PropertyOwnerEntity[]> {
    this.logger.info('Fetching owners by property', { propertyId });
    return propertyOwnerRepository.getOwnersByPropertyId(propertyId);
  }

  async getOwnerByUser(
    userId: string
  ): Promise<PropertyOwnerEntity | null> {
    this.logger.info('Fetching owner by user', { userId });
    return propertyOwnerRepository.getOwnerByUserId(userId);
  }

  async getLandlordsByRole(
    role: OwnerRole
  ): Promise<PropertyOwnerEntity[]> {
    this.logger.info('Fetching landlords by role', { role });
    return propertyOwnerRepository.getLandlordByOwnerRole(role);
  }
}

export default new PropertyOwnerService();

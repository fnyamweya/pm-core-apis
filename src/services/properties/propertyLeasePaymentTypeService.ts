import { PropertyLeasePaymentType } from '../../entities/properties/propertyLeasePaymentTypeEntity';
import propertyLeasePaymentTypeRepository from '../../repositories/properties/propertyLeasePaymentTypeRepository';
import { logger } from '../../utils/logger';
import RedisCache from '../../utils/redisCache';
import { BaseService } from '../baseService';

interface CreatePaymentTypeDTO {
  code: string;
  name: string;
  description?: string;
}

interface UpdatePaymentTypeDTO {
  name?: string;
  description?: string;
}

class PropertyLeasePaymentTypeService extends BaseService<PropertyLeasePaymentType> {
  private typeCache: RedisCache<PropertyLeasePaymentType>;

  constructor() {
    super(
      {
        repository: propertyLeasePaymentTypeRepository,
        redisCache: new RedisCache<PropertyLeasePaymentType>(3600),
        logger,
      },
      'leasePaymentType',
    );
    this.typeCache = new RedisCache<PropertyLeasePaymentType>(3600);
    this.logger.info('PropertyLeasePaymentTypeService initialized');
  }

  private async cacheType(type: PropertyLeasePaymentType): Promise<void> {
    await this.typeCache.setToCache('leasePaymentType', type.code, type);
    this.logger.info('Payment type cached', { code: type.code });
  }

  private async invalidateTypeCache(code: string): Promise<void> {
    await this.typeCache.deleteKey('leasePaymentType', code);
    this.logger.info('Payment type cache invalidated', { code });
  }

  async createPaymentType(
    data: CreatePaymentTypeDTO
  ): Promise<PropertyLeasePaymentType> {
    this.logger.info('Creating payment type', { data });
    const type = await this.repository.create({
      code: data.code,
      name: data.name,
      description: data.description,
    });
    await this.cacheType(type);
    return type;
  }

  async updatePaymentType(
    code: string,
    data: UpdatePaymentTypeDTO
  ): Promise<PropertyLeasePaymentType | null> {
    this.logger.info('Updating payment type', { code, data });
    const existing = await propertyLeasePaymentTypeRepository.getPaymentTypeByCode(code);
    if (!existing) return null;

    await this.repository.update(existing.id, data as any);
    const updated = await this.getById(existing.id);
    await this.invalidateTypeCache(code);
    await this.cacheType(updated);
    return updated;
  }

  async deletePaymentType(code: string): Promise<void> {
    this.logger.info('Deleting payment type', { code });
    const existing = await propertyLeasePaymentTypeRepository.getPaymentTypeByCode(code);
    if (existing) {
      await this.repository.delete(existing.id);
      await this.invalidateTypeCache(code);
    }
  }

  async getAllPaymentTypes(): Promise<PropertyLeasePaymentType[]> {
    this.logger.info('Fetching all payment types');
    return propertyLeasePaymentTypeRepository.getAllPaymentTypes();
  }

  async getPaymentTypeByCode(
    code: string
  ): Promise<PropertyLeasePaymentType | null> {
    this.logger.info('Fetching payment type by code', { code });
    let type = (await this.typeCache.getFromCache(
      'leasePaymentType',
      code
    )) as PropertyLeasePaymentType | null;
    if (!type) {
      type = await propertyLeasePaymentTypeRepository.getPaymentTypeByCode(code);
      if (type) {
        await this.cacheType(type);
      }
    }
    return type;
  }

  async searchPaymentTypes(
    query: string,
    limit = 20
  ): Promise<PropertyLeasePaymentType[]> {
    this.logger.info('Searching payment types', { query, limit });
    return propertyLeasePaymentTypeRepository.searchPaymentTypes(query, limit);
  }
}

export default new PropertyLeasePaymentTypeService();

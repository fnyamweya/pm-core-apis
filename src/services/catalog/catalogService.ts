import { Catalog } from '../../entities/catalog/catalogEntity';
import catalogRepository from '../../repositories/catalog/catalogRepository';
import { logger } from '../../utils/logger';
import RedisCache from '../../utils/redisCache';
import { BaseService } from '../baseService';

interface CreateCatalogDTO {
  catalogCode: string;
  name: string;
  description?: string;
  basePrice?: number;
  metadata?: Record<string, any>;
}

interface UpdateCatalogDTO {
  name?: string;
  description?: string;
  basePrice?: number;
  metadata?: Record<string, any>;
}

class CatalogService extends BaseService<Catalog> {
  private catalogCache: RedisCache<Catalog>;

  constructor() {
    super(
      {
        repository: catalogRepository,
        redisCache: new RedisCache<Catalog>(3600), // 1-hour TTL for catalog cache
        logger,
      },
      'catalog'
    );

    this.catalogCache = new RedisCache<Catalog>(3600);
    this.logger.info('CatalogService initialized');
  }

  async createCatalogItem(data: CreateCatalogDTO): Promise<Catalog> {
    this.logger.info('Creating a new catalog item', { data });
    const catalogItem = await this.repository.create(data);
    await this.cacheCatalogItem(catalogItem);
    return catalogItem;
  }

  async getCatalogByCode(catalogCode: string): Promise<Catalog | null> {
    this.logger.info('Fetching catalog item by code', { catalogCode });

    let catalogItem = await this.catalogCache.getFromCache(
      'catalog',
      catalogCode
    );
    if (!catalogItem) {
      catalogItem = await catalogRepository.getCatalogByCode(catalogCode);
      if (catalogItem) {
        await this.cacheCatalogItem(catalogItem);
      }
    } else {
      this.logger.info('Catalog item found in cache', { catalogCode });
    }

    // Ensure catalogItem is of type Catalog before returning
    return typeof catalogItem === 'string' ? null : catalogItem;
  }

  async updateCatalogByCode(
    catalogCode: string,
    data: UpdateCatalogDTO
  ): Promise<Catalog | null> {
    this.logger.info('Updating catalog item by code', { catalogCode, data });
    const catalogItem = await catalogRepository.updateCatalogByCode(
      catalogCode,
      data
    );
    if (catalogItem) {
      await this.cacheCatalogItem(catalogItem);
    }
    return catalogItem;
  }

  async deleteCatalogByCode(catalogCode: string): Promise<void> {
    this.logger.info('Deleting catalog item by code', { catalogCode });
    await catalogRepository.deleteCatalogByCode(catalogCode);
    await this.invalidateCache(catalogCode);
  }

  /**
   * Updates metadata for a specific catalog item by catalog code.
   * Invalidates the cache for the catalog item after updating.
   *
   * @param catalogCode - The unique code of the catalog item.
   * @param metadata - The new metadata object to update.
   * @returns {Promise<void>}
   */
  async updateMetadataByCode(
    catalogCode: string,
    metadata: Record<string, any>
  ): Promise<void> {
    this.logger.info('Updating metadata for catalog item by code', {
      catalogCode,
    });

    await catalogRepository.updateMetadataByCode(catalogCode, metadata);
    await this.invalidateCache(catalogCode); // Invalidate cache after metadata update
  }

  private async cacheCatalogItem(catalogItem: Catalog): Promise<void> {
    await this.catalogCache.setToCache(
      'catalog',
      catalogItem.catalogCode,
      catalogItem
    );
    this.logger.info('Catalog item cached', {
      catalogCode: catalogItem.catalogCode,
    });
  }

  private async invalidateCache(catalogCode: string): Promise<void> {
    await this.catalogCache.deleteKey('catalog', catalogCode);
    this.logger.info('Catalog cache invalidated', { catalogCode });
  }
}

export default new CatalogService();

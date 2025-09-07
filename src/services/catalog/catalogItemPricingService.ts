import { DeepPartial } from 'typeorm';
import { CatalogItemPricing } from '../../entities/catalog/catalogItemPricingEntity';
import catalogItemPricingRepository from '../../repositories/catalog/catalogItemPricingRepository';
import { logger } from '../../utils/logger';
import RedisCache from '../../utils/redisCache';
import { BaseService } from '../baseService';

interface CreateCatalogItemPricingDTO {
  catalogItemId: string;
  pricingRuleId: string;
}

interface UpdateCatalogItemPricingDTO {}

class CatalogItemPricingService extends BaseService<CatalogItemPricing> {
  // Separate caches for single items and arrays of items
  private singlePricingCache: RedisCache<CatalogItemPricing>;
  private pricingArrayCache: RedisCache<CatalogItemPricing[]>;

  constructor() {
    super(
      {
        repository: catalogItemPricingRepository,
        redisCache: new RedisCache<CatalogItemPricing>(3600),
        logger,
      },
      'catalogItemPricing'
    );

    this.singlePricingCache = new RedisCache<CatalogItemPricing>(3600);
    this.pricingArrayCache = new RedisCache<CatalogItemPricing[]>(3600);
    this.logger.info('CatalogItemPricingService initialized');
  }

  /**
   * Creates a new pricing entry for a catalog item.
   * @param data - Data for the new CatalogItemPricing entry.
   * @returns The created CatalogItemPricing entity.
   */
  async createCatalogItemPricing(
    data: CreateCatalogItemPricingDTO
  ): Promise<CatalogItemPricing> {
    this.logger.info('Creating new catalog item pricing', { data });

    const pricingData: DeepPartial<CatalogItemPricing> = {
      catalogItem: { id: data.catalogItemId },
      pricingRule: { id: data.pricingRuleId },
    };

    const pricing =
      await catalogItemPricingRepository.createCatalogItemPricing(pricingData);

    // Cache the created pricing entry by catalog item ID
    await this.cachePricingByCatalogItemId(data.catalogItemId);

    return pricing;
  }

  /**
   * Retrieves pricing records by catalog item ID, using cache if available.
   * @param catalogItemId - The ID of the catalog item.
   * @returns Array of CatalogItemPricing entities.
   */
  async getPricingByCatalogItemId(
    catalogItemId: string
  ): Promise<CatalogItemPricing[]> {
    this.logger.info('Fetching pricing for catalog item by ID', {
      catalogItemId,
    });

    // Use the pricingArrayCache to store arrays of CatalogItemPricing
    let pricing = await this.pricingArrayCache.getFromCache(
      'catalogItemPricing',
      catalogItemId
    );

    if (!pricing) {
      pricing =
        (await catalogItemPricingRepository.getPricingByCatalogItemId(
          catalogItemId
        )) || [];
      if (pricing.length > 0) {
        await this.pricingArrayCache.setToCache(
          'catalogItemPricing',
          catalogItemId,
          pricing
        );
      }
    } else {
      this.logger.info('Catalog item pricing found in cache', {
        catalogItemId,
      });
    }

    if (!Array.isArray(pricing)) {
      pricing = []; // Ensure pricing is an array
    }
    return pricing;
  }

  /**
   * Updates pricing records for a catalog item.
   * @param catalogItemId - The ID of the catalog item.
   * @param data - Partial data to update the CatalogItemPricing with.
   */
  async updatePricingByCatalogItemId(
    catalogItemId: string,
    data: UpdateCatalogItemPricingDTO
  ): Promise<void> {
    this.logger.info('Updating pricing for catalog item by ID', {
      catalogItemId,
      data,
    });

    const updateData: DeepPartial<CatalogItemPricing> = { ...data };

    await catalogItemPricingRepository.updatePricingByCatalogItemId(
      catalogItemId,
      updateData
    );
    await this.cachePricingByCatalogItemId(catalogItemId);
  }

  /**
   * Deletes pricing records associated with a catalog item ID.
   * @param catalogItemId - The ID of the catalog item.
   */
  async deletePricingByCatalogItemId(catalogItemId: string): Promise<void> {
    this.logger.info('Deleting pricing for catalog item by ID', {
      catalogItemId,
    });

    await catalogItemPricingRepository.deletePricingByCatalogItemId(
      catalogItemId
    );
    await this.pricingArrayCache.deleteKey('catalogItemPricing', catalogItemId);
  }

  /**
   * Retrieves pricing records by a specific pricing rule ID.
   * @param pricingRuleId - The ID of the pricing rule.
   * @returns Array of CatalogItemPricing entities.
   */
  async getPricingByRuleId(
    pricingRuleId: string
  ): Promise<CatalogItemPricing[]> {
    this.logger.info('Fetching pricing for catalog items by rule ID', {
      pricingRuleId,
    });

    return await catalogItemPricingRepository.getPricingByRuleId(pricingRuleId);
  }

  /**
   * Caches pricing records by catalog item ID.
   * @param catalogItemId - The ID of the catalog item.
   */
  private async cachePricingByCatalogItemId(
    catalogItemId: string
  ): Promise<void> {
    const pricing = await this.getPricingByCatalogItemId(catalogItemId);
    await this.pricingArrayCache.setToCache(
      'catalogItemPricing',
      catalogItemId,
      pricing
    );
    this.logger.info('Catalog item pricing cached by catalog item ID', {
      catalogItemId,
    });
  }
}

export default new CatalogItemPricingService();

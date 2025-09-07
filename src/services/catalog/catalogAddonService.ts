import { DeepPartial } from 'typeorm';
import { Catalog, CatalogAddon } from '../../entities/catalog';
import catalogAddonRepository from '../../repositories/catalog/catalogAddonRepository';
import { logger } from '../../utils/logger';
import RedisCache from '../../utils/redisCache';
import { BaseService } from '../baseService';

interface CreateCatalogAddonDTO {
  catalogId: string;
  isActive?: boolean;
  notes?: string;
  addonCatalogIds?: string[];
}

interface UpdateCatalogAddonDTO {
  isActive?: boolean;
  notes?: string;
}

class CatalogAddonService extends BaseService<CatalogAddon> {
  constructor() {
    super(
      {
        repository: catalogAddonRepository,
        redisCache: new RedisCache<CatalogAddon>(3600), // Cache each CatalogAddon individually
        logger,
      },
      'catalogAddon'
    );

    this.logger.info('CatalogAddonService initialized');
  }

  /**
   * Creates a new catalog addon.
   * @param data - Data for the new CatalogAddon.
   * @returns The created CatalogAddon entity.
   */
  async createCatalogAddon(data: CreateCatalogAddonDTO): Promise<CatalogAddon> {
    this.logger.info('Creating new catalog addon', { data });

    const addonData: DeepPartial<CatalogAddon> = {
      catalog: { id: data.catalogId },
      isActive: data.isActive,
      notes: data.notes,
    };

    const addon = await catalogAddonRepository.createCatalogAddon(addonData);

    if (data.addonCatalogIds && data.addonCatalogIds.length > 0) {
      const addonCatalogs = await Promise.all(
        data.addonCatalogIds.map(async (id) => ({ id }) as Catalog)
      );
      addon.addons = addonCatalogs;
      await catalogAddonRepository.save(addon);
    }

    await this.cacheAddonById(addon.id); // Cache the newly created addon by ID
    return addon;
  }

  /**
   * Retrieves a catalog addon by its ID, using cache if available.
   * @param addonId - The ID of the CatalogAddon.
   * @returns The CatalogAddon entity.
   */
  async getCatalogAddonById(addonId: string): Promise<CatalogAddon | null> {
    this.logger.info('Fetching catalog addon by ID', { addonId });

    let addon = await this.cache.getFromCache(this.entityName, addonId);
    if (typeof addon !== 'object' || addon === null) {
      addon = await catalogAddonRepository.findById(addonId);
      if (addon) {
        await this.cacheAddonById(addonId); // Cache the addon if found
      }
    }

    return addon;
  }

  /**
   * Updates notes or status of a catalog addon by addon ID.
   * @param addonId - The ID of the CatalogAddon.
   * @param data - Partial data to update the addon with.
   * @returns The updated CatalogAddon entity.
   */
  async updateCatalogAddonById(
    addonId: string,
    data: UpdateCatalogAddonDTO
  ): Promise<CatalogAddon | null> {
    this.logger.info('Updating catalog addon by ID', { addonId, data });

    const updatedAddon = await catalogAddonRepository.updateCatalogAddonById(
      addonId,
      data
    );

    if (updatedAddon) {
      await this.cacheAddonById(addonId); // Update cache for the modified addon
    }
    return updatedAddon;
  }

  /**
   * Adds a catalog item as an addon to a primary catalog item.
   * @param addonId - The ID of the CatalogAddon.
   * @param addonCatalog - The Catalog entity to add as an addon.
   */
  async addAddonToCatalog(
    addonId: string,
    addonCatalog: Catalog
  ): Promise<void> {
    this.logger.info('Adding addon to catalog', { addonId, addonCatalog });

    await catalogAddonRepository.addAddonToCatalog(addonId, addonCatalog);
    await this.cacheAddonById(addonId); // Update cache for the modified addon
  }

  /**
   * Removes a catalog item from the addons list of a primary catalog item.
   * @param addonId - The ID of the CatalogAddon.
   * @param addonCatalogId - The ID of the Catalog entity to remove from addons.
   */
  async removeAddonFromCatalog(
    addonId: string,
    addonCatalogId: string
  ): Promise<void> {
    this.logger.info('Removing addon from catalog', {
      addonId,
      addonCatalogId,
    });

    await catalogAddonRepository.removeAddonFromCatalog(
      addonId,
      addonCatalogId
    );
    await this.cacheAddonById(addonId); // Update cache for the modified addon
  }

  /**
   * Deletes a catalog addon by its ID.
   * @param addonId - The ID of the CatalogAddon to delete.
   */
  async deleteCatalogAddonById(addonId: string): Promise<void> {
    this.logger.info('Deleting catalog addon by ID', { addonId });

    const addon = await catalogAddonRepository.findById(addonId);
    if (addon) {
      await catalogAddonRepository.deleteCatalogAddonById(addonId);
      await this.cache.deleteKey(this.entityName, addonId); // Remove the addon from cache
    }
  }

  /**
   * Caches a single catalog addon by its ID.
   * @param addonId - The ID of the catalog addon.
   */
  private async cacheAddonById(addonId: string): Promise<void> {
    const addon = await catalogAddonRepository.findById(addonId);
    if (addon) {
      await this.cache.setToCache(this.entityName, addonId, addon);
      this.logger.info('Catalog addon cached by ID', { addonId });
    }
  }
}

export default new CatalogAddonService();

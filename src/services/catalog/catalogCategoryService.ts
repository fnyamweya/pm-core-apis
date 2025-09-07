import { CategoryType } from '../../constants/catalog';
import { Catalog, CatalogCategory } from '../../entities/catalog';
import catalogCategoryRepository from '../../repositories/catalog/catalogCategoryRepository';
import { logger } from '../../utils/logger';
import RedisCache from '../../utils/redisCache';
import { BaseService } from '../baseService';

interface CreateCategoryDTO {
  name: string;
  type: CategoryType;
}

interface UpdateCategoryDTO {
  name?: string;
  type?: CategoryType;
}

class CatalogCategoryService extends BaseService<CatalogCategory> {
  private categoryCache: RedisCache<CatalogCategory>;
  private categoriesByTypeCache: RedisCache<CatalogCategory[]>;

  constructor() {
    super(
      {
        repository: catalogCategoryRepository,
        redisCache: new RedisCache<CatalogCategory>(3600),
        logger,
      },
      'catalogCategory'
    );

    this.categoryCache = new RedisCache<CatalogCategory>(3600);
    this.categoriesByTypeCache = new RedisCache<CatalogCategory[]>(3600);
    this.logger.info('CatalogCategoryService initialized');
  }

  async createCategory(data: CreateCategoryDTO): Promise<CatalogCategory> {
    this.logger.info('Creating new catalog category', { data });

    const category = await catalogCategoryRepository.createCategory(data);
    await this.cacheCategory(category);

    return category;
  }

  async getCategoryByName(name: string): Promise<CatalogCategory | null> {
    this.logger.info('Fetching catalog category by name', { name });

    let category = await this.categoryCache.getFromCache(
      'catalogCategory',
      name
    );
    if (!category) {
      category = await catalogCategoryRepository.getCategoryByName(name);
      if (category) {
        await this.cacheCategory(category);
      }
    } else {
      this.logger.info('Catalog category found in cache by name', { name });
    }

    if (typeof category === 'string') {
      this.logger.error('Unexpected string type for category', { category });
      return null;
    }
    return category;
  }

  async getCategoriesByType(type: CategoryType): Promise<CatalogCategory[]> {
    this.logger.info('Fetching catalog categories by type', { type });

    let categories = await this.categoriesByTypeCache.getFromCache(
      'catalogCategoriesType',
      type
    );
    if (!categories) {
      categories =
        (await catalogCategoryRepository.getCategoriesByType(type)) || [];
      if (categories.length > 0) {
        await this.categoriesByTypeCache.setToCache(
          'catalogCategoriesType',
          type,
          categories
        );
      }
    } else {
      this.logger.info('Catalog categories found in cache by type', { type });
    }

    return Array.isArray(categories) ? categories : [];
  }

  async updateCategoryByName(
    name: string,
    data: UpdateCategoryDTO
  ): Promise<CatalogCategory | null> {
    this.logger.info('Updating catalog category by name', { name, data });

    const category = await catalogCategoryRepository.updateCategoryByName(
      name,
      data
    );
    if (category) {
      await this.invalidateCache(category);
      await this.cacheCategory(category);
    }

    return category;
  }

  async addCatalogToCategory(
    categoryId: string,
    catalog: Catalog
  ): Promise<void> {
    this.logger.info('Adding catalog to category', { categoryId, catalog });

    await catalogCategoryRepository.addCatalogToCategory(categoryId, catalog);
    await this.invalidateCacheByCategoryId(categoryId);
  }

  async removeCatalogFromCategory(
    categoryId: string,
    catalogId: string
  ): Promise<void> {
    this.logger.info('Removing catalog from category', {
      categoryId,
      catalogId,
    });

    await catalogCategoryRepository.removeCatalogFromCategory(
      categoryId,
      catalogId
    );
    await this.invalidateCacheByCategoryId(categoryId);
  }

  async deleteCategoryByName(name: string): Promise<void> {
    this.logger.info('Deleting catalog category by name', { name });

    const category = await this.getCategoryByName(name);
    if (category) {
      await this.invalidateCache(category);
      await catalogCategoryRepository.deleteCategoryByName(name);
    }
  }

  private async cacheCategory(category: CatalogCategory): Promise<void> {
    await this.categoryCache.setToCache(
      'catalogCategory',
      category.name,
      category
    );
    if (category.type) {
      await this.categoriesByTypeCache.deleteKey(
        'catalogCategoriesType',
        category.type
      );
    }
    this.logger.info('Catalog category cached', {
      categoryName: category.name,
    });
  }

  private async invalidateCache(category: CatalogCategory): Promise<void> {
    await this.categoryCache.deleteKey('catalogCategory', category.name);
    if (category.type) {
      await this.categoriesByTypeCache.deleteKey(
        'catalogCategoriesType',
        category.type
      );
    }
    this.logger.info('Catalog category cache invalidated', {
      categoryName: category.name,
    });
  }

  private async invalidateCacheByCategoryId(categoryId: string): Promise<void> {
    const category = await catalogCategoryRepository.findById(categoryId);
    if (category) await this.invalidateCache(category);
  }
}

export default new CatalogCategoryService();

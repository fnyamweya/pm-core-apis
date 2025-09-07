import { DeepPartial } from 'typeorm';
import { Catalog } from '../../entities/catalog';
import BaseRepository from '../baseRepository';

class CatalogRepository extends BaseRepository<Catalog> {
  constructor() {
    super(Catalog);
  }

  /**
   * Creates a new catalog item.
   * @param catalogData - Data for the new Catalog item.
   * @returns The created Catalog entity.
   */
  async createCatalogItem(catalogData: DeepPartial<Catalog>): Promise<Catalog> {
    try {
      return await this.create(catalogData);
    } catch (error) {
      this.handleError(error, 'Error creating new Catalog item');
    }
  }

  /**
   * Retrieves a catalog item by its catalog code.
   * @param catalogCode - The code of the catalog item.
   * @returns The Catalog entity or null if not found.
   */
  async getCatalogByCode(catalogCode: string): Promise<Catalog | null> {
    try {
      return await this.findOne({
        where: { catalogCode },
        relations: [
          'categories',
          'pricingTiers',
          'pricingRules',
          'catalogItemPricing',
        ],
      });
    } catch (error) {
      this.handleError(
        error,
        `Error finding Catalog with code: ${catalogCode}`
      );
    }
  }

  /**
   * Updates a catalog item by its catalog code.
   * @param catalogCode - The catalog code of the item.
   * @param updateData - Partial data to update the catalog item.
   * @returns The updated Catalog entity.
   */
  async updateCatalogByCode(
    catalogCode: string,
    updateData: DeepPartial<Catalog>
  ): Promise<Catalog | null> {
    try {
      const catalog = await this.getCatalogByCode(catalogCode);
      if (!catalog) {
        throw new Error(`Catalog item not found with code: ${catalogCode}`);
      }
      await this.update(catalog.id, updateData);
      return this.findById(catalog.id);
    } catch (error) {
      this.handleError(
        error,
        `Error updating Catalog with code: ${catalogCode}`
      );
    }
  }

  /**
   * Retrieves all catalog items in a specific category.
   * @param categoryId - The ID of the category.
   * @returns Array of Catalog entities in the specified category.
   */
  async getCatalogItemsByCategory(categoryId: string): Promise<Catalog[]> {
    try {
      return await this.find({
        where: { categories: { id: categoryId } },
        relations: [
          'categories',
          'pricingTiers',
          'pricingRules',
          'catalogItemPricing',
        ],
      });
    } catch (error) {
      this.handleError(
        error,
        `Error retrieving Catalog items by category ID: ${categoryId}`
      );
    }
  }

  /**
   * Updates specific fields of a catalog item by catalog code.
   * @param catalogCode - The code of the catalog item.
   * @param fieldsToUpdate - Fields to update in the catalog item.
   */
  private async updateFieldsByCode(
    catalogCode: string,
    fieldsToUpdate: DeepPartial<Catalog>
  ): Promise<void> {
    const catalog = await this.getCatalogByCode(catalogCode);
    if (!catalog) {
      throw new Error(`Catalog item not found with code: ${catalogCode}`);
    }
    await this.update(catalog.id, fieldsToUpdate);
  }

  /**
   * Updates base price for a catalog item by catalog code.
   * @param catalogCode - The code of the catalog item.
   * @param basePrice - The new base price.
   */
  async updateBasePriceByCode(
    catalogCode: string,
    basePrice: number
  ): Promise<void> {
    try {
      await this.updateFieldsByCode(catalogCode, { basePrice });
    } catch (error) {
      this.handleError(
        error,
        `Error updating base price for Catalog with code: ${catalogCode}`
      );
    }
  }

  /**
   * Updates metadata for a catalog item by catalog code.
   * @param catalogCode - The code of the catalog item.
   * @param metadata - Metadata to update for the catalog item.
   */
  async updateMetadataByCode(
    catalogCode: string,
    metadata: Record<string, any>
  ): Promise<void> {
    try {
      await this.updateFieldsByCode(catalogCode, { metadata });
    } catch (error) {
      this.handleError(
        error,
        `Error updating metadata for Catalog with code: ${catalogCode}`
      );
    }
  }

  /**
   * Deletes a catalog item by its catalog code.
   * @param catalogCode - The code of the catalog item to delete.
   */
  async deleteCatalogByCode(catalogCode: string): Promise<void> {
    try {
      const catalog = await this.getCatalogByCode(catalogCode);
      if (!catalog) {
        throw new Error(`Catalog item not found with code: ${catalogCode}`);
      }
      await this.delete(catalog.id);
    } catch (error) {
      this.handleError(
        error,
        `Error deleting Catalog with code: ${catalogCode}`
      );
    }
  }
}

const catalogRepository = new CatalogRepository();
export { CatalogRepository, catalogRepository as default };

import { DeepPartial } from 'typeorm';
import { CategoryType } from '../../constants/catalog';
import { Catalog, CatalogCategory } from '../../entities/catalog';
import BaseRepository from '../baseRepository';

class CatalogCategoryRepository extends BaseRepository<CatalogCategory> {
  constructor() {
    super(CatalogCategory);
  }

  /**
   * Creates a new CatalogCategory.
   * @param categoryData - Data for the new CatalogCategory.
   * @returns The created CatalogCategory entity.
   */
  async createCategory(
    categoryData: DeepPartial<CatalogCategory>
  ): Promise<CatalogCategory> {
    try {
      return await this.create(categoryData);
    } catch (error) {
      this.handleError(error, 'Error creating new CatalogCategory');
    }
  }

  /**
   * Retrieves a CatalogCategory by name.
   * @param name - The name of the CatalogCategory.
   * @returns The CatalogCategory entity or null if not found.
   */
  async getCategoryByName(name: string): Promise<CatalogCategory | null> {
    try {
      return await this.findOne({
        where: { name },
        relations: ['catalogs'],
      });
    } catch (error) {
      this.handleError(
        error,
        `Error finding CatalogCategory with name: ${name}`
      );
    }
  }

  /**
   * Retrieves all categories of a specific type.
   * @param type - The type of the categories (e.g., service, product, any).
   * @returns Array of CatalogCategory entities.
   */
  async getCategoriesByType(type: CategoryType): Promise<CatalogCategory[]> {
    try {
      return await this.find({
        where: { type },
        relations: ['catalogs'],
      });
    } catch (error) {
      this.handleError(
        error,
        `Error retrieving CatalogCategories of type: ${type}`
      );
    }
  }

  /**
   * Updates a CatalogCategory by name.
   * @param name - The name of the CatalogCategory.
   * @param updateData - Partial data to update the CatalogCategory with.
   * @returns The updated CatalogCategory entity.
   */
  async updateCategoryByName(
    name: string,
    updateData: DeepPartial<CatalogCategory>
  ): Promise<CatalogCategory | null> {
    try {
      const category = await this.ensureCategoryExistsByName(name);
      await this.update(category.id, updateData);
      return this.findById(category.id);
    } catch (error) {
      this.handleError(
        error,
        `Error updating CatalogCategory with name: ${name}`
      );
    }
  }

  /**
   * Adds a catalog item to a category.
   * @param categoryId - The ID of the CatalogCategory.
   * @param catalog - The Catalog entity to add to the category.
   */
  async addCatalogToCategory(
    categoryId: string,
    catalog: Catalog
  ): Promise<void> {
    try {
      const category = await this.ensureCategoryExistsById(categoryId, [
        'catalogs',
      ]);
      category.catalogs.push(catalog);
      await this.save(category);
    } catch (error) {
      this.handleError(
        error,
        `Error adding Catalog to CatalogCategory with ID: ${categoryId}`
      );
    }
  }

  /**
   * Removes a catalog item from a category.
   * @param categoryId - The ID of the CatalogCategory.
   * @param catalogId - The ID of the Catalog entity to remove from the category.
   */
  async removeCatalogFromCategory(
    categoryId: string,
    catalogId: string
  ): Promise<void> {
    try {
      const category = await this.ensureCategoryExistsById(categoryId, [
        'catalogs',
      ]);
      category.catalogs = category.catalogs.filter(
        (catalog) => catalog.id !== catalogId
      );
      await this.save(category);
    } catch (error) {
      this.handleError(
        error,
        `Error removing Catalog from CatalogCategory with ID: ${categoryId}`
      );
    }
  }

  /**
   * Deletes a CatalogCategory by name.
   * @param name - The name of the CatalogCategory to delete.
   */
  async deleteCategoryByName(name: string): Promise<void> {
    try {
      const category = await this.ensureCategoryExistsByName(name);
      await this.delete(category.id);
    } catch (error) {
      this.handleError(
        error,
        `Error deleting CatalogCategory with name: ${name}`
      );
    }
  }

  /**
   * Ensures a CatalogCategory exists by name and throws an error if not found.
   * @param name - The name of the CatalogCategory.
   * @returns The existing CatalogCategory entity.
   */
  private async ensureCategoryExistsByName(
    name: string
  ): Promise<CatalogCategory> {
    const category = await this.getCategoryByName(name);
    if (!category) {
      throw new Error(`CatalogCategory not found with name: ${name}`);
    }
    return category;
  }

  /**
   * Ensures a CatalogCategory exists by ID and throws an error if not found.
   * @param id - The ID of the CatalogCategory.
   * @param relations - Optional array of relations to include.
   * @returns The existing CatalogCategory entity.
   */
  private async ensureCategoryExistsById(
    id: string,
    relations: string[] = []
  ): Promise<CatalogCategory> {
    const category = await this.findOne({
      where: { id },
      relations,
    });
    if (!category) {
      throw new Error(`CatalogCategory not found with ID: ${id}`);
    }
    return category;
  }
}

const catalogCategoryRepository = new CatalogCategoryRepository();
export { CatalogCategoryRepository, catalogCategoryRepository as default };

import { DeepPartial } from 'typeorm';
import { Catalog, CatalogAddon } from '../../entities/catalog';
import BaseRepository from '../baseRepository';

class CatalogAddonRepository extends BaseRepository<CatalogAddon> {
  constructor() {
    super(CatalogAddon);
  }

  /**
   * Creates a new CatalogAddon.
   * @param addonData - Data for the new CatalogAddon.
   * @returns The created CatalogAddon entity.
   */
  async createCatalogAddon(
    addonData: DeepPartial<CatalogAddon>
  ): Promise<CatalogAddon> {
    try {
      return await this.create(addonData);
    } catch (error) {
      this.handleError(error, 'Error creating new CatalogAddon');
    }
  }

  /**
   * Retrieves all addons for a specific catalog item.
   * @param catalogId - The ID of the primary catalog item.
   * @returns Array of CatalogAddon entities.
   */
  async getAddonsByCatalogId(catalogId: string): Promise<CatalogAddon[]> {
    try {
      return await this.find({
        where: { catalog: { id: catalogId } },
        relations: ['catalog', 'addons'],
      });
    } catch (error) {
      this.handleError(
        error,
        `Error retrieving addons for Catalog with ID: ${catalogId}`
      );
    }
  }

  /**
   * Updates a specific CatalogAddon by ID.
   * @param addonId - The ID of the CatalogAddon.
   * @param updateData - Partial data to update the addon.
   * @returns The updated CatalogAddon entity or null if not found.
   */
  async updateCatalogAddonById(
    addonId: string,
    updateData: DeepPartial<CatalogAddon>
  ): Promise<CatalogAddon | null> {
    try {
      return await this.updateEntityById(addonId, updateData, 'CatalogAddon');
    } catch (error) {
      this.handleError(
        error,
        `Error updating CatalogAddon with ID: ${addonId}`
      );
    }
  }

  /**
   * Adds a catalog item as an add-on to a primary catalog item.
   * @param addonId - The ID of the CatalogAddon.
   * @param addonCatalog - The Catalog entity to add as an add-on.
   */
  async addAddonToCatalog(
    addonId: string,
    addonCatalog: Catalog
  ): Promise<void> {
    try {
      const addon = await this.getEntityWithRelations(
        addonId,
        ['addons'],
        'CatalogAddon'
      );
      addon.addons.push(addonCatalog);
      await this.save(addon);
    } catch (error) {
      this.handleError(
        error,
        `Error adding Catalog as add-on with ID: ${addonId}`
      );
    }
  }

  /**
   * Removes a catalog item from the add-ons list of a primary catalog item.
   * @param addonId - The ID of the CatalogAddon.
   * @param addonCatalogId - The ID of the Catalog entity to remove from add-ons.
   */
  async removeAddonFromCatalog(
    addonId: string,
    addonCatalogId: string
  ): Promise<void> {
    try {
      const addon = await this.getEntityWithRelations(
        addonId,
        ['addons'],
        'CatalogAddon'
      );
      addon.addons = addon.addons.filter(
        (catalog) => catalog.id !== addonCatalogId
      );
      await this.save(addon);
    } catch (error) {
      this.handleError(
        error,
        `Error removing Catalog as add-on from CatalogAddon with ID: ${addonId}`
      );
    }
  }

  /**
   * Deletes a CatalogAddon by ID.
   * @param addonId - The ID of the CatalogAddon to delete.
   */
  async deleteCatalogAddonById(addonId: string): Promise<void> {
    try {
      await this.delete(addonId);
    } catch (error) {
      this.handleError(
        error,
        `Error deleting CatalogAddon with ID: ${addonId}`
      );
    }
  }

  /**
   * Retrieves an entity with its relations.
   * @param entityId - The ID of the entity to retrieve.
   * @param relations - Array of relations to include.
   * @param entityName - Name of the entity for error messages.
   * @returns The entity with the specified relations.
   */
  private async getEntityWithRelations(
    entityId: string,
    relations: string[],
    entityName: string
  ): Promise<CatalogAddon> {
    const entity = await this.findOne({
      where: { id: entityId },
      relations,
    });

    if (!entity) {
      throw new Error(`${entityName} not found with ID: ${entityId}`);
    }

    return entity;
  }

  /**
   * Updates an entity by ID and ensures it exists before updating.
   * @param entityId - The ID of the entity.
   * @param updateData - Partial data to update the entity.
   * @param entityName - Name of the entity for error messages.
   * @returns The updated entity.
   */
  private async updateEntityById<T extends DeepPartial<CatalogAddon>>(
    entityId: string,
    updateData: T,
    entityName: string
  ): Promise<CatalogAddon> {
    try {
      const entity = await this.findById(entityId);
      if (!entity) {
        throw new Error(`${entityName} not found with ID: ${entityId}`);
      }
      await this.update(entityId, updateData);
      const updatedEntity = await this.findById(entityId);

      if (!updatedEntity) {
        throw new Error(
          `Failed to retrieve updated ${entityName} with ID: ${entityId}`
        );
      }

      return updatedEntity;
    } catch (error) {
      this.handleError(
        error,
        `Error updating ${entityName} with ID: ${entityId}`
      );
    }
  }
}

const catalogAddonRepository = new CatalogAddonRepository();
export { CatalogAddonRepository, catalogAddonRepository as default };

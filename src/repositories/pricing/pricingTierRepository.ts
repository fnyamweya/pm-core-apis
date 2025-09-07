import { DeepPartial } from 'typeorm';
import { PricingTier } from '../../entities/pricing/pricingTierEntity';
import BaseRepository from '../baseRepository';

class PricingTierRepository extends BaseRepository<PricingTier> {
  constructor() {
    super(PricingTier);
  }

  /**
   * Ensures a PricingTier exists by its ID or throws an error.
   * @param tierId - The ID of the PricingTier.
   * @returns The PricingTier entity.
   */
  private async ensurePricingTierExistsById(
    tierId: string
  ): Promise<PricingTier> {
    const tier = await this.findById(tierId);
    if (!tier) {
      throw new Error(`PricingTier not found for ID: ${tierId}`);
    }
    return tier;
  }

  /**
   * Creates a new PricingTier for a catalog item.
   * @param tierData - Data for the new PricingTier.
   * @returns The created PricingTier entity.
   */
  async createPricingTier(
    tierData: DeepPartial<PricingTier>
  ): Promise<PricingTier> {
    return await this.create(tierData);
  }

  /**
   * Retrieves all PricingTiers for a specific catalog item by catalog ID.
   * @param catalogId - The ID of the Catalog item.
   * @returns Array of PricingTier entities associated with the specified catalog item.
   */
  async getPricingTiersByCatalogId(catalogId: string): Promise<PricingTier[]> {
    return await this.find({
      where: { catalogItem: { id: catalogId } },
    });
  }

  /**
   * Updates a PricingTier by its ID.
   * @param tierId - The ID of the PricingTier.
   * @param updateData - Partial data to update the PricingTier with.
   * @returns The updated PricingTier entity.
   */
  async updatePricingTierById(
    tierId: string,
    updateData: DeepPartial<PricingTier>
  ): Promise<PricingTier> {
    await this.ensurePricingTierExistsById(tierId);
    await this.update(tierId, updateData);

    const updatedTier = await this.findById(tierId);
    if (!updatedTier) {
      throw new Error(
        `Failed to retrieve updated PricingTier with ID: ${tierId}`
      );
    }
    return updatedTier;
  }

  /**
   * Deletes a PricingTier by its ID.
   * @param tierId - The ID of the PricingTier to delete.
   */
  async deletePricingTierById(tierId: string): Promise<void> {
    await this.ensurePricingTierExistsById(tierId);
    await this.delete(tierId);
  }

  /**
   * Deletes all PricingTiers associated with a specific catalog item by catalog ID.
   * @param catalogId - The ID of the Catalog item.
   */
  async deletePricingTiersByCatalogId(catalogId: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .delete()
      .where('catalogItemId = :catalogId', { catalogId })
      .execute();
  }
}

const pricingTierRepository = new PricingTierRepository();
export { pricingTierRepository as default, PricingTierRepository };

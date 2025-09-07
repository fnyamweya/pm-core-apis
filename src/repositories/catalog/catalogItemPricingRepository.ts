import { DeepPartial } from 'typeorm';
import { CatalogItemPricing } from '../../entities/catalog';
import BaseRepository from '../baseRepository';

class CatalogItemPricingRepository extends BaseRepository<CatalogItemPricing> {
  constructor() {
    super(CatalogItemPricing);
  }

  /**
   * Creates a new CatalogItemPricing record.
   * @param pricingData - Data for the new CatalogItemPricing.
   * @returns The created CatalogItemPricing entity.
   */
  async createCatalogItemPricing(
    pricingData: DeepPartial<CatalogItemPricing>
  ): Promise<CatalogItemPricing> {
    return await this.create(pricingData);
  }

  /**
   * Retrieves CatalogItemPricing records by catalog item ID.
   * @param catalogItemId - The ID of the Catalog item.
   * @param relations - Optional array of relations to include.
   * @returns Array of CatalogItemPricing entities.
   */
  private async getPricingRecordsByCatalogItemId(
    catalogItemId: string,
    relations: string[] = []
  ): Promise<CatalogItemPricing[]> {
    return await this.find({
      where: { catalogItem: { id: catalogItemId } },
      relations,
    });
  }

  /**
   * Updates multiple CatalogItemPricing records.
   * @param records - The records to update.
   * @param updateData - Partial data to update each record with.
   * @returns Array of updated CatalogItemPricing entities.
   */
  private async updateMultiplePricingRecords(
    records: CatalogItemPricing[],
    updateData: DeepPartial<CatalogItemPricing>
  ): Promise<CatalogItemPricing[]> {
    const updatedRecords = await Promise.all(
      records.map((record) =>
        this.update(record.id, updateData).then(() => this.findById(record.id))
      )
    );

    // Filter out null values (if any) from the array
    return updatedRecords.filter(
      (record): record is CatalogItemPricing => record !== null
    );
  }

  /**
   * Retrieves CatalogItemPricing records by catalog item ID.
   * @param catalogItemId - The ID of the Catalog item.
   * @returns Array of CatalogItemPricing entities.
   */
  async getPricingByCatalogItemId(
    catalogItemId: string
  ): Promise<CatalogItemPricing[]> {
    return this.getPricingRecordsByCatalogItemId(catalogItemId, [
      'catalogItem',
      'pricingRule',
    ]);
  }

  /**
   * Updates CatalogItemPricing records by catalog item ID.
   * @param catalogItemId - The ID of the Catalog item.
   * @param updateData - Partial data to update the CatalogItemPricing with.
   * @returns Array of updated CatalogItemPricing entities.
   */
  async updatePricingByCatalogItemId(
    catalogItemId: string,
    updateData: DeepPartial<CatalogItemPricing>
  ): Promise<CatalogItemPricing[]> {
    const pricingRecords =
      await this.getPricingRecordsByCatalogItemId(catalogItemId);
    return this.updateMultiplePricingRecords(pricingRecords, updateData);
  }

  /**
   * Deletes all CatalogItemPricing records associated with a catalog item by ID.
   * @param catalogItemId - The ID of the Catalog item.
   */
  async deletePricingByCatalogItemId(catalogItemId: string): Promise<void> {
    const pricingRecords =
      await this.getPricingRecordsByCatalogItemId(catalogItemId);
    await Promise.all(pricingRecords.map((record) => this.delete(record.id)));
  }

  /**
   * Retrieves all CatalogItemPricing records associated with a specific PricingRule.
   * @param pricingRuleId - The ID of the PricingRule.
   * @returns Array of CatalogItemPricing entities.
   */
  async getPricingByRuleId(
    pricingRuleId: string
  ): Promise<CatalogItemPricing[]> {
    return await this.find({
      where: { pricingRule: { id: pricingRuleId } },
      relations: ['catalogItem', 'pricingRule'],
    });
  }
}

const catalogItemPricingRepository = new CatalogItemPricingRepository();
export {
  CatalogItemPricingRepository,
  catalogItemPricingRepository as default,
};

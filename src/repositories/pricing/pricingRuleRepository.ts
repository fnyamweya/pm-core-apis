import { DeepPartial } from 'typeorm';
import { PricingRule } from '../../entities/pricing/pricingRuleEntity';
import BaseRepository from '../baseRepository';

class PricingRuleRepository extends BaseRepository<PricingRule> {
  constructor() {
    super(PricingRule);
  }

  /**
   * Ensures a PricingRule exists by its ID or throws an error.
   * @param ruleId - The ID of the PricingRule.
   * @returns The PricingRule entity.
   */
  private async ensurePricingRuleExistsById(
    ruleId: string
  ): Promise<PricingRule> {
    const rule = await this.findById(ruleId);
    if (!rule) {
      throw new Error(`PricingRule not found for ID: ${ruleId}`);
    }
    return rule;
  }

  /**
   * Creates a new PricingRule with associated conditions and actions.
   * @param ruleData - Data for the new PricingRule.
   * @returns The created PricingRule entity.
   */
  async createPricingRule(
    ruleData: DeepPartial<PricingRule>
  ): Promise<PricingRule> {
    return await this.create(ruleData);
  }

  /**
   * Retrieves a PricingRule by name.
   * @param name - The name of the PricingRule.
   * @returns The PricingRule entity or null if not found.
   */
  async getPricingRuleByName(name: string): Promise<PricingRule | null> {
    return await this.findOne({
      where: { name },
      relations: [
        'conditions',
        'actions',
        'catalogItems',
        'catalogItemPricing',
      ],
    });
  }

  /**
   * Retrieves all PricingRules associated with a specific Catalog item.
   * @param catalogId - The ID of the Catalog item.
   * @returns Array of PricingRule entities associated with the specified Catalog item.
   */
  async getPricingRulesByCatalogId(catalogId: string): Promise<PricingRule[]> {
    return await this.find({
      where: { catalogItems: { id: catalogId } },
      relations: ['conditions', 'actions', 'catalogItemPricing'],
    });
  }

  /**
   * Updates a PricingRule by ID.
   * @param ruleId - The ID of the PricingRule.
   * @param updateData - Partial data to update the PricingRule with.
   * @returns The updated PricingRule entity.
   */
  async updatePricingRuleById(
    ruleId: string,
    updateData: DeepPartial<PricingRule>
  ): Promise<PricingRule> {
    await this.ensurePricingRuleExistsById(ruleId);
    await this.update(ruleId, updateData);

    const updatedRule = await this.findById(ruleId);
    if (!updatedRule) {
      throw new Error(
        `Failed to retrieve updated PricingRule with ID: ${ruleId}`
      );
    }
    return updatedRule;
  }

  /**
   * Adds a catalog item to a pricing rule.
   * @param ruleId - The ID of the PricingRule.
   * @param catalogId - The ID of the Catalog entity to associate with the PricingRule.
   */
  async addCatalogToPricingRule(
    ruleId: string,
    catalogId: string
  ): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .relation(PricingRule, 'catalogItems')
      .of(ruleId)
      .add(catalogId);
  }

  /**
   * Removes a catalog item from a pricing rule.
   * @param ruleId - The ID of the PricingRule.
   * @param catalogId - The ID of the Catalog entity to remove from the PricingRule.
   */
  async removeCatalogFromPricingRule(
    ruleId: string,
    catalogId: string
  ): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .relation(PricingRule, 'catalogItems')
      .of(ruleId)
      .remove(catalogId);
  }

  /**
   * Deletes a PricingRule by name.
   * @param name - The name of the PricingRule to delete.
   */
  async deletePricingRuleByName(name: string): Promise<void> {
    const rule = await this.getPricingRuleByName(name);
    if (!rule) {
      throw new Error(`PricingRule not found with name: ${name}`);
    }
    await this.delete(rule.id);
  }
}

const pricingRuleRepository = new PricingRuleRepository();
export { pricingRuleRepository as default, PricingRuleRepository };

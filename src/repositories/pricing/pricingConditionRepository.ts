import { DeepPartial } from 'typeorm';
import { PricingCondition } from '../../entities/pricing/pricingConditionEntity';
import BaseRepository from '../baseRepository';

class PricingConditionRepository extends BaseRepository<PricingCondition> {
  constructor() {
    super(PricingCondition);
  }

  /**
   * Ensures a PricingCondition exists by its ID or throws an error.
   * @param conditionId - The ID of the PricingCondition.
   * @returns The PricingCondition entity.
   */
  private async ensureConditionExistsById(
    conditionId: string
  ): Promise<PricingCondition> {
    const condition = await this.findById(conditionId);
    if (!condition) {
      throw new Error(`PricingCondition not found for ID: ${conditionId}`);
    }
    return condition;
  }

  /**
   * Creates a new PricingCondition associated with a PricingRule.
   * @param conditionData - Data for the new PricingCondition.
   * @returns The created PricingCondition entity.
   */
  async createPricingCondition(
    conditionData: DeepPartial<PricingCondition>
  ): Promise<PricingCondition> {
    return await this.create(conditionData);
  }

  /**
   * Retrieves all PricingConditions for a specific PricingRule by rule ID.
   * @param ruleId - The ID of the PricingRule.
   * @returns Array of PricingCondition entities associated with the specified rule.
   */
  async getConditionsByRuleId(ruleId: string): Promise<PricingCondition[]> {
    return await this.find({
      where: { pricingRule: { id: ruleId } },
    });
  }

  /**
   * Updates a PricingCondition by its ID.
   * @param conditionId - The ID of the PricingCondition.
   * @param updateData - Partial data to update the PricingCondition with.
   * @returns The updated PricingCondition entity.
   */
  async updateConditionById(
    conditionId: string,
    updateData: DeepPartial<PricingCondition>
  ): Promise<PricingCondition> {
    await this.ensureConditionExistsById(conditionId);
    await this.update(conditionId, updateData);

    const updatedCondition = await this.findById(conditionId);
    if (!updatedCondition) {
      throw new Error(
        `Failed to retrieve updated PricingCondition with ID: ${conditionId}`
      );
    }
    return updatedCondition;
  }

  /**
   * Deletes a PricingCondition by its ID.
   * @param conditionId - The ID of the PricingCondition to delete.
   */
  async deleteConditionById(conditionId: string): Promise<void> {
    await this.ensureConditionExistsById(conditionId);
    await this.delete(conditionId);
  }

  /**
   * Deletes all PricingConditions associated with a specific PricingRule by rule ID.
   * @param ruleId - The ID of the PricingRule.
   */
  async deleteConditionsByRuleId(ruleId: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .delete()
      .where('pricingRuleId = :ruleId', { ruleId })
      .execute();
  }
}

const pricingConditionRepository = new PricingConditionRepository();
export { pricingConditionRepository as default, PricingConditionRepository };

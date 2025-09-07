import { DeepPartial } from 'typeorm';
import { PricingAction } from '../../entities/pricing/pricingActionEntity';
import BaseRepository from '../baseRepository';

class PricingActionRepository extends BaseRepository<PricingAction> {
  constructor() {
    super(PricingAction);
  }

  /**
   * Ensures a PricingAction exists by its ID or throws an error.
   * @param actionId - The ID of the PricingAction.
   * @returns The PricingAction entity.
   */
  private async ensureActionExistsById(
    actionId: string
  ): Promise<PricingAction> {
    const action = await this.findById(actionId);
    if (!action) {
      throw new Error(`PricingAction not found for ID: ${actionId}`);
    }
    return action;
  }

  /**
   * Creates a new PricingAction associated with a PricingRule.
   * @param actionData - Data for the new PricingAction.
   * @returns The created PricingAction entity.
   */
  async createPricingAction(
    actionData: DeepPartial<PricingAction>
  ): Promise<PricingAction> {
    return await this.create(actionData);
  }

  /**
   * Retrieves all PricingActions for a specific PricingRule by rule ID.
   * @param ruleId - The ID of the PricingRule.
   * @returns Array of PricingAction entities associated with the specified rule.
   */
  async getActionsByRuleId(ruleId: string): Promise<PricingAction[]> {
    return await this.find({
      where: { pricingRule: { id: ruleId } },
    });
  }

  /**
   * Updates a PricingAction by its ID.
   * @param actionId - The ID of the PricingAction.
   * @param updateData - Partial data to update the PricingAction with.
   * @returns The updated PricingAction entity.
   */
  async updateActionById(
    actionId: string,
    updateData: DeepPartial<PricingAction>
  ): Promise<PricingAction> {
    await this.ensureActionExistsById(actionId);
    await this.update(actionId, updateData);
    const updatedAction = await this.findById(actionId);
    if (!updatedAction) {
      throw new Error(
        `Failed to retrieve updated PricingAction with ID: ${actionId}`
      );
    }
    return updatedAction;
  }

  /**
   * Deletes a PricingAction by its ID.
   * @param actionId - The ID of the PricingAction to delete.
   */
  async deleteActionById(actionId: string): Promise<void> {
    await this.ensureActionExistsById(actionId);
    await this.delete(actionId);
  }

  /**
   * Deletes all PricingActions associated with a specific PricingRule by rule ID.
   * @param ruleId - The ID of the PricingRule.
   */
  async deleteActionsByRuleId(ruleId: string): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .delete()
      .where('pricingRuleId = :ruleId', { ruleId })
      .execute();
  }
}

const pricingActionRepository = new PricingActionRepository();
export { pricingActionRepository as default, PricingActionRepository };

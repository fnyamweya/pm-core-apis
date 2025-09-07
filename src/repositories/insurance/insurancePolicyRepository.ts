import { DeepPartial } from 'typeorm';
import { InsurancePolicy } from '../../entities/insurance/insurancePolicyEntity';
import BaseRepository from '../baseRepository';

class InsurancePolicyRepository extends BaseRepository<InsurancePolicy> {
  constructor() {
    super(InsurancePolicy);
  }

  /**
   * Creates a new InsurancePolicy.
   * @param policyData - Data for the new InsurancePolicy.
   * @returns The created InsurancePolicy entity.
   */
  async createInsurancePolicy(
    policyData: DeepPartial<InsurancePolicy>
  ): Promise<InsurancePolicy> {
    return await this.create(policyData);
  }

  /**
   * Retrieves an InsurancePolicy by its unique policy code or throws an error if not found.
   * @param code - The insurance policy code.
   * @returns The InsurancePolicy entity.
   */
  private async ensurePolicyExistsByCode(
    code: string
  ): Promise<InsurancePolicy> {
    const policy = await this.findOne({ where: { insurancePolicyCode: code } });
    if (!policy) {
      throw new Error(`InsurancePolicy not found for code: ${code}`);
    }
    // TypeScript now knows `policy` is not null
    return policy as InsurancePolicy;
  }

  /**
   * Retrieves an InsurancePolicy by its unique policy code.
   * @param code - The insurance policy code.
   * @returns The InsurancePolicy entity or null if not found.
   */
  async getInsurancePolicyByCode(
    code: string
  ): Promise<InsurancePolicy | null> {
    return await this.findOne({ where: { insurancePolicyCode: code } });
  }

  /**
   * Retrieves all active InsurancePolicies.
   * @returns Array of active InsurancePolicy entities.
   */
  async getActiveInsurancePolicies(): Promise<InsurancePolicy[]> {
    return await this.find({ where: { isActive: true } });
  }

  /**
   * Updates an InsurancePolicy by its unique policy code.
   * @param code - The insurance policy code.
   * @param updateData - Partial data to update the policy.
   * @returns The updated InsurancePolicy entity.
   */
  async updateInsurancePolicyByCode(
    code: string,
    updateData: DeepPartial<InsurancePolicy>
  ): Promise<InsurancePolicy> {
    const policy = await this.ensurePolicyExistsByCode(code);
    await this.update(policy.id, updateData);

    // Fetch the updated policy and ensure it's not null
    const updatedPolicy = await this.findById(policy.id);
    if (!updatedPolicy) {
      throw new Error(`Updated InsurancePolicy not found for ID: ${policy.id}`);
    }

    return updatedPolicy; // Now guaranteed to be an InsurancePolicy
  }

  /**
   * Updates the deductible rule for a specific InsurancePolicy by code.
   * @param code - The insurance policy code.
   * @param deductibleRule - The deductible rule configuration to update.
   */
  async updateDeductibleRule(
    code: string,
    deductibleRule: Record<string, any>
  ): Promise<void> {
    await this.updateInsurancePolicyByCode(code, { deductibleRule });
  }

  /**
   * Updates the policy details for a specific InsurancePolicy by code.
   * @param code - The insurance policy code.
   * @param policyDetails - The policy details to update.
   */
  async updatePolicyDetails(
    code: string,
    policyDetails: Record<string, any>
  ): Promise<void> {
    await this.updateInsurancePolicyByCode(code, { policyDetails });
  }

  /**
   * Sets the effective dates for a specific InsurancePolicy by code.
   * @param code - The insurance policy code.
   * @param effectiveFrom - The start date of the policy.
   * @param effectiveTo - The end date of the policy.
   */
  async setEffectiveDates(
    code: string,
    effectiveFrom: Date | null,
    effectiveTo: Date | null
  ): Promise<void> {
    await this.updateInsurancePolicyByCode(code, {
      effectiveFrom: effectiveFrom ?? undefined,
      effectiveTo: effectiveTo ?? undefined,
    });
  }

  /**
   * Deactivates an InsurancePolicy by its policy code.
   * @param code - The insurance policy code to deactivate.
   */
  async deactivateInsurancePolicyByCode(code: string): Promise<void> {
    await this.updateInsurancePolicyByCode(code, { isActive: false });
  }
}

const insurancePolicyRepository = new InsurancePolicyRepository();
export { insurancePolicyRepository as default, InsurancePolicyRepository };

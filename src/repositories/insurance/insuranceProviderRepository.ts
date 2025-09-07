import { DeepPartial } from 'typeorm';
import { InsuranceProvider } from '../../entities/insurance/insuranceProviderEntity';
import BaseRepository from '../baseRepository';

class InsuranceProviderRepository extends BaseRepository<InsuranceProvider> {
  constructor() {
    super(InsuranceProvider);
  }

  /**
   * Creates a new InsuranceProvider.
   * @param providerData - Data for the new InsuranceProvider.
   * @returns The created InsuranceProvider entity.
   */
  async createInsuranceProvider(
    providerData: DeepPartial<InsuranceProvider>
  ): Promise<InsuranceProvider> {
    return await this.create(providerData);
  }

  /**
   * Ensures an InsuranceProvider exists by code, or throws an error.
   * @param code - The insurance provider code.
   * @returns The existing InsuranceProvider entity.
   */
  private async ensureProviderExistsByCode(
    code: string
  ): Promise<InsuranceProvider> {
    const provider = await this.findOne({
      where: { insuranceProviderCode: code },
    });
    if (!provider) {
      throw new Error(`InsuranceProvider not found for code: ${code}`);
    }
    return provider;
  }

  /**
   * Updates an InsuranceProvider by its provider code.
   * @param code - The insurance provider code.
   * @param updateData - Partial data to update the provider with.
   * @returns The updated InsuranceProvider entity.
   */
  async updateInsuranceProviderByCode(
    code: string,
    updateData: DeepPartial<InsuranceProvider>
  ): Promise<InsuranceProvider> {
    const provider = await this.ensureProviderExistsByCode(code);
    await this.update(provider.id, updateData);
    return await this.ensureEntityUpdated(provider.id, 'InsuranceProvider');
  }

  /**
   * Ensures an entity is updated and returns it, or throws an error.
   * @param id - The entity ID.
   * @param entityName - Name of the entity for error context.
   * @returns The updated entity.
   */
  private async ensureEntityUpdated(
    id: string,
    entityName: string
  ): Promise<InsuranceProvider> {
    const updatedEntity = await this.findById(id);
    if (!updatedEntity) {
      throw new Error(
        `Failed to retrieve updated ${entityName} with ID: ${id}`
      );
    }
    return updatedEntity;
  }

  /**
   * Finds an InsuranceProvider by its provider code.
   * @param code - The insurance provider code.
   * @returns The InsuranceProvider entity or null if not found.
   */
  async getInsuranceProviderByCode(
    code: string
  ): Promise<InsuranceProvider | null> {
    return await this.findOne({ where: { insuranceProviderCode: code } });
  }

  /**
   * Retrieves all InsuranceProviders.
   * @returns Array of InsuranceProvider entities.
   */
  async getAllInsuranceProviders(): Promise<InsuranceProvider[]> {
    return await this.find();
  }

  /**
   * Updates the configurations for a specific InsuranceProvider by code.
   * @param code - The insurance provider code.
   * @param configurations - The configuration object to update or replace.
   * @returns The updated InsuranceProvider entity.
   */
  async updateInsuranceProviderConfigurations(
    code: string,
    configurations: Record<string, any>
  ): Promise<InsuranceProvider> {
    return await this.updateInsuranceProviderByCode(code, { configurations });
  }

  /**
   * Updates the metadata for a specific InsuranceProvider by code.
   * @param code - The insurance provider code.
   * @param metadata - The metadata object to update or replace.
   * @returns The updated InsuranceProvider entity.
   */
  async updateInsuranceProviderMetadata(
    code: string,
    metadata: Record<string, any>
  ): Promise<InsuranceProvider> {
    return await this.updateInsuranceProviderByCode(code, { metadata });
  }

  /**
   * Deletes an InsuranceProvider by its provider code.
   * @param code - The insurance provider code to delete.
   */
  async deleteInsuranceProviderByCode(code: string): Promise<void> {
    const provider = await this.ensureProviderExistsByCode(code);
    await this.delete(provider.id);
  }
}

const insuranceProviderRepository = new InsuranceProviderRepository();
export { insuranceProviderRepository as default, InsuranceProviderRepository };

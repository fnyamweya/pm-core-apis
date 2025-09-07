import { DeepPartial } from 'typeorm';
import { ServiceProviderConfiguration } from '../../entities/services/serviceProviderConfigurationEntity';
import BaseRepository from '../baseRepository';

class ServiceProviderConfigurationRepository extends BaseRepository<ServiceProviderConfiguration> {
  constructor() {
    super(ServiceProviderConfiguration);
  }

  /**
   * Creates a new ServiceProviderConfiguration.
   * @param configData - Data for the new ServiceProviderConfiguration.
   * @returns The created ServiceProviderConfiguration entity.
   */
  async createConfiguration(
    configData: DeepPartial<ServiceProviderConfiguration>
  ): Promise<ServiceProviderConfiguration> {
    return this.create(configData);
  }

  /**
   * Ensures a ServiceProviderConfiguration exists for a given provider ID.
   * @param providerId - The ID of the associated ServiceProvider.
   * @returns The ServiceProviderConfiguration entity.
   * @throws Error if not found.
   */
  async ensureConfigurationExistsByProviderId(
    providerId: string
  ): Promise<ServiceProviderConfiguration> {
    const config = await this.findOne({
      where: { provider: { id: providerId } },
    });
    if (!config) {
      throw new Error(
        `Configuration not found for ServiceProvider ID: ${providerId}`
      );
    }
    return config;
  }

  /**
   * Retrieves a ServiceProviderConfiguration by provider ID.
   * @param providerId - The ID of the associated ServiceProvider.
   * @returns The ServiceProviderConfiguration entity or null if not found.
   */
  async getConfigurationByProviderId(
    providerId: string
  ): Promise<ServiceProviderConfiguration | null> {
    return this.findOne({
      where: { provider: { id: providerId } },
    });
  }

  /**
   * Updates pricing strategy for a ServiceProviderConfiguration by provider ID.
   * @param providerId - The ID of the associated ServiceProvider.
   * @param pricingStrategy - Updated pricing strategy.
   */
  async updatePricingStrategyByProviderId(
    providerId: string,
    pricingStrategy: ServiceProviderConfiguration['pricingStrategy']
  ): Promise<void> {
    const config = await this.ensureConfigurationExistsByProviderId(providerId);
    await this.update(config.id, { pricingStrategy });
  }

  /**
   * Updates additional configuration for a ServiceProviderConfiguration by provider ID.
   * @param providerId - The ID of the associated ServiceProvider.
   * @param additionalConfig - Additional configuration settings to update.
   */
  async updateAdditionalConfigByProviderId(
    providerId: string,
    additionalConfig: ServiceProviderConfiguration['additionalConfig']
  ): Promise<void> {
    const config = await this.ensureConfigurationExistsByProviderId(providerId);
    await this.update(config.id, { additionalConfig });
  }

  /**
   * Deletes a ServiceProviderConfiguration by provider ID.
   * @param providerId - The ID of the associated ServiceProvider.
   */
  async deleteConfigurationByProviderId(providerId: string): Promise<void> {
    const config = await this.ensureConfigurationExistsByProviderId(providerId);
    await this.delete(config.id);
  }
}

const serviceProviderConfigurationRepository =
  new ServiceProviderConfigurationRepository();
export {
  serviceProviderConfigurationRepository as default,
  ServiceProviderConfigurationRepository,
};

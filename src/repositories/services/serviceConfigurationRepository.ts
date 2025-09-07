import { DeepPartial } from 'typeorm';
import { ServiceConfiguration } from '../../entities/services/serviceConfigurationEntity';
import BaseRepository from '../baseRepository';

class ServiceConfigurationRepository extends BaseRepository<ServiceConfiguration> {
  constructor() {
    super(ServiceConfiguration);
  }

  /**
   * Creates a new ServiceConfiguration.
   * @param configData - Data for the new ServiceConfiguration.
   * @returns The created ServiceConfiguration entity.
   */
  async createServiceConfiguration(
    configData: DeepPartial<ServiceConfiguration>
  ): Promise<ServiceConfiguration> {
    return this.create(configData);
  }

  /**
   * Ensures a ServiceConfiguration exists for a given Service ID.
   * @param serviceId - The ID of the associated Service.
   * @returns The ServiceConfiguration entity.
   * @throws Error if not found.
   */
  async ensureConfigurationExistsByServiceId(
    serviceId: string
  ): Promise<ServiceConfiguration> {
    const config = await this.getConfigurationByServiceId(serviceId);
    if (!config) {
      throw new Error(
        `ServiceConfiguration not found for Service ID: ${serviceId}`
      );
    }
    return config;
  }

  /**
   * Retrieves a ServiceConfiguration by its associated Service ID.
   * @param serviceId - The ID of the associated Service.
   * @returns The ServiceConfiguration entity or null if not found.
   */
  async getConfigurationByServiceId(
    serviceId: string
  ): Promise<ServiceConfiguration | null> {
    return this.findOne({
      where: { service: { id: serviceId } },
      relations: ['pricing'],
    });
  }

  /**
   * Updates insurance options for a specific ServiceConfiguration by Service ID.
   * @param serviceId - The ID of the associated Service.
   * @param insuranceOptions - Updated insurance options.
   */
  async updateInsuranceOptionsByServiceId(
    serviceId: string,
    insuranceOptions: ServiceConfiguration['insuranceOptions']
  ): Promise<void> {
    const config = await this.ensureConfigurationExistsByServiceId(serviceId);
    await this.update(config.id, { insuranceOptions });
  }

  /**
   * Updates custom pricing for a ServiceConfiguration by Service ID.
   * @param serviceId - The ID of the associated Service.
   * @param pricingData - Array of CatalogItemPricing entities to update or set.
   */
  async updatePricingByServiceId(
    serviceId: string,
    pricingData: DeepPartial<ServiceConfiguration['pricing']>
  ): Promise<void> {
    const config = await this.ensureConfigurationExistsByServiceId(serviceId);
    await this.update(config.id, { pricing: pricingData });
  }

  /**
   * Retrieves additional configuration options for a specific ServiceConfiguration by Service ID.
   * @param serviceId - The ID of the associated Service.
   * @returns Additional configuration options or null if not found.
   */
  async getAdditionalConfigByServiceId(
    serviceId: string
  ): Promise<Record<string, any> | null> {
    const config = await this.getConfigurationByServiceId(serviceId);
    return config?.additionalConfig ?? null;
  }

  /**
   * Updates additional configuration options for a ServiceConfiguration by Service ID.
   * @param serviceId - The ID of the associated Service.
   * @param additionalConfig - Additional configuration options to update.
   */
  async updateAdditionalConfigByServiceId(
    serviceId: string,
    additionalConfig: ServiceConfiguration['additionalConfig']
  ): Promise<void> {
    const config = await this.ensureConfigurationExistsByServiceId(serviceId);
    await this.update(config.id, { additionalConfig });
  }

  /**
   * Deletes a ServiceConfiguration by Service ID.
   * @param serviceId - The ID of the associated Service.
   */
  async deleteConfigurationByServiceId(serviceId: string): Promise<void> {
    const config = await this.ensureConfigurationExistsByServiceId(serviceId);
    await this.delete(config.id);
  }
}

const serviceConfigurationRepository = new ServiceConfigurationRepository();
export {
  serviceConfigurationRepository as default,
  ServiceConfigurationRepository,
};

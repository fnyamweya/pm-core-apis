import { DeepPartial } from 'typeorm';
import { PaymentProviderConfig } from '../../entities/payments/paymentProviderConfigEntity';
import BaseRepository from '../baseRepository';

class PaymentProviderConfigRepository extends BaseRepository<PaymentProviderConfig> {
  constructor() {
    super(PaymentProviderConfig);
  }

  /**
   * Creates a new configuration for a PaymentProvider.
   * @param configData - Data for the new configuration.
   * @returns The created PaymentProviderConfig entity.
   */
  async createPaymentProviderConfig(
    configData: DeepPartial<PaymentProviderConfig>
  ): Promise<PaymentProviderConfig> {
    return await this.create(configData);
  }

  /**
   * Ensures a PaymentProvider configuration exists or throws an error.
   * @param providerCode - The unique code of the PaymentProvider.
   * @param key - The key of the configuration.
   * @returns The existing PaymentProviderConfig entity.
   */
  private async ensureConfigExists(
    providerCode: string,
    key: string
  ): Promise<PaymentProviderConfig> {
    const config = await this.findOne({
      where: {
        paymentProvider: { paymentProviderCode: providerCode },
        key,
      },
    });

    if (!config) {
      throw new Error(
        `Configuration not found for provider code: ${providerCode} and key: ${key}`
      );
    }

    return config;
  }

  /**
   * Retrieves all configurations for a PaymentProvider by its code.
   * @param providerCode - The unique code of the PaymentProvider.
   * @returns List of PaymentProviderConfig entities.
   */
  async getConfigsByProviderCode(
    providerCode: string
  ): Promise<PaymentProviderConfig[]> {
    return await this.find({
      where: {
        paymentProvider: { paymentProviderCode: providerCode },
      },
    });
  }

  /**
   * Updates a specific configuration by provider code and key.
   * @param providerCode - The unique code of the PaymentProvider.
   * @param key - The key of the configuration to update.
   * @param value - The new value of the configuration.
   * @returns The updated PaymentProviderConfig entity.
   */
  async updateConfigByProviderCode(
    providerCode: string,
    key: string,
    value: any
  ): Promise<PaymentProviderConfig> {
    const config = await this.ensureConfigExists(providerCode, key);
    await this.update(config.id, { value });
    return await this.ensureEntityUpdated(config.id, 'PaymentProviderConfig');
  }

  /**
   * Deletes a specific configuration by provider code and key.
   * @param providerCode - The unique code of the PaymentProvider.
   * @param key - The key of the configuration to delete.
   */
  async deleteConfigByProviderCode(
    providerCode: string,
    key: string
  ): Promise<void> {
    const config = await this.ensureConfigExists(providerCode, key);
    await this.delete(config.id);
  }

  /**
   * Ensures the updated entity exists in the database or throws an error.
   * @param id - The ID of the entity.
   * @param entityName - Name of the entity for error messages.
   * @returns The updated entity.
   */
  private async ensureEntityUpdated(
    id: string,
    entityName: string
  ): Promise<PaymentProviderConfig> {
    const updatedEntity = await this.findById(id);
    if (!updatedEntity) {
      throw new Error(
        `Failed to retrieve updated ${entityName} with ID: ${id}`
      );
    }
    return updatedEntity;
  }
}

const paymentProviderConfigRepository = new PaymentProviderConfigRepository();
export {
  paymentProviderConfigRepository as default,
  PaymentProviderConfigRepository,
};

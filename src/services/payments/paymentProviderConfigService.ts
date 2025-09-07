import { DeepPartial } from 'typeorm';
import { PaymentProviderConfig } from '../../entities/payments/paymentProviderConfigEntity';
import paymentProviderConfigRepository from '../../repositories/payments/paymentProviderConfigRepository';
import { logger } from '../../utils/logger';
import RedisCache from '../../utils/redisCache';
import { BaseService } from '../baseService';

const CACHE_KEYS = {
  SINGLE_CONFIG: 'paymentProviderConfig',
  PROVIDER_CONFIGS: 'providerConfigs',
};

interface CreatePaymentProviderConfigDTO {
  providerCode: string;
  key: string;
  value: any;
  metadata?: Record<string, any>;
}

interface UpdatePaymentProviderConfigDTO {
  value: any;
  metadata?: Record<string, any>;
}

class PaymentProviderConfigService extends BaseService<PaymentProviderConfig> {
  private configCache: RedisCache<PaymentProviderConfig>;
  private providerConfigsCache: RedisCache<PaymentProviderConfig[]>;

  constructor() {
    super(
      {
        repository: paymentProviderConfigRepository,
        redisCache: new RedisCache<PaymentProviderConfig>(3600),
        logger,
      },
      'paymentProviderConfig'
    );

    this.configCache = new RedisCache<PaymentProviderConfig>(3600);
    this.providerConfigsCache = new RedisCache<PaymentProviderConfig[]>(3600);
    this.logger.info('PaymentProviderConfigService initialized');
  }

  /**
   * Creates a new configuration for a PaymentProvider.
   * @param data - Data for creating a new PaymentProviderConfig.
   * @returns The created PaymentProviderConfig entity.
   * @throws Error if the provider code, key, or value is missing.
   */
  async createPaymentProviderConfig(
    data: CreatePaymentProviderConfigDTO
  ): Promise<PaymentProviderConfig> {
    this.logger.info('Creating new PaymentProviderConfig', { data });

    if (!data.providerCode || !data.key || data.value === undefined) {
      throw new Error('Provider code, key, and value are required');
    }

    try {
      const configData: DeepPartial<PaymentProviderConfig> = {
        paymentProvider: { paymentProviderCode: data.providerCode },
        key: data.key,
        value: data.value,
        metadata: data.metadata,
      };

      const config =
        await paymentProviderConfigRepository.createPaymentProviderConfig(
          configData
        );

      await this.configCache.setToCache(
        CACHE_KEYS.SINGLE_CONFIG,
        `${data.providerCode}:${data.key}`,
        config
      );

      await this.providerConfigsCache.deleteKey(
        CACHE_KEYS.PROVIDER_CONFIGS,
        data.providerCode
      );

      return config;
    } catch (error) {
      this.logger.error('Error creating PaymentProviderConfig', {
        data,
        error,
      });
      throw new Error('Unable to create payment provider configuration');
    }
  }

  /**
   * Retrieves all configurations for a PaymentProvider by its code.
   * @param providerCode - The unique code of the PaymentProvider.
   * @returns List of PaymentProviderConfig entities.
   * @throws Error if unable to fetch configurations.
   */
  async getConfigsByProviderCode(
    providerCode: string
  ): Promise<PaymentProviderConfig[]> {
    this.logger.info('Fetching PaymentProviderConfigs by providerCode', {
      providerCode,
    });

    if (!providerCode) {
      throw new Error('Provider code is required');
    }

    try {
      let configs: PaymentProviderConfig[] | null =
        (await this.providerConfigsCache.getFromCache(
          CACHE_KEYS.PROVIDER_CONFIGS,
          providerCode
        )) as PaymentProviderConfig[] | null;

      if (!configs) {
        configs =
          await paymentProviderConfigRepository.getConfigsByProviderCode(
            providerCode
          );
        configs = configs ?? [];

        await this.providerConfigsCache.setToCache(
          CACHE_KEYS.PROVIDER_CONFIGS,
          providerCode,
          configs
        );
      }

      return configs;
    } catch (error) {
      this.logger.error('Error fetching PaymentProviderConfigs', {
        providerCode,
        error,
      });
      throw new Error('Unable to fetch payment provider configurations');
    }
  }

  /**
   * Updates a specific configuration by provider code and key.
   * @param providerCode - The unique code of the PaymentProvider.
   * @param key - The key of the configuration to update.
   * @param data - Data to update the configuration with.
   * @throws Error if unable to update the configuration.
   */
  async updateConfigByProviderCode(
    providerCode: string,
    key: string,
    data: UpdatePaymentProviderConfigDTO
  ): Promise<void> {
    this.logger.info('Updating PaymentProviderConfig', {
      providerCode,
      key,
      data,
    });

    if (!providerCode || !key || data.value === undefined) {
      throw new Error('Provider code, key, and value are required');
    }

    try {
      const updateData: DeepPartial<PaymentProviderConfig> = {
        value: data.value,
        metadata: data.metadata,
      };

      await paymentProviderConfigRepository.updateConfigByProviderCode(
        providerCode,
        key,
        updateData
      );

      await this.configCache.deleteKey(
        CACHE_KEYS.SINGLE_CONFIG,
        `${providerCode}:${key}`
      );

      await this.providerConfigsCache.deleteKey(
        CACHE_KEYS.PROVIDER_CONFIGS,
        providerCode
      );
    } catch (error) {
      this.logger.error('Error updating PaymentProviderConfig', {
        providerCode,
        key,
        data,
        error,
      });
      throw new Error('Unable to update payment provider configuration');
    }
  }

  /**
   * Deletes a configuration by provider code and key.
   * @param providerCode - The unique code of the PaymentProvider.
   * @param key - The key of the configuration to delete.
   * @throws Error if unable to delete the configuration.
   */
  async deleteConfigByProviderCode(
    providerCode: string,
    key: string
  ): Promise<void> {
    this.logger.info('Deleting PaymentProviderConfig', { providerCode, key });

    if (!providerCode || !key) {
      throw new Error('Provider code and key are required');
    }

    try {
      await paymentProviderConfigRepository.deleteConfigByProviderCode(
        providerCode,
        key
      );

      await this.configCache.deleteKey(
        CACHE_KEYS.SINGLE_CONFIG,
        `${providerCode}:${key}`
      );

      await this.providerConfigsCache.deleteKey(
        CACHE_KEYS.PROVIDER_CONFIGS,
        providerCode
      );
    } catch (error) {
      this.logger.error('Error deleting PaymentProviderConfig', {
        providerCode,
        key,
        error,
      });
      throw new Error('Unable to delete payment provider configuration');
    }
  }
}

export default new PaymentProviderConfigService();

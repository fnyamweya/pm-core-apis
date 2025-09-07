import { ClientAppConfig } from '../../entities/clientApps/clientAppConfigEntity';
import clientAppConfigRepository from '../../repositories/clientApps/clientAppConfigRepository';
import { logger } from '../../utils/logger';
import RedisCache from '../../utils/redisCache';
import { BaseService } from '../baseService';

class ClientAppConfigService extends BaseService<ClientAppConfig> {
  private readonly cacheNamespace = 'clientAppConfig';

  constructor() {
    super(
      {
        repository: clientAppConfigRepository,
        redisCache: new RedisCache<ClientAppConfig>(3600), // 1-hour TTL
        logger,
      },
      'clientAppConfig'
    );
  }

  private generateCacheKey(namespace: string, key: string): string {
    return `${namespace}:${key}`;
  }

  /**
   * Retrieves a client app config by its associated appId, using cache if available.
   * @param appId - The appId of the client app.
   * @returns The client app config entity or null if not found.
   */
  async getClientAppConfigByAppId(
    appId: string
  ): Promise<ClientAppConfig | null> {
    this.logger.info('Fetching client app config by appId', { appId });

    const cacheKey = this.generateCacheKey(this.cacheNamespace, appId);
    let clientAppConfig = await this.cache.getFromCache(
      this.cacheNamespace,
      cacheKey
    );

    if (!clientAppConfig) {
      clientAppConfig =
        await clientAppConfigRepository.getClientAppConfigByAppId(appId);
      if (clientAppConfig) {
        await this.cache.setToCache(
          this.cacheNamespace,
          cacheKey,
          clientAppConfig
        );
        this.logger.info('Client app config cached by appId', { appId });
      }
    } else {
      this.logger.info('Client app config found in cache', { appId });
    }

    return clientAppConfig as ClientAppConfig | null;
  }

  /**
   * Updates a client app config by its associated appId.
   * @param appId - The appId of the client app.
   * @param updateData - Data to update the client app config.
   */
  async updateClientAppConfigByAppId(
    appId: string,
    updateData: Partial<ClientAppConfig>
  ): Promise<void> {
    this.logger.info('Updating client app config by appId', {
      appId,
      updateData,
    });

    await clientAppConfigRepository.updateClientAppConfigByAppId(
      appId,
      updateData
    );
    await this.refreshCache(appId);
  }

  /**
   * Deletes a client app config by its associated appId.
   * @param appId - The appId of the client app.
   */
  async deleteClientAppConfigByAppId(appId: string): Promise<void> {
    this.logger.info('Deleting client app config by appId', { appId });

    await clientAppConfigRepository.deleteClientAppConfigByAppId(appId);
    await this.cache.deleteKey(this.cacheNamespace, appId);
  }

  /**
   * Validates the client app config.
   * @param config - The client app config to validate.
   */
  validateConfig(config: ClientAppConfig): void {
    config.validateConfig();
  }

  /**
   * Refreshes the cache for a given client app config by appId.
   * @param appId - The appId of the client app.
   */
  private async refreshCache(appId: string): Promise<void> {
    const clientAppConfig = await this.getClientAppConfigByAppId(appId);
    if (clientAppConfig) {
      await this.cache.setToCache(this.cacheNamespace, appId, clientAppConfig);
      this.logger.info('Client app config cache refreshed', { appId });
    }
  }
}

export default new ClientAppConfigService();

import { hashCredential } from '../../config/argon2';
import { ClientAppStatus } from '../../constants/clientApps/clientAppConstants';
import { ClientApp } from '../../entities/clientApps/clientAppEntity';
import clientAppRepository from '../../repositories/clientApps/clientAppRepository';
import { generateAppId, generateAppSecret } from '../../utils/crypto';
import { logger } from '../../utils/logger';
import RedisCache from '../../utils/redisCache';
import { BaseService } from '../baseService';

class ClientAppService extends BaseService<ClientApp> {
  private readonly cacheNamespace = 'clientApp';

  constructor() {
    super(
      {
        repository: clientAppRepository,
        redisCache: new RedisCache<ClientApp>(3600), // 1-hour TTL
        logger,
      },
      'clientApp'
    );
  }

  private generateCacheKey(namespace: string, key: string): string {
    return `${namespace}:${key}`;
  }

  /**
   * Creates a new client app.
   * @param name - The name of the client app.
   * @param status - The status of the client app.
   * @returns The created client app entity.
   */
  async createClientApp(
    name: string,
    status: ClientAppStatus
  ): Promise<ClientApp> {
    this.logger.info('Creating client app', { name, status });

    // Generate appId and appSecret
    const appId = generateAppId();
    const appSecret = generateAppSecret();

    // Hash the appSecret using Argon2
    const hashedAppSecret = await hashCredential('clientApp', appSecret);

    // Create the client app entity
    const clientApp = await clientAppRepository.create({
      name,
      appId,
      appSecret: hashedAppSecret,
      status,
    });

    // Cache the created client app
    const cacheKey = this.generateCacheKey(this.cacheNamespace, appId);
    await this.cache.setToCache(this.cacheNamespace, cacheKey, clientApp);

    this.logger.info('Client app created successfully', { appId });
    return clientApp;
  }

  /**
   * Retrieves a client app by its appId, using cache if available.
   * @param appId - The appId of the client app.
   * @returns The client app entity or null if not found.
   */
  async getClientAppByAppId(appId: string): Promise<ClientApp | null> {
    this.logger.info('Fetching client app by appId', { appId });

    const cacheKey = this.generateCacheKey(this.cacheNamespace, appId);
    let clientApp = await this.cache.getFromCache(
      this.cacheNamespace,
      cacheKey
    );

    if (!clientApp) {
      clientApp = await clientAppRepository.getClientAppByAppId(appId);
      if (clientApp) {
        await this.cache.setToCache(this.cacheNamespace, cacheKey, clientApp);
        this.logger.info('Client app cached by appId', { appId });
      }
    } else {
      this.logger.info('Client app found in cache', { appId });
    }

    return clientApp as ClientApp | null;
  }

  /**
   * Retrieves client apps by status.
   * @param status - The status of the client apps.
   * @returns Array of client app entities matching the status.
   */
  async getClientAppsByStatus(status: ClientAppStatus): Promise<ClientApp[]> {
    this.logger.info('Fetching client apps by status', { status });

    const cacheKey = this.generateCacheKey(
      this.cacheNamespace,
      `status:${status}`
    );
    let clientApps = (await this.cache.getFromCache(
      this.cacheNamespace,
      cacheKey
    )) as ClientApp[] | null;

    if (!clientApps) {
      clientApps = await clientAppRepository.getClientAppsByStatus(status);
      if (clientApps) {
        await this.cache.setToCache(this.cacheNamespace, cacheKey, clientApps);
        this.logger.info('Client apps cached by status', { status });
      }
    } else {
      this.logger.info('Client apps found in cache', { status });
    }

    return clientApps || [];
  }

  /**
   * Updates a client app by its appId.
   * @param appId - The appId of the client app to update.
   * @param updateData - Data to update the client app.
   */
  async updateClientAppByAppId(
    appId: string,
    updateData: Partial<ClientApp>
  ): Promise<void> {
    this.logger.info('Updating client app by appId', { appId, updateData });

    await clientAppRepository.updateClientAppByAppId(appId, updateData);
    await this.refreshCache(appId);
  }

  /**
   * Deletes a client app by its appId.
   * @param appId - The appId of the client app to delete.
   */
  async deleteClientAppByAppId(appId: string): Promise<void> {
    this.logger.info('Deleting client app by appId', { appId });

    await clientAppRepository.deleteClientAppByAppId(appId);
    await this.cache.deleteKey(this.cacheNamespace, appId);
  }

  /**
   * Refreshes the cache for a given client app by appId.
   * @param appId - The appId of the client app.
   */
  private async refreshCache(appId: string): Promise<void> {
    const clientApp = await this.getClientAppByAppId(appId);
    if (clientApp) {
      await this.cache.setToCache(this.cacheNamespace, appId, clientApp);
      this.logger.info('Client app cache refreshed', { appId });
    }
  }
}

export default new ClientAppService();

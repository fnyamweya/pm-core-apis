import { ClientAppConfig } from '../../entities/clientApps/clientAppConfigEntity';
import { logger } from '../../utils/logger';
import BaseRepository from '../baseRepository';

class ClientAppConfigRepository extends BaseRepository<ClientAppConfig> {
  constructor() {
    super(ClientAppConfig);
  }

  /**
   * Finds a client app config by its associated appId.
   * @param appId - The appId of the client app.
   * @returns The client app config entity or null if not found.
   */
  async getClientAppConfigByAppId(
    appId: string
  ): Promise<ClientAppConfig | null> {
    try {
      const config = await this.findOne({ where: { application: { appId } } });
      if (!config) {
        logger.info(`Client app config for appId ${appId} not found.`);
      }
      return config;
    } catch (error) {
      this.handleError(
        error,
        `Error finding client app config by appId: ${appId}`
      );
    }
  }

  /**
   * Updates a client app config by its associated appId.
   * @param appId - The appId of the client app.
   * @param updateData - Partial data to update the client app config.
   */
  async updateClientAppConfigByAppId(
    appId: string,
    updateData: Partial<ClientAppConfig>
  ): Promise<void> {
    try {
      await this.repository.update(
        { application: { appId } } as any,
        updateData
      );
    } catch (error) {
      this.handleError(
        error,
        `Error updating client app config for appId: ${appId}`
      );
    }
  }

  /**
   * Deletes a client app config by its associated appId.
   * @param appId - The appId of the client app.
   */
  async deleteClientAppConfigByAppId(appId: string): Promise<void> {
    try {
      await this.repository.delete({ application: { appId } } as any);
    } catch (error) {
      this.handleError(
        error,
        `Error deleting client app config for appId: ${appId}`
      );
    }
  }

  /**
   * Validates the client app config.
   * @param config - The client app config to validate.
   */
  validateConfig(config: ClientAppConfig): void {
    try {
      config.validateConfig();
    } catch (error) {
      this.handleError(error, `Error validating client app config`);
    }
  }
}

// Export an instance of `ClientAppConfigRepository`
const clientAppConfigRepository = new ClientAppConfigRepository();
export { ClientAppConfigRepository, clientAppConfigRepository as default };

import { ClientAppStatus } from '../../constants/clientApps/clientAppConstants';
import { ClientApp } from '../../entities/clientApps/clientAppEntity';
import { logger } from '../../utils/logger';
import BaseRepository from '../baseRepository';

class ClientAppRepository extends BaseRepository<ClientApp> {
  constructor() {
    super(ClientApp);
  }

  /**
   * Finds a client app by its appId.
   * @param appId - The appId of the client app.
   * @returns The client app entity or null if not found.
   */
  async getClientAppByAppId(appId: string): Promise<ClientApp | null> {
    try {
      const clientApp = await this.findOne({ where: { appId } });
      if (!clientApp) {
        logger.info(`Client app with appId ${appId} not found.`);
      }
      return clientApp;
    } catch (error) {
      this.handleError(error, `Error finding client app by appId: ${appId}`);
    }
  }

  /**
   * Finds client apps by status.
   * @param status - The status of the client apps.
   * @returns Array of client app entities matching the status.
   */
  async getClientAppsByStatus(status: ClientAppStatus): Promise<ClientApp[]> {
    try {
      return await this.find({ where: { status } });
    } catch (error) {
      this.handleError(error, `Error finding client apps by status: ${status}`);
    }
  }

  /**
   * Updates a client app by its appId.
   * @param appId - The appId of the client app to update.
   * @param updateData - Partial data to update the client app.
   */
  async updateClientAppByAppId(
    appId: string,
    updateData: Partial<ClientApp>
  ): Promise<void> {
    try {
      await this.repository.update({ appId } as any, updateData);
    } catch (error) {
      this.handleError(error, `Error updating client app with appId: ${appId}`);
    }
  }

  /**
   * Deletes a client app by its appId.
   * @param appId - The appId of the client app to delete.
   */
  async deleteClientAppByAppId(appId: string): Promise<void> {
    try {
      await this.repository.delete({ appId } as any);
    } catch (error) {
      this.handleError(error, `Error deleting client app with appId: ${appId}`);
    }
  }

  /**
   * Soft deletes a client app by its appId if soft delete is supported.
   * @param appId - The appId of the client app to soft delete.
   */
  async softDeleteClientAppByAppId(appId: string): Promise<void> {
    try {
      await this.repository.softDelete({ appId } as any);
    } catch (error) {
      this.handleError(
        error,
        `Error soft deleting client app with appId: ${appId}`
      );
    }
  }

  /**
   * Restores a soft-deleted client app by its appId if soft delete is supported.
   * @param appId - The appId of the client app to restore.
   */
  async restoreClientAppByAppId(appId: string): Promise<void> {
    try {
      await this.repository.restore({ appId } as any);
    } catch (error) {
      this.handleError(
        error,
        `Error restoring client app with appId: ${appId}`
      );
    }
  }
}

// Export an instance of `ClientAppRepository`
const clientAppRepository = new ClientAppRepository();
export { ClientAppRepository, clientAppRepository as default };

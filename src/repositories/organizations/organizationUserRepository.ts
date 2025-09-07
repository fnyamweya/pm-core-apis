import { DeepPartial } from 'typeorm';
import { OrganizationUser } from '../../entities/organizations/organizationUserEntity';
import BaseRepository from '../baseRepository';

class OrganizationUserRepository extends BaseRepository<OrganizationUser> {
  constructor() {
    super(OrganizationUser);
  }

  /**
   * Finds an OrganizationUser by the organization and user IDs.
   * @param organizationId - The ID of the organization.
   * @param userId - The ID of the user.
   * @returns The OrganizationUser entity or null if not found.
   */
  async getOrganizationUserByOrgAndUserIds(
    organizationId: string,
    userId: string
  ): Promise<OrganizationUser | null> {
    try {
      return await this.findOne({
        where: {
          organization: { id: organizationId },
          user: { id: userId },
        },
        relations: ['organization', 'user'],
      });
    } catch (error) {
      this.handleError(
        error,
        `Error finding OrganizationUser by organization ID ${organizationId} and user ID ${userId}`
      );
    }
  }

  /**
   * Finds all users associated with a specific organization.
   * @param organizationId - The ID of the organization.
   * @returns Array of OrganizationUser entities.
   */
  async getUsersByOrganizationId(
    organizationId: string
  ): Promise<OrganizationUser[]> {
    try {
      return await this.find({
        where: { organization: { id: organizationId } },
        relations: ['user'],
      });
    } catch (error) {
      this.handleError(
        error,
        `Error finding users for organization ID: ${organizationId}`
      );
    }
  }

  /**
   * Finds all organizations associated with a specific user.
   * @param userId - The ID of the user.
   * @returns Array of OrganizationUser entities.
   */
  async getOrganizationsByUserId(userId: string): Promise<OrganizationUser[]> {
    try {
      return await this.find({
        where: { user: { id: userId } },
        relations: ['organization'],
      });
    } catch (error) {
      this.handleError(
        error,
        `Error finding organizations for user ID: ${userId}`
      );
    }
  }

  /**
   * Creates a new OrganizationUser relationship.
   * @param organizationUserData - Data for the new OrganizationUser relationship.
   * @returns The created OrganizationUser entity.
   */
  async createOrganizationUser(
    organizationUserData: DeepPartial<OrganizationUser>
  ): Promise<OrganizationUser> {
    try {
      return await this.create(organizationUserData);
    } catch (error) {
      this.handleError(error, 'Error creating new OrganizationUser');
    }
  }

  /**
   * Updates an existing OrganizationUser relationship by organization and user IDs.
   * @param organizationId - The ID of the organization.
   * @param userId - The ID of the user.
   * @param updateData - Partial data to update the OrganizationUser with.
   * @returns The updated OrganizationUser entity.
   */
  async updateOrganizationUser(
    organizationId: string,
    userId: string,
    updateData: DeepPartial<OrganizationUser>
  ): Promise<OrganizationUser | null> {
    try {
      const organizationUser = await this.getOrganizationUserByOrgAndUserIds(
        organizationId,
        userId
      );

      if (!organizationUser) {
        throw new Error(
          `OrganizationUser not found for organization ID ${organizationId} and user ID ${userId}`
        );
      }

      await this.update(organizationUser.id, updateData);
      return this.findById(organizationUser.id); // Return the updated entity
    } catch (error) {
      this.handleError(
        error,
        `Error updating OrganizationUser for organization ID ${organizationId} and user ID ${userId}`
      );
    }
  }

  /**
   * Updates the status of an OrganizationUser by organization and user IDs.
   * @param organizationId - The ID of the organization.
   * @param userId - The ID of the user.
   * @param status - The new status for the OrganizationUser.
   */
  async updateStatus(
    organizationId: string,
    userId: string,
    status: string
  ): Promise<void> {
    try {
      const organizationUser = await this.getOrganizationUserByOrgAndUserIds(
        organizationId,
        userId
      );
      if (!organizationUser) {
        throw new Error(
          `OrganizationUser not found for organization ID ${organizationId} and user ID ${userId}`
        );
      }
      await this.update(organizationUser.id, { status });
    } catch (error) {
      this.handleError(
        error,
        `Error updating status for organization ID ${organizationId} and user ID ${userId}`
      );
    }
  }

  /**
   * Soft deletes an OrganizationUser by organization and user IDs.
   * @param organizationId - The ID of the organization.
   * @param userId - The ID of the user.
   */
  async softDeleteOrganizationUser(
    organizationId: string,
    userId: string
  ): Promise<void> {
    try {
      const organizationUser = await this.getOrganizationUserByOrgAndUserIds(
        organizationId,
        userId
      );
      if (!organizationUser) {
        throw new Error(
          `OrganizationUser not found for organization ID ${organizationId} and user ID ${userId}`
        );
      }
      await this.softDelete(organizationUser.id);
    } catch (error) {
      this.handleError(
        error,
        `Error soft deleting OrganizationUser for organization ID ${organizationId} and user ID ${userId}`
      );
    }
  }

  /**
   * Restores a soft-deleted OrganizationUser by organization and user IDs.
   * @param organizationId - The ID of the organization.
   * @param userId - The ID of the user.
   */
  async restoreOrganizationUser(
    organizationId: string,
    userId: string
  ): Promise<void> {
    try {
      const organizationUser = await this.getOrganizationUserByOrgAndUserIds(
        organizationId,
        userId
      );
      if (!organizationUser) {
        throw new Error(
          `OrganizationUser not found for organization ID ${organizationId} and user ID ${userId}`
        );
      }
      await this.repository.restore(organizationUser.id);
    } catch (error) {
      this.handleError(
        error,
        `Error restoring OrganizationUser for organization ID ${organizationId} and user ID ${userId}`
      );
    }
  }
}

const organizationUserRepository = new OrganizationUserRepository();
export { organizationUserRepository as default, OrganizationUserRepository };

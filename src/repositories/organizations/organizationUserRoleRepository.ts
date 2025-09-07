import { DeepPartial } from 'typeorm';
import { OrganizationUserRole } from '../../entities/organizations/organizationUserRoleEntity';
import BaseRepository from '../baseRepository';

class OrganizationUserRoleRepository extends BaseRepository<OrganizationUserRole> {
  constructor() {
    super(OrganizationUserRole);
  }

  /**
   * Creates a new OrganizationUserRole.
   * @param organizationUserRoleData - Data for the new OrganizationUserRole.
   * @returns The created OrganizationUserRole entity.
   */
  async createOrganizationUserRole(
    organizationUserRoleData: DeepPartial<OrganizationUserRole>
  ): Promise<OrganizationUserRole> {
    try {
      return await this.create(organizationUserRoleData);
    } catch (error) {
      this.handleError(error, 'Error creating new OrganizationUserRole');
    }
  }

  /**
   * Finds all roles for a specific OrganizationUser.
   * @param organizationUserId - The ID of the OrganizationUser.
   * @returns Array of OrganizationUserRole entities.
   */
  async getRolesByOrganizationUserId(
    organizationUserId: string
  ): Promise<OrganizationUserRole[]> {
    try {
      return await this.find({
        where: { organizationUser: { id: organizationUserId } },
        relations: ['role'],
      });
    } catch (error) {
      this.handleError(
        error,
        `Error finding roles for OrganizationUser ID: ${organizationUserId}`
      );
    }
  }

  /**
   * Deletes an OrganizationUserRole by its ID.
   * @param id - The ID of the OrganizationUserRole to delete.
   */
  async deleteOrganizationUserRole(id: string): Promise<void> {
    try {
      await this.delete(id);
    } catch (error) {
      this.handleError(
        error,
        `Error deleting OrganizationUserRole with ID: ${id}`
      );
    }
  }

  /**
   * Deletes all roles for a specific OrganizationUser.
   * @param organizationUserId - The ID of the OrganizationUser.
   */
  async deleteRolesByOrganizationUserId(
    organizationUserId: string
  ): Promise<void> {
    try {
      const roles = await this.getRolesByOrganizationUserId(organizationUserId);
      await Promise.all(roles.map((role) => this.delete(role.id)));
    } catch (error) {
      this.handleError(
        error,
        `Error deleting roles for OrganizationUser ID: ${organizationUserId}`
      );
    }
  }
}

const organizationUserRoleRepository = new OrganizationUserRoleRepository();
export {
  organizationUserRoleRepository as default,
  OrganizationUserRoleRepository,
};

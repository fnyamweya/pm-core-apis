import { UserRole } from '../../entities/users/userRoleEntity';
import BaseRepository from '../baseRepository';

class UserRoleRepository extends BaseRepository<UserRole> {
  constructor() {
    super(UserRole);
  }

  /**
   * Finds roles associated with a specific user by user ID.
   * @param userId - The ID of the user.
   * @returns Array of UserRole entities associated with the user.
   */
  async getRolesByUserId(userId: string): Promise<UserRole[]> {
    try {
      return await this.find({ where: { user: { id: userId } } });
    } catch (error) {
      this.handleError(error, `Error finding roles for user ID: ${userId}`);
    }
  }

  /**
   * Adds a role to a specific user.
   * @param userId - The ID of the user.
   * @param roleId - The role code to be associated with the user.
   * @returns The created UserRole entity.
   */
  async addRoleToUser(userId: string, roleId: string): Promise<UserRole> {
    try {
      const userRoleData: Partial<UserRole> = {
        userId, // Ensuring correct relationship reference
        roleId,
      };
      return await this.create(userRoleData as UserRole);
    } catch (error) {
      this.handleError(
        error,
        `Error adding role ${roleId} to user ID: ${userId}`
      );
    }
  }

  /**
   * Removes a role from a specific user.
   * @param userId - The ID of the user.
   * @param roleId - The ID of the role to remove.
   */
  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    try {
      await this.delete({ roleId: roleId, user: { id: userId } } as any);
    } catch (error) {
      this.handleError(
        error,
        `Error removing role ${roleId} from user ID: ${userId}`
      );
    }
  }

  /**
   * Updates a specific role for a user.
   * @param roleId - The ID of the role to update.
   * @param updateData - Partial data to update the role.
   */
  async updateUserRole(
    roleId: string,
    updateData: Partial<UserRole>
  ): Promise<void> {
    try {
      await this.update(roleId, updateData);
    } catch (error) {
      this.handleError(error, `Error updating role ID: ${roleId}`);
    }
  }

  /**
   * Removes multiple roles from a user.
   * @param userId - The ID of the user.
   * @param roleIds - Array of role codes to be removed.
   */
  async bulkRemoveRolesFromUser(
    userId: string,
    roleIds: string[]
  ): Promise<void> {
    try {
      await this.bulkDelete({ roleId: roleIds, user: { id: userId } } as any);
    } catch (error) {
      this.handleError(
        error,
        `Error bulk removing roles for user ID: ${userId}`
      );
    }
  }

  /**
   * Removes all roles from a specific user.
   * @param userId - The ID of the user.
   */
  async removeAllRolesFromUser(userId: string): Promise<void> {
    try {
      await this.bulkDelete({ user: { id: userId } } as any);
    } catch (error) {
      this.handleError(
        error,
        `Error removing all roles for user ID: ${userId}`
      );
    }
  }
}

// Export an instance of `UserRoleRepository`
const userRoleRepository = new UserRoleRepository();
export { userRoleRepository as default, UserRoleRepository };

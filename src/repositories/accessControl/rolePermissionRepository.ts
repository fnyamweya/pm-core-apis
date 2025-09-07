import { EntityManager, FindOptionsWhere } from 'typeorm';
import { RolePermission } from '../../entities/accessControl/rolePermissionEntity';
import { logger } from '../../utils/logger';
import BaseRepository from '../baseRepository';

class RolePermissionRepository extends BaseRepository<RolePermission> {
  constructor() {
    super(RolePermission);
  }

  /**
   * Finds a role permission by ID.
   * @param id - The unique ID of the role permission.
   * @returns The role permission entity or null if not found.
   */
  async getRolePermissionById(id: string): Promise<RolePermission | null> {
    return await this.findOne({
      where: { id } as FindOptionsWhere<RolePermission>,
    });
  }

  /**
   * Checks if a role permission already exists by role ID and permission ID.
   * @param roleId - The ID of the role.
   * @param permissionId - The ID of the permission.
   * @returns True if the role permission exists, otherwise false.
   */
  async rolePermissionExistsById(
    roleId: string,
    permissionId: string
  ): Promise<boolean> {
    const count = await this.count({
      roleId: roleId,
      permissionId: permissionId,
    });
    return count > 0;
  }

  /**
   * Creates a new role permission.
   * @param rolePermissionData - The data for creating a new role permission.
   * @returns The created role permission entity.
   */
  async createRolePermission(
    rolePermissionData: Partial<RolePermission>
  ): Promise<RolePermission> {
    return await this.executeTransaction(async (manager: EntityManager) => {
      const rolePermission = manager.create(RolePermission, rolePermissionData);
      return await manager.save(rolePermission);
    });
  }

  /**
   * Deletes a role permission by ID.
   * @param id - The unique ID of the role permission.
   * @returns True if the role permission was deleted, otherwise false.
   */
  async deleteRolePermissionById(id: string): Promise<boolean> {
    return await this.executeTransaction(async (manager: EntityManager) => {
      const rolePermission = await manager.findOne(RolePermission, {
        where: { id },
      });
      if (rolePermission) {
        await manager.delete(RolePermission, rolePermission.id);
        return true;
      }
      return false;
    });
  }

  /**
   * Finds all role permissions for a given role ID.
   * @param roleId - The unique ID of the role.
   * @returns An array of role permissions with nested role and permission details.
   */
  async getRolePermissionsByRoleId(roleId: string): Promise<RolePermission[]> {
    return await this.find({
      where: { roleId } as FindOptionsWhere<RolePermission>,
      relations: ['role', 'permission'],
    });
  }

  /**
   * Finds all role permissions for a given permission ID.
   * @param permissionId - The unique ID of the permission.
   * @returns An array of role permissions with nested role and permission details.
   */
  async getRolePermissionsByPermissionId(
    permissionId: string
  ): Promise<RolePermission[]> {
    return await this.find({
      where: { permissionId } as FindOptionsWhere<RolePermission>,
      relations: ['role', 'permission'],
    });
  }

  /**
   * Finds a role permission by role ID and permission ID.
   * @param roleId - The ID of the role.
   * @param permissionId - The ID of the permission.
   * @returns The role permission entity or null if not found.
   */
  async getRolePermissionByRoleIdAndPermissionId(
    roleId: string,
    permissionId: string
  ): Promise<RolePermission | null> {
    try {
      return await this.findOne({
        where: { roleId, permissionId } as FindOptionsWhere<RolePermission>,
        relations: ['role', 'permission'],
      });
    } catch (error) {
      logger.error(
        'Error fetching role permission by role ID and permission ID',
        {
          roleId,
          permissionId,
          error,
        }
      );
      throw error;
    }
  }
}

// Export an instance of `RolePermissionRepository`
const rolePermissionRepository = new RolePermissionRepository();
export { rolePermissionRepository as default, RolePermissionRepository };

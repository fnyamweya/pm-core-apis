import { EntityManager, FindOptionsWhere } from 'typeorm';
import { Permission } from '../../entities/accessControl/permissionsEntity';
import BaseRepository from '../baseRepository';

class PermissionRepository extends BaseRepository<Permission> {
  constructor() {
    super(Permission);
  }

  /**
   * Finds a permission by its unique code.
   * @param code - The unique code of the permission (e.g., "read_user").
   * @returns The permission entity or null if not found.
   */
  async getPermissionByCode(code: string): Promise<Permission | null> {
    return await this.findOne({ where: { code, isActive: true } });
  }

  /**
   * Finds a permission by its unique ID.
   * @param id - The unique ID of the permission.
   * @returns The permission entity or null if not found.
   */
  async getPermissionById(id: string): Promise<Permission | null> {
    return await this.findOne({ where: { id, isActive: true } });
  }

  /**
   * Finds a permission's code by its unique ID.
   * @param id - The unique ID of the permission.
   * @returns The permission's code or null if not found.
   */
  async getPermissionCodeById(id: string): Promise<string | null> {
    const permission = await this.findOne({
      where: { id, isActive: true },
      select: ['code'],
    });
    return permission?.code ?? null;
  }

  /**
   * Checks if a permission code already exists.
   * @param code - The code to check for uniqueness.
   * @returns True if the code exists, otherwise false.
   */
  async codeExists(code: string): Promise<boolean> {
    const count = await this.count({ code });
    return count > 0;
  }

  /**
   * Checks if a permission ID already exists.
   * @param id - The ID to check for existence.
   * @returns True if the ID exists, otherwise false.
   */
  async idExists(id: string): Promise<boolean> {
    const count = await this.count({ id });
    return count > 0;
  }

  /**
   * Creates a new permission.
   * @param permissionData - The data for creating a new permission.
   * @returns The created permission entity.
   */
  async createPermission(
    permissionData: Partial<Permission>
  ): Promise<Permission> {
    return await this.executeTransaction(async (manager: EntityManager) => {
      const permission = manager.create(Permission, permissionData);
      return await manager.save(permission);
    });
  }

  /**
   * Updates a permission by ID.
   * @param id - The unique ID of the permission.
   * @param updateData - The data to update in the permission.
   * @returns The updated permission entity or null if not found.
   */
  async updatePermissionById(
    id: string,
    updateData: Partial<Permission>
  ): Promise<Permission | null> {
    return await this.executeTransaction(async (manager: EntityManager) => {
      const permission = await manager.findOne(Permission, {
        where: { id, isActive: true },
      });
      if (permission) {
        Object.assign(permission, updateData);
        return await manager.save(permission);
      }
      return null;
    });
  }

  /**
   * Deletes a permission by ID.
   * @param id - The unique ID of the permission.
   * @returns True if the permission was deleted, otherwise false.
   */
  async deletePermissionById(id: string): Promise<boolean> {
    return await this.executeTransaction(async (manager: EntityManager) => {
      const permission = await manager.findOne(Permission, {
        where: { id, isActive: true },
      });
      if (permission) {
        await manager.delete(Permission, permission.id);
        return true;
      }
      return false;
    });
  }

  /**
   * Finds all active permissions.
   * @returns An array of active permissions.
   */
  async getAllActivePermissions(): Promise<Permission[]> {
    return await this.find({ where: { isActive: true } });
  }

  /**
   * Checks if a permission exists by name.
   * @param name - The name of the permission.
   * @returns True if the permission exists, otherwise false.
   */
  async permissionExistsByName(name: string): Promise<boolean> {
    const count = await this.count({ name });
    return count > 0;
  }

  /**
   * Updates the active status of a permission by ID.
   * @param id - The ID of the permission.
   * @param isActive - The new active status of the permission.
   * @returns The updated permission entity or null if not found.
   */
  async updatePermissionStatusById(
    id: string,
    isActive: boolean
  ): Promise<Permission | null> {
    return await this.updatePermissionById(id, { isActive });
  }

  /**
   * Finds permissions by multiple criteria.
   * @param criteria - An object containing criteria to filter permissions by (e.g., name, isActive).
   * @returns An array of permissions matching the criteria.
   */
  async findPermissionsByCriteria(
    criteria: FindOptionsWhere<Permission>
  ): Promise<Permission[]> {
    return await this.find({ where: criteria });
  }
}

// Export an instance of `PermissionRepository`
const permissionRepository = new PermissionRepository();
export { permissionRepository as default, PermissionRepository };

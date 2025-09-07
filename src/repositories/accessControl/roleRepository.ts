import { EntityManager, FindOptionsWhere } from 'typeorm';
import { Role } from '../../entities/accessControl/roleEntity';
import { NamespaceGenerator } from '../../utils/crypto'; // Import the NamespaceGenerator
import BaseRepository from '../baseRepository';

class RoleRepository extends BaseRepository<Role> {
  constructor() {
    super(Role);
  }

  /**
   * Finds a role by its unique ID.
   * @param id - The unique ID of the role.
   * @returns The role entity or null if not found.
   */
  async getRoleById(id: string): Promise<Role | null> {
    return await this.findOne({ where: { id, isActive: true } });
  }

  /**
   * Checks if a role ID already exists.
   * @param id - The ID to check for existence.
   * @returns True if the ID exists, otherwise false.
   */
  async idExists(id: string): Promise<boolean> {
    const count = await this.count({ id });
    return count > 0;
  }

  /**
   * Creates a new role.
   * @param roleData - The data for creating a new role.
   * @returns The created role entity.
   */
  async createRole(roleData: Partial<Role>): Promise<Role> {
    return await this.executeTransaction(async (manager: EntityManager) => {
      // Generate the ID using the NamespaceGenerator
      const id = NamespaceGenerator.generateNamespace(roleData.name || '');
      const role = manager.create(Role, { ...roleData, id });
      return await manager.save(role);
    });
  }

  /**
   * Updates a role by ID.
   * @param id - The unique ID of the role.
   * @param updateData - The data to update in the role.
   * @returns The updated role entity or null if not found.
   */
  async updateRoleById(
    id: string,
    updateData: Partial<Role>
  ): Promise<Role | null> {
    return await this.executeTransaction(async (manager: EntityManager) => {
      const role = await manager.findOne(Role, {
        where: { id, isActive: true },
      });
      if (role) {
        Object.assign(role, updateData);
        return await manager.save(role);
      }
      return null;
    });
  }

  /**
   * Deletes a role by ID.
   * @param id - The unique ID of the role.
   * @returns True if the role was deleted, otherwise false.
   */
  async deleteRoleById(id: string): Promise<boolean> {
    return await this.executeTransaction(async (manager: EntityManager) => {
      const role = await manager.findOne(Role, {
        where: { id, isActive: true },
      });
      if (role) {
        await manager.delete(Role, role.id);
        return true;
      }
      return false;
    });
  }

  /**
   * Finds all active roles.
   * @returns An array of active roles.
   */
  async getAllActiveRoles(): Promise<Role[]> {
    return await this.find({ where: { isActive: true } });
  }

  /**
   * Checks if a role exists by name.
   * @param name - The name of the role.
   * @returns True if the role exists, otherwise false.
   */
  async roleExistsByName(name: string): Promise<boolean> {
    const count = await this.count({ name });
    return count > 0;
  }

  /**
   * Updates the active status of a role by ID.
   * @param id - The ID of the role.
   * @param isActive - The new active status of the role.
   * @returns The updated role entity or null if not found.
   */
  async updateRoleStatusById(
    id: string,
    isActive: boolean
  ): Promise<Role | null> {
    return await this.updateRoleById(id, { isActive });
  }

  /**
   * Finds roles by multiple criteria.
   * @param criteria - An object containing criteria to filter roles by (e.g., name, isActive).
   * @returns An array of roles matching the criteria.
   */
  async findRolesByCriteria(criteria: FindOptionsWhere<Role>): Promise<Role[]> {
    return await this.find({ where: criteria });
  }
}

// Export an instance of `RoleRepository`
const roleRepository = new RoleRepository();
export { roleRepository as default, RoleRepository };

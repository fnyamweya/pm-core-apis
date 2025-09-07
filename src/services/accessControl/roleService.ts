import { Role } from '../../entities/accessControl/roleEntity';
import roleRepository from '../../repositories/accessControl/roleRepository';
import { logger } from '../../utils/logger';
import RedisCache from '../../utils/redisCache';
import { BaseService } from '../baseService';

interface CreateRoleDTO {
  name: string;
  description?: string;
}

interface UpdateRoleDTO {
  name?: string;
  description?: string;
  isActive?: boolean;
}

class RoleService extends BaseService<Role> {
  private readonly cacheNamespace = 'role';
  private readonly allRolesCacheKey = 'allRoles';

  constructor() {
    super(
      {
        repository: roleRepository,
        redisCache: new RedisCache<Role>(3600), // 1-hour TTL for role cache
        logger,
      },
      'role'
    );

    this.logger.info('RoleService initialized');
  }

  private generateCacheKey(key: string): string {
    return `${this.cacheNamespace}:${key}`;
  }

  async createRole(data: CreateRoleDTO): Promise<Role> {
    this.logger.info('Creating a new role', { data });

    // Check if a role with the given name already exists
    const existingRole = await roleRepository.getRoleById(data.name);
    if (existingRole) {
      this.logger.info('Role with the given name already exists', {
        name: data.name,
      });
      throw new Error(`Role with name "${data.name}" already exists`);
    }

    // Create a new role instance
    const role = new Role();
    role.name = data.name;
    role.description = data.description;

    // Save the role to the database
    const createdRole = await roleRepository.createRole(role);
    this.logger.info('Role created successfully', { roleId: createdRole.id });

    // Cache the created role and invalidate relevant caches
    await this.cacheRole(createdRole);
    await this.invalidateAllRolesCache();

    return createdRole;
  }

  async updateRole(roleId: string, data: UpdateRoleDTO): Promise<Role | null> {
    this.logger.info('Updating role', { roleId, data });

    const role = await this.getById(roleId);
    if (!role) throw new Error('Role not found');
    await this.invalidateCache(role);

    await roleRepository.updateRoleById(roleId, {
      name: data.name,
      description: data.description,
      isActive: data.isActive,
    });
    this.logger.info('Role updated in repository', { roleId });

    await this.cacheRole(role);
    await this.invalidateAllRolesCache(); // Invalidate the cache for all roles

    return role;
  }

  async getById(id: string): Promise<Role> {
    const cacheKey = this.generateCacheKey(id);
    let role = await this.cache.getFromCache(this.cacheNamespace, cacheKey);

    if (!role) {
      role = await roleRepository.getRoleById(id);
      if (role) {
        await this.cacheRole(role);
        this.logger.info('Role retrieved from repository and cached', {
          roleId: role.id,
        });
      } else {
        this.logger.info('Role not found in repository', { id });
      }
    } else {
      if (typeof role === 'string') {
        throw new Error('Role retrieved is not valid');
      }
      this.logger.info('Role found in cache', { roleId: role.id });
    }

    if (!role) throw new Error('Role not found');
    return role as Role;
  }

  async deleteRole(roleId: string): Promise<void> {
    this.logger.info('Deleting role', { roleId });

    const role = await this.getById(roleId);
    if (!role) throw new Error('Role not found');
    await this.invalidateCache(role);

    await roleRepository.deleteRoleById(roleId);
    this.logger.info('Role deleted from repository', { roleId });

    await this.invalidateAllRolesCache(); // Invalidate the cache for all roles
  }

  private async assertUniqueRole(id: string): Promise<void> {
    this.logger.info('Checking if role is unique', { id });

    try {
      const existingRole = await roleRepository.getRoleById(id);
      if (existingRole) throw new Error('Role with given ID already exists');
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'Role not found') {
        this.logger.info('Role is unique', { id });
        return;
      }
      throw error;
    }
  }

  private async cacheRole(role: Role): Promise<void> {
    const cacheKey = this.generateCacheKey(role.id);
    await this.cache.setToCache(this.cacheNamespace, cacheKey, role);
    this.logger.info('Role cached', { roleId: role.id });
  }

  private async invalidateCache(role: Role): Promise<void> {
    const cacheKey = this.generateCacheKey(role.id);
    await this.cache.deleteKey(this.cacheNamespace, cacheKey);
    this.logger.info('Role cache invalidated', { roleId: role.id });
  }

  private async invalidateAllRolesCache(): Promise<void> {
    const cacheKey = this.generateCacheKey(this.allRolesCacheKey);
    await this.cache.deleteKey(this.cacheNamespace, cacheKey);
    this.logger.info('All roles cache invalidated');
  }
}

export default new RoleService();

import { RolePermission } from '../../entities/accessControl/rolePermissionEntity';
import rolePermissionRepository from '../../repositories/accessControl/rolePermissionRepository';
import { logger } from '../../utils/logger';
import RedisCache from '../../utils/redisCache';
import { BaseService } from '../baseService';

interface CreateRolePermissionDTO {
  roleId: string;
  permissionId: string;
}

class RolePermissionService extends BaseService<RolePermission> {
  private rolePermissionCache: RedisCache<RolePermission>;
  private rolePermissionsListCache: RedisCache<string[]>;

  constructor() {
    super(
      {
        repository: rolePermissionRepository,
        redisCache: new RedisCache<RolePermission>(3600),
        logger,
      },
      'rolePermission'
    );
    this.rolePermissionCache = new RedisCache<RolePermission>(3600);
    this.rolePermissionsListCache = new RedisCache<string[]>(3600);
    this.logger.info('RolePermissionService initialized');
  }

  private generateCacheKey(namespace: string, key: string): string {
    return `${namespace}:${key}`;
  }

  async createRolePermission(
    data: CreateRolePermissionDTO
  ): Promise<RolePermission> {
    this.logger.info('Creating a new role permission', { data });

    await this.assertUniqueRolePermission(data.roleId, data.permissionId);

    const rolePermission = await rolePermissionRepository.createRolePermission({
      roleId: data.roleId,
      permissionId: data.permissionId,
    });

    await this.cacheRolePermission(rolePermission);
    await this.cachePermissionsForRole(data.roleId);

    this.logger.info('Role permission created and cached successfully', {
      rolePermissionId: rolePermission.id,
    });
    return rolePermission;
  }

  async getPermissionsByRole(roleId: string): Promise<any[]> {
    this.logger.info('Fetching permissions for role', { roleId });

    const cacheKey = this.generateCacheKey('rolePermissions', roleId);
    let permissions = await this.rolePermissionsListCache.getFromCache(
      'rolePermissions',
      roleId
    );

    if (!permissions) {
      const rolePermissions =
        await rolePermissionRepository.getRolePermissionsByRoleId(roleId);
      permissions = rolePermissions.map((rp) => rp.id);
      await this.rolePermissionsListCache.setToCache(
        'rolePermissions',
        cacheKey,
        permissions || []
      );

      this.logger.info('Permissions cached for role', { roleId });
    } else {
      this.logger.info('Permissions found in cache', { roleId });
    }

    return Array.isArray(permissions) ? permissions : [];
  }

  async getById(id: string): Promise<RolePermission> {
    this.logger.info('Fetching role permission by ID', { id });

    const cacheKey = this.generateCacheKey('rolePermission', id);
    let rolePermission = await this.rolePermissionCache.getFromCache(
      'rolePermission',
      cacheKey
    );

    if (!rolePermission) {
      rolePermission = await rolePermissionRepository.getRolePermissionById(id);
      if (!rolePermission) {
        throw new Error('Role permission not found');
      }
      await this.cacheRolePermission(rolePermission);
      this.logger.info('Role permission retrieved and cached', { id });
    }

    if (typeof rolePermission === 'string') {
      throw new Error('Invalid role permission type');
    }

    return rolePermission;
  }

  async getByRoleIdAndPermissionId(
    roleId: string,
    permissionId: string
  ): Promise<RolePermission> {
    this.logger.info('Fetching role permission by role ID and permission ID', {
      roleId,
      permissionId,
    });

    const cacheKey = this.generateCacheKey(
      'rolePermission',
      `${roleId}:${permissionId}`
    );
    let rolePermission = await this.rolePermissionCache.getFromCache(
      'rolePermission',
      cacheKey
    );

    if (!rolePermission) {
      rolePermission =
        await rolePermissionRepository.getRolePermissionByRoleIdAndPermissionId(
          roleId,
          permissionId
        );
      if (!rolePermission) {
        throw new Error('Role permission not found');
      }
      await this.cacheRolePermission(rolePermission);
      this.logger.info('Role permission retrieved and cached', {
        rolePermissionId: rolePermission.id,
      });
    }

    if (typeof rolePermission === 'string') {
      throw new Error('Invalid role permission type');
    }

    return rolePermission;
  }

  async deleteRolePermission(id: string): Promise<void> {
    this.logger.info('Deleting role permission', { id });

    const rolePermission = await this.getById(id);
    if (!rolePermission) throw new Error('Role permission not found');

    await this.invalidateCache(rolePermission);
    await rolePermissionRepository.deleteRolePermissionById(id);

    await this.cachePermissionsForRole(rolePermission.roleId); // Refresh permissions list cache for role
    this.logger.info('Role permission deleted and cache invalidated', { id });
  }

  private async assertUniqueRolePermission(
    roleId: string,
    permissionId: string
  ): Promise<void> {
    this.logger.info('Checking if role permission is unique', {
      roleId,
      permissionId,
    });

    const exists = await rolePermissionRepository.rolePermissionExistsById(
      roleId,
      permissionId
    );
    if (exists) {
      throw new Error('Role permission with given identifiers already exists');
    }
  }

  private async cacheRolePermission(
    rolePermission: RolePermission
  ): Promise<void> {
    const cacheKey = this.generateCacheKey('rolePermission', rolePermission.id);
    await this.rolePermissionCache.setToCache(
      'rolePermission',
      cacheKey,
      rolePermission
    );
    this.logger.info('Role permission cached', {
      rolePermissionId: rolePermission.id,
    });
  }

  private async cachePermissionsForRole(roleId: string): Promise<void> {
    const permissions = await this.getPermissionsByRole(roleId);
    const cacheKey = this.generateCacheKey('rolePermissions', roleId);
    await this.rolePermissionsListCache.setToCache(
      'rolePermissions',
      cacheKey,
      permissions || []
    );
  }

  private async invalidateCache(rolePermission: RolePermission): Promise<void> {
    const cacheKey = this.generateCacheKey('rolePermission', rolePermission.id);
    await this.rolePermissionCache.deleteKey('rolePermission', cacheKey);
    await this.rolePermissionsListCache.deleteKey(
      'rolePermissions',
      rolePermission.roleId
    );
    this.logger.info('Role permission cache invalidated', {
      rolePermissionId: rolePermission.id,
    });
  }
}

export default new RolePermissionService();

import { Permission } from '../../entities/accessControl/permissionsEntity';
import permissionRepository from '../../repositories/accessControl/permissionRepository';
import { NamespaceGenerator } from '../../utils/crypto';
import { logger } from '../../utils/logger';
import RedisCache from '../../utils/redisCache';
import { BaseService } from '../baseService';

interface CreatePermissionDTO {
  name: string;
  description?: string;
  category?: string;
}

interface UpdatePermissionDTO {
  name?: string;
  description?: string;
  category?: string;
  isActive?: boolean;
}

class PermissionService extends BaseService<Permission> {
  private readonly cacheNamespace = 'permission';
  private readonly allPermissionsCacheKey = 'allPermissions';

  constructor() {
    super(
      {
        repository: permissionRepository,
        redisCache: new RedisCache<Permission>(3600), // 1-hour TTL for permission cache
        logger,
      },
      'permission'
    );

    this.logger.info('PermissionService initialized');
  }

  private generateCacheKey(key: string): string {
    return `${this.cacheNamespace}:${key}`;
  }

  async createPermission(data: CreatePermissionDTO): Promise<Permission> {
    this.logger.info('Creating a new permission', { data });

    const normalizedCode = NamespaceGenerator.generateNamespace(data.name);

    await this.assertUniquePermission(normalizedCode);

    const permission = await permissionRepository.createPermission({
      code: normalizedCode,
      name: data.name,
      description: data.description,
      category: data.category,
    });
    this.logger.info('Permission created successfully', {
      permissionId: permission.id,
    });

    await this.cachePermission(permission);
    await this.invalidateAllPermissionsCache(); // Invalidate the cache for all permissions

    return permission;
  }

  async updatePermission(
    permissionId: string,
    data: UpdatePermissionDTO
  ): Promise<Permission | null> {
    this.logger.info('Updating permission', { permissionId, data });

    const permission = await this.getById(permissionId);
    if (!permission) throw new Error('Permission not found');
    await this.invalidateCache(permission);

    await permissionRepository.updatePermissionById(permissionId, {
      name: data.name,
      description: data.description,
      category: data.category,
      isActive: data.isActive,
    });
    this.logger.info('Permission updated in repository', { permissionId });

    await this.cachePermission(permission);
    await this.invalidateAllPermissionsCache(); // Invalidate the cache for all permissions

    return permission;
  }

  async getById(id: string): Promise<Permission> {
    const cacheKey = this.generateCacheKey(id);
    let permission = await this.cache.getFromCache(
      this.cacheNamespace,
      cacheKey
    );

    if (typeof permission === 'string') {
      throw new Error('Cache returned a string instead of Permission');
    }

    if (!permission) {
      permission = await permissionRepository.getPermissionById(id);
      if (permission) {
        await this.cachePermission(permission);
        this.logger.info('Permission retrieved from repository and cached', {
          permissionId: permission.id,
        });
      } else {
        this.logger.info('Permission not found in repository', { id });
      }
    } else {
      this.logger.info('Permission found in cache', {
        permissionId: permission.id,
      });
    }

    if (!permission) throw new Error('Permission not found');
    return permission;
  }

  async getByCode(code: string): Promise<Permission> {
    const cacheKey = this.generateCacheKey(code);
    let permission = await this.cache.getFromCache(
      this.cacheNamespace,
      cacheKey
    );

    if (typeof permission === 'string') {
      throw new Error('Cache returned a string instead of Permission');
    }

    if (!permission) {
      this.logger.info(
        'Permission not found in cache, fetching from repository',
        {
          code,
        }
      );
      permission = await permissionRepository.getPermissionByCode(code); // Fetch permission by code from the database

      if (permission) {
        await this.cache.setToCache(this.cacheNamespace, cacheKey, permission); // Cache the permission for future use
        this.logger.info('Permission retrieved from repository and cached', {
          permissionCode: code,
        });
      } else {
        this.logger.warn('Permission not found in repository', { code });
        throw new Error('Permission not found');
      }
    } else {
      this.logger.info('Permission found in cache', { permissionCode: code });
    }

    return permission;
  }

  async getPermissionCodeById(id: string): Promise<string | null> {
    const cacheKey = this.generateCacheKey(`code:${id}`);
    const cachedValue = await this.cache.getFromCache<string>(
      this.cacheNamespace,
      cacheKey
    );

    if (!cachedValue) {
      this.logger.info(
        'Permission code not found in cache, fetching from repository',
        {
          id,
        }
      );
      const code = await permissionRepository.getPermissionCodeById(id);

      if (code) {
        await this.cache.setToCache(this.cacheNamespace, cacheKey, code); // Cache the permission code for future use
        this.logger.info(
          'Permission code retrieved from repository and cached',
          {
            permissionId: id,
          }
        );
        return code;
      } else {
        this.logger.warn('Permission code not found in repository', { id });
        return null;
      }
    } else {
      this.logger.info('Permission code found in cache', { permissionId: id });
      return cachedValue;
    }
  }

  async deletePermission(permissionId: string): Promise<void> {
    this.logger.info('Deleting permission', { permissionId });

    const permission = await this.getById(permissionId);
    if (!permission) throw new Error('Permission not found');
    await this.invalidateCache(permission);

    await permissionRepository.deletePermissionById(permissionId);
    this.logger.info('Permission deleted from repository', { permissionId });

    await this.invalidateAllPermissionsCache(); // Invalidate the cache for all permissions
  }

  private async assertUniquePermission(code: string): Promise<void> {
    this.logger.info('Checking if permission is unique', { code });

    try {
      const existingPermission =
        await permissionRepository.getPermissionByCode(code);
      if (existingPermission)
        throw new Error('Permission with given code already exists');
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'Permission not found') {
        this.logger.info('Permission is unique', { code });
        return;
      }
      throw error;
    }
  }

  private async cachePermission(permission: Permission): Promise<void> {
    const cacheKey = this.generateCacheKey(permission.id);
    await this.cache.setToCache(this.cacheNamespace, cacheKey, permission);
    this.logger.info('Permission cached', {
      permissionId: permission.id,
    });
  }

  private async invalidateCache(permission: Permission): Promise<void> {
    const cacheKey = this.generateCacheKey(permission.id);
    await this.cache.deleteKey(this.cacheNamespace, cacheKey);
    this.logger.info('Permission cache invalidated', {
      permissionId: permission.id,
    });
  }

  private async invalidateAllPermissionsCache(): Promise<void> {
    const cacheKey = this.generateCacheKey(this.allPermissionsCacheKey);
    await this.cache.deleteKey(this.cacheNamespace, cacheKey);
    this.logger.info('All permissions cache invalidated');
  }
}

export default new PermissionService();

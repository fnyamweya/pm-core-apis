import { UserRole } from '../../entities/users/userRoleEntity';
import userRoleRepository from '../../repositories/users/userRoleRepository';
import { logger } from '../../utils/logger';
import RedisCache from '../../utils/redisCache';
import { BaseService } from '../baseService';

interface CreateUserRoleDTO {
  userId: string;
  roleId: string;
}

/**
 * UserRoleService provides business logic for managing user roles,
 * including caching and role-specific operations.
 */
class UserRoleService extends BaseService<UserRole> {
  private roleCache: RedisCache<UserRole[]>;

  constructor() {
    super(
      {
        repository: userRoleRepository,
        redisCache: new RedisCache<UserRole>(3600),
        logger,
      },
      'userRole'
    );

    this.roleCache = new RedisCache<UserRole[]>(3600); // Cache for role arrays by user ID
    this.logger.info('UserRoleService initialized');
  }

  async createUserRole(data: CreateUserRoleDTO): Promise<UserRole> {
    this.logger.info('Creating a new user role association', { data });
    try {
      const userRole = await userRoleRepository.addRoleToUser(
        data.userId,
        data.roleId
      );
      this.logger.info('User role created successfully', { userRole });

      // Refresh the cache after creating a role
      await this.cacheUserRoles(data.userId);
      return userRole;
    } catch (error) {
      this.logger.error('Error creating user role', { data, error });
      throw error;
    }
  }

  async getRolesByUserId(userId: string): Promise<UserRole[]> {
    this.logger.info('Fetching roles by user ID', { userId });
    const cacheKey = this.getUserRolesCacheKey(userId);

    try {
      let roles = (await this.roleCache.getFromCache(
        'userRoles',
        userId
      )) as UserRole[];
      if (!roles) {
        roles = await userRoleRepository.getRolesByUserId(userId);
        if (roles.length > 0) {
          // Ensure the setToCache call includes all required arguments
          await this.roleCache.setToCache('userRoles', userId, roles);
          this.logger.info(
            'User roles cached after retrieval from repository',
            {
              userId,
            }
          );
        }
      } else {
        this.logger.info('User roles found in cache', { userId });
      }
      return roles;
    } catch (error) {
      this.logger.error('Error fetching user roles', { userId, error });
      throw error;
    }
  }

  async deleteUserRole(userId: string, roleId: string): Promise<void> {
    this.logger.info('Deleting user role association', { userId, roleId });
    try {
      await userRoleRepository.removeRoleFromUser(userId, roleId);
      this.logger.info('User role deleted successfully', { userId, roleId });

      await this.invalidateCache(userId);
    } catch (error) {
      this.logger.error('Error deleting user role', { userId, roleId, error });
      throw error;
    }
  }

  async removeAllRolesFromUser(userId: string): Promise<void> {
    this.logger.info('Removing all roles for user', { userId });
    try {
      await userRoleRepository.removeAllRolesFromUser(userId);
      this.logger.info('All user roles removed successfully', { userId });

      await this.invalidateCache(userId);
    } catch (error) {
      this.logger.error('Error removing all user roles', { userId, error });
      throw error;
    }
  }

  async bulkRemoveRolesFromUser(
    userId: string,
    roleIds: string[]
  ): Promise<void> {
    this.logger.info('Bulk removing roles for user', { userId, roleIds });
    try {
      await userRoleRepository.bulkRemoveRolesFromUser(userId, roleIds);
      this.logger.info('Bulk user roles removed successfully', {
        userId,
        roleIds,
      });

      await this.invalidateCache(userId);
    } catch (error) {
      this.logger.error('Error bulk removing user roles', {
        userId,
        roleIds,
        error,
      });
      throw error;
    }
  }

  async updateUserRole(
    userId: string,
    roleId: string,
    updateData: Partial<UserRole>
  ): Promise<void> {
    this.logger.info('Updating user role association', {
      userId,
      roleId,
      updateData,
    });
    try {
      await userRoleRepository.updateUserRole(userId, updateData);
      this.logger.info('User role updated successfully', {
        userId,
        roleId,
        updateData,
      });

      await this.invalidateCache(userId);
    } catch (error) {
      this.logger.error('Error updating user role', {
        userId,
        roleId,
        updateData,
        error,
      });
      throw error;
    }
  }

  /**
   * Retrieves and caches user roles by user ID.
   * Called after any change to the user's roles.
   * @param userId - The ID of the user whose roles are cached.
   */
  private async cacheUserRoles(userId: string): Promise<void> {
    const cacheKey = this.getUserRolesCacheKey(userId);

    try {
      const roles = await userRoleRepository.getRolesByUserId(userId);
      if (roles.length > 0) {
        // Ensure all required arguments are provided in setToCache
        await this.roleCache.setToCache('userRoles', userId, roles);
        this.logger.info('User roles cached', { userId });
      } else {
        await this.roleCache.deleteKey('userRoles', userId);
      }
    } catch (error) {
      this.logger.error('Error caching user roles', { userId, error });
    }
  }

  /**
   * Invalidates the cache for a given user's roles.
   * @param userId - The ID of the user whose cache needs invalidation.
   */
  private async invalidateCache(userId: string): Promise<void> {
    try {
      await this.roleCache.deleteKey('userRoles', userId);
      this.logger.info('User role cache invalidated', { userId });
    } catch (error) {
      this.logger.error('Error invalidating user role cache', {
        userId,
        error,
      });
    }
  }

  /**
   * Helper function to generate consistent cache keys.
   * @param userId - The user ID for which the cache key is generated.
   * @returns The generated cache key.
   */
  private getUserRolesCacheKey(userId: string): string {
    return `userRoles:${userId}`;
  }
}

export default new UserRoleService();

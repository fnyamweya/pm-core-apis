import { DeepPartial } from 'typeorm';
import { OrganizationUserRole } from '../../entities/organizations/organizationUserRoleEntity';
import organizationUserRoleRepository from '../../repositories/organizations/organizationUserRoleRepository';
import { logger } from '../../utils/logger';
import RedisCache from '../../utils/redisCache';
import { BaseService } from '../baseService';

interface CreateOrganizationUserRoleDTO {
  organizationUserId: string;
  roleId: string;
}

class OrganizationUserRoleService extends BaseService<OrganizationUserRole> {
  private roleCache: RedisCache<OrganizationUserRole[]>;

  constructor() {
    super(
      {
        repository: organizationUserRoleRepository,
        redisCache: new RedisCache<OrganizationUserRole>(3600),
        logger,
      },
      'organizationUserRole'
    );

    this.roleCache = new RedisCache<OrganizationUserRole[]>(3600);
    this.logger.info('OrganizationUserRoleService initialized');
  }

  /**
   * Creates a new role for an organization user.
   * @param data - Data for creating a new OrganizationUserRole.
   * @returns The created OrganizationUserRole entity.
   */
  async createOrganizationUserRole(
    data: CreateOrganizationUserRoleDTO
  ): Promise<OrganizationUserRole> {
    this.logger.info('Creating new organization user role', { data });

    const organizationUserRoleData: DeepPartial<OrganizationUserRole> = {
      organizationUser: { id: data.organizationUserId },
      role: { id: data.roleId },
    };

    const organizationUserRole =
      await organizationUserRoleRepository.createOrganizationUserRole(
        organizationUserRoleData
      );
    await this.cacheRolesByOrganizationUserId(data.organizationUserId);

    return organizationUserRole;
  }

  /**
   * Retrieves all roles for a specific organization user, using cache if available.
   * @param organizationUserId - The ID of the organization user.
   * @returns Array of OrganizationUserRole entities.
   */
  async getRolesByOrganizationUserId(
    organizationUserId: string
  ): Promise<OrganizationUserRole[]> {
    this.logger.info('Fetching roles for organization user by ID', {
      organizationUserId,
    });

    let roles: OrganizationUserRole[] =
      ((await this.roleCache.getFromCache(
        'organizationUserRoles',
        organizationUserId
      )) as OrganizationUserRole[]) || [];
    if (!roles) {
      roles =
        await organizationUserRoleRepository.getRolesByOrganizationUserId(
          organizationUserId
        );
      if (roles.length > 0) {
        await this.roleCache.setToCache(
          'organizationUserRoles',
          organizationUserId,
          roles
        );
      }
    } else {
      this.logger.info('Roles found in cache for organization user', {
        organizationUserId,
      });
    }

    return roles;
  }

  /**
   * Deletes a role by ID.
   * @param id - The ID of the OrganizationUserRole to delete.
   */
  async deleteOrganizationUserRole(id: string): Promise<void> {
    this.logger.info('Deleting organization user role by ID', { id });

    await organizationUserRoleRepository.deleteOrganizationUserRole(id);
    await this.roleCache.deleteKey('organizationUserRoles', id);
  }

  /**
   * Deletes all roles for a specific organization user.
   * @param organizationUserId - The ID of the organization user.
   */
  async deleteRolesByOrganizationUserId(
    organizationUserId: string
  ): Promise<void> {
    this.logger.info('Deleting all roles for organization user by ID', {
      organizationUserId,
    });

    await organizationUserRoleRepository.deleteRolesByOrganizationUserId(
      organizationUserId
    );
    await this.roleCache.deleteKey('organizationUserRoles', organizationUserId);
  }

  /**
   * Caches roles by organization user ID.
   * @param organizationUserId - The ID of the organization user.
   */
  private async cacheRolesByOrganizationUserId(
    organizationUserId: string
  ): Promise<void> {
    const roles = await this.getRolesByOrganizationUserId(organizationUserId);
    await this.roleCache.setToCache(
      'organizationUserRoles',
      organizationUserId,
      roles
    );
    this.logger.info('Organization user roles cached by organization user ID', {
      organizationUserId,
    });
  }
}

export default new OrganizationUserRoleService();

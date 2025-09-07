import { plainToInstance } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  validateOrReject,
} from 'class-validator';

import { OrganizationUser, OrganizationUserRole } from '../../entities/organizations/organizationUserEntity';
import organizationUserRepository from '../../repositories/organizations/organizationUserRepository';
import { Organization } from '../../entities/organizations/organizationEntity';
import { logger } from '../../utils/logger';
import RedisCache from '../../utils/redisCache';
import { BaseService } from '../baseService';

class AddUserToOrgWithRolesDto {
  @IsUUID()
  organizationId!: string;

  @IsUUID()
  userId!: string;

  @IsOptional()
  @IsArray()
  @IsEnum(OrganizationUserRole, { each: true })
  roles?: OrganizationUserRole[];

  @IsOptional()
  @IsString()
  status?: string;
}

class ReplaceRolesDto {
  @IsUUID()
  organizationId!: string;

  @IsUUID()
  userId!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(OrganizationUserRole, { each: true })
  roles!: OrganizationUserRole[];
}

/** Remove specific roles */
class RemoveRolesDto {
  @IsUUID()
  organizationId!: string;

  @IsUUID()
  userId!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(OrganizationUserRole, { each: true })
  roles!: OrganizationUserRole[];
}

class OrganizationUserService extends BaseService<OrganizationUser> {
  private organizationUserCache: RedisCache<OrganizationUser>;

  constructor() {
    super(
      {
        repository: organizationUserRepository,
        redisCache: new RedisCache<OrganizationUser>(3600),
        logger,
      },
      'organizationUser'
    );

    this.organizationUserCache = new RedisCache<OrganizationUser>(3600);
    this.logger.info('OrganizationUserService initialized');
  }


  private async validate<T>(cls: new () => T, data: unknown): Promise<T> {
    const dto = plainToInstance(cls, data, { enableImplicitConversion: true });
    await validateOrReject(dto as object);
    return dto;
  }

  private cacheKey(orgId: string, userId: string) {
    return `${orgId}-${userId}`;
  }

  /**
   * Retrieves an OrganizationUser by organization ID and user ID (cache-aware).
   */
  async getOrganizationUserByOrgAndUserIds(
    organizationId: string,
    userId: string
  ): Promise<OrganizationUser | null> {
    this.logger.info('Fetching OrganizationUser by organization and user IDs', {
      organizationId,
      userId,
    });

    const key = this.cacheKey(organizationId, userId);
    let organizationUser = await this.organizationUserCache.getFromCache('organizationUser', key);

    if (!organizationUser) {
      organizationUser = await organizationUserRepository.getOrganizationUserByOrgAndUserIds(
        organizationId,
        userId
      );
      if (organizationUser) {
        await this.organizationUserCache.setToCache('organizationUser', key, organizationUser);
      }
    }

    return (organizationUser as OrganizationUser) || null;
  }

  /**
   * Alias to get membership via cache-aware path.
   */
  async getUserMembership(
    organizationId: string,
    userId: string
  ): Promise<OrganizationUser | null> {
    return this.getOrganizationUserByOrgAndUserIds(organizationId, userId);
  }

  // ---------- Create / Update with roles ----------

  /**
   * Adds a user to an organization and sets/merges roles in one transaction.
   * - Creates membership if missing
   * - Merges roles if provided (deduplicates)
   * - Updates status if provided
   */
  async addUserToOrganizationWithRoles(input: AddUserToOrgWithRolesDto): Promise<OrganizationUser> {
    const dto = await this.validate(AddUserToOrgWithRolesDto, input);
    const { organizationId, userId, roles, status } = dto;

    this.logger.info('Adding user to organization with roles', dto);

    const saved = await organizationUserRepository.executeTransaction(async (em) => {
      let membership = await em.findOne(OrganizationUser, {
        where: {
          organization: { id: organizationId } as any,
          user: { id: userId } as any,
        },
        relations: { organization: true, user: true },
      });

      if (!membership) {
        membership = em.create(OrganizationUser, {
          organization: { id: organizationId } as any,
          user: { id: userId } as any,
          status,
          roles: roles && roles.length ? Array.from(new Set(roles)) : undefined,
        });
      } else {
        if (status !== undefined) {
          membership.status = status;
        }
        if (roles && roles.length) {
          const current = membership.roles ?? [];
          const merged = Array.from(new Set([...current, ...roles]));
          membership.roles = merged;
        }
      }

      const savedMembership = await em.save(membership);

      const withRelations = await em.findOne(OrganizationUser, {
        where: { id: savedMembership.id } as any,
        relations: { organization: true, user: true },
      });

      return withRelations ?? savedMembership;
    });

    await this.organizationUserCache.setToCache('organizationUser', this.cacheKey(organizationId, userId), saved);
    return saved;
  }

  /**
   * Backward-compatible wrapper that routes to the new method.
   * Accepts Partial<OrganizationUser> and extracts IDs + roles + status.
   */
  async addUserToOrganization(data: Partial<OrganizationUser>): Promise<OrganizationUser> {
    this.logger.info('Adding new user to organization (compat)', { data });

    if (!data.organization?.id) {
      throw new Error('Organization data is required and must contain a valid ID.');
    }
    if (!data.user?.id) {
      throw new Error('User data is required and must contain a valid ID.');
    }

    return this.addUserToOrganizationWithRoles({
      organizationId: data.organization.id,
      userId: data.user.id,
      roles: data.roles,
      status: data.status,
    } as AddUserToOrgWithRolesDto);
  }

  /**
   * Replace roles exactly (overwrite).
   */
  async replaceRoles(input: ReplaceRolesDto): Promise<OrganizationUser> {
    const dto = await this.validate(ReplaceRolesDto, input);
    const { organizationId, userId, roles } = dto;

    this.logger.info('Replacing roles for OrganizationUser', dto);

    const saved = await organizationUserRepository.executeTransaction(async (em) => {
      const membership = await em.findOne(OrganizationUser, {
        where: { organization: { id: organizationId } as any, user: { id: userId } as any },
      });
      if (!membership) throw new Error('Membership not found');

      membership.roles = Array.from(new Set(roles));
      const savedMembership = await em.save(membership);

      const withRelations = await em.findOne(OrganizationUser, {
        where: { id: savedMembership.id } as any,
        relations: { organization: true, user: true },
      });
      return withRelations ?? savedMembership;
    });

    await this.organizationUserCache.setToCache('organizationUser', this.cacheKey(organizationId, userId), saved);
    return saved;
  }

  /**
   * Remove specific roles from the membership (no-op if not present).
   */
  async removeRoles(input: RemoveRolesDto): Promise<OrganizationUser> {
    const dto = await this.validate(RemoveRolesDto, input);
    const { organizationId, userId, roles } = dto;

    this.logger.info('Removing roles for OrganizationUser', dto);

    const saved = await organizationUserRepository.executeTransaction(async (em) => {
      const membership = await em.findOne(OrganizationUser, {
        where: { organization: { id: organizationId } as any, user: { id: userId } as any },
      });
      if (!membership) throw new Error('Membership not found');

      const current = new Set(membership.roles ?? []);
      for (const r of roles) current.delete(r);
      membership.roles = Array.from(current);

      const savedMembership = await em.save(membership);
      const withRelations = await em.findOne(OrganizationUser, {
        where: { id: savedMembership.id } as any,
        relations: { organization: true, user: true },
      });
      return withRelations ?? savedMembership;
    });

    await this.organizationUserCache.setToCache('organizationUser', this.cacheKey(organizationId, userId), saved);
    return saved;
  }

  // ---------- Status & lifecycle ----------

  async updateStatus(organizationId: string, userId: string, status: string): Promise<void> {
    this.logger.info('Updating status for OrganizationUser', { organizationId, userId, status });
    await organizationUserRepository.updateStatus(organizationId, userId, status);
    await this.refreshCache(organizationId, userId);
  }

  async softDeleteOrganizationUser(organizationId: string, userId: string): Promise<void> {
    this.logger.info('Soft deleting OrganizationUser', { organizationId, userId });
    await organizationUserRepository.softDeleteOrganizationUser(organizationId, userId);
    await this.organizationUserCache.deleteKey('organizationUser', this.cacheKey(organizationId, userId));
  }

  async restoreOrganizationUser(organizationId: string, userId: string): Promise<void> {
    this.logger.info('Restoring OrganizationUser', { organizationId, userId });
    await organizationUserRepository.restoreOrganizationUser(organizationId, userId);
    await this.refreshCache(organizationId, userId);
  }

  private async refreshCache(organizationId: string, userId: string): Promise<void> {
    const organizationUser = await this.getOrganizationUserByOrgAndUserIds(organizationId, userId);
    if (organizationUser) {
      await this.organizationUserCache.setToCache(
        'organizationUser',
        this.cacheKey(organizationId, userId),
        organizationUser
      );
      this.logger.info('OrganizationUser cache refreshed', { organizationId, userId });
    }
  }

  /**
   * List all users/memberships for an organization.
   */
  async getUsersByOrganizationId(organizationId: string): Promise<OrganizationUser[]> {
    this.logger.info('Fetching users by organization ID', { organizationId });
    return organizationUserRepository.getUsersByOrganizationId(organizationId);
  }

  /**
   * Get organization IDs for a user.
   */
  async getOrganizationIdsByUser(userId: string): Promise<string[]> {
    this.logger.info('Fetching organization IDs by user ID', { userId });
    const memberships = await organizationUserRepository.getOrganizationsByUserId(userId);
    return (memberships ?? [])
      .map((m) => m.organization?.id)
      .filter((id): id is string => Boolean(id));
  }

  /**
   * Get full organizations for a user.
   */
  async getOrganizationsByUser(userId: string): Promise<Organization[]> {
    this.logger.info('Fetching organizations by user ID', { userId });
    const memberships = await organizationUserRepository.getOrganizationsByUserId(userId);
    return (memberships ?? [])
      .map((m) => m.organization)
      .filter((o): o is Organization => Boolean(o));
  }
}

export default new OrganizationUserService();

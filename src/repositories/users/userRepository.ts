import { Brackets, EntityManager, FindOptionsWhere } from 'typeorm';
import BaseRepository, { PaginatedResult, PaginationOptions } from '../baseRepository';
import { UserEntity } from '../../entities/users/userEntity';
import { logger } from '../../utils/logger';
import { ApiError } from '../../errors/apiError';
import { StatusCodes } from 'http-status-codes';
import { UserStatus } from '../../constants/users';
import { OrganizationUser } from '../../entities/organizations/organizationUserEntity';
import {Organization} from '../../entities/organizations/organizationEntity';

type ListFilters = {
  tenantId?: string;
  status?: UserStatus;
  q?: string;
};

class UserRepository extends BaseRepository<UserEntity> {
  constructor() {
    super(UserEntity);
  }

  /**
   * Find a user by email (optionally scoped to a tenant).
   */
  async getUserByEmail(email: string, tenantId?: string): Promise<UserEntity | null> {
    try {
      const where: FindOptionsWhere<UserEntity> = tenantId
        ? ({ email, tenant: { id: tenantId } } as any)
        : ({ email } as any);

      const user = await this.findOne({
        where,
        relations: {
          roles: true,
          organizations: true,
          tenant: true,
          credentials: true,
          addresses: true,
          subscriptions: true,
        },
      });

      if (!user) {
        logger.info(`User with email ${email}${tenantId ? ` (tenant ${tenantId})` : ''} not found.`);
      }
      return user;
    } catch (error) {
      this.handleError(error, `Error finding user by email: ${email}`);
    }
  }

  /**
   * Find a user by phone (optionally scoped to a tenant).
   */
  async getUserByPhone(phone: string, tenantId?: string): Promise<UserEntity | null> {
    try {
      const where: FindOptionsWhere<UserEntity> = tenantId
        ? ({ phone, tenant: { id: tenantId } } as any)
        : ({ phone } as any);

      const user = await this.findOne({
        where,
        relations: {
          roles: true,
          organizations: true,
          tenant: true,
          credentials: true,
          addresses: true,
          subscriptions: true,
        },
      });

      if (!user) {
        logger.info(`User with phone ${phone}${tenantId ? ` (tenant ${tenantId})` : ''} not found.`);
      }
      return user;
    } catch (error) {
      this.handleError(error, `Error finding user by phone: ${phone}`);
    }
  }

  /**
   * Strong read for auth/ACL flows (throws 404 if missing).
   */
  async getByIdWithRelations(id: string): Promise<UserEntity> {
    const user = await this.findOne({
      where: { id } as any,
      relations: {
        roles: true,
        tenant: true,
        credentials: true,
        organizations: true,
        addresses: true,
        subscriptions: true,
      },
    });
    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, `User ${id} not found`, true);
    }
    return user;
  }

  /**
   * List users with pagination, tenant scoping, status filter, and free-text search.
   * Uses findWithAdvancedPagination to keep BaseRepository unchanged.
   */
  async listUsers(
    options: PaginationOptions,
    filters?: ListFilters
  ): Promise<PaginatedResult<UserEntity>> {
    try {
      const { tenantId, status, q } = filters ?? {};
      const where: FindOptionsWhere<UserEntity> | undefined = tenantId
        ? ({ tenant: { id: tenantId } } as any)
        : undefined;

      return await this.findWithAdvancedPagination(
        {
          page: options.page ?? 1,
          limit: options.limit ?? 10,
          order: options.order ?? { createdAt: 'DESC' as const },
        },
        where,
        {
          roles: true,
          tenant: true,
          organizations: true,
        },
        undefined,
        (qb) => {
          const alias = qb.expressionMap.mainAlias?.name ?? 'UserEntity';
          if (status) {
            qb = qb.andWhere(`${alias}.status = :status`, { status });
          }
          if (q && q.trim().length > 0) {
            const like = `%${q}%`;
            qb = qb.andWhere(
              new Brackets((b) => {
                b.where(`${alias}.firstName ILIKE :q`, { q: like })
                  .orWhere(`${alias}.lastName ILIKE :q`, { q: like })
                  .orWhere(`${alias}.email ILIKE :q`, { q: like })
                  .orWhere(`${alias}.phone ILIKE :q`, { q: like });
              })
            );
          }
          return qb;
        }
      );
    } catch (error) {
      this.handleError(error, `Error listing users`);
    }
  }

  /**
   * Check uniqueness constraints for (tenant, email) and (tenant, phone).
   */
  async emailOrPhoneExists(
    tenantId: string,
    { email, phone }: { email?: string; phone?: string }
  ): Promise<{ emailExists: boolean; phoneExists: boolean }> {
    try {
      const [emailExists, phoneExists] = await Promise.all([
        email
          ? this.count({ email, tenant: { id: tenantId } as any }) // reuse BaseRepository.count
              .then((c) => c > 0)
          : Promise.resolve(false),
        phone
          ? this.count({ phone, tenant: { id: tenantId } as any })
              .then((c) => c > 0)
          : Promise.resolve(false),
      ]);
      return { emailExists, phoneExists };
    } catch (error) {
      this.handleError(error, `Error checking email/phone existence for tenant ${tenantId}`);
    }
  }

  /**
   * Create a user together with credentials in one transaction.
   * NOTE: expects password already hashed by service layer.
   */
  async createUserWithCredentials(input: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    avatar?: string;
    bio?: string;
    status?: UserStatus;
    tenantId?: string | null;
    hashedPassword?: string;
  }): Promise<UserEntity> {
    return await this.executeTransaction(async (em: EntityManager) => {
      try {
        const user = em.create(UserEntity, {
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          phone: input.phone,
          avatar: input.avatar,
          bio: input.bio,
          status: input.status ?? UserStatus.PENDING_VERIFICATION,
          tenant: input.tenantId ? ({ id: input.tenantId } as any) : null,
        });

        const saved = await em.save(user);

        if (input.hashedPassword) {
          // Avoid direct import cycle by using the entity name string if needed,
          // otherwise import UserCredentialsEntity type directly.
          await em.save('UserCredentialsEntity' as any, {
            user: { id: saved.id },
            passwordHash: input.hashedPassword,
          });
        }

        return saved;
      } catch (error) {
        this.handleError(error, `Error creating user with credentials`);
      }
    });
  }

  /**
   * Add a role to a user (idempotent).
   */
  async addRoleToUser(userId: string, roleId: string): Promise<void> {
    await this.executeTransaction(async (em) => {
      const user = await em.findOne(UserEntity, {
        where: { id: userId } as any,
        relations: { roles: true },
      });
      if (!user) throw new ApiError(StatusCodes.NOT_FOUND, `User ${userId} not found`, true);

      const exists = (user.roles ?? []).some((r: any) => r.id === roleId);
      if (!exists) {
        user.roles = [...(user.roles ?? []), { id: roleId } as any];
        await em.save(user);
      }
    });
  }

  /**
   * Remove a role from a user (no-op if not present).
   */
  async removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    await this.executeTransaction(async (em) => {
      const user = await em.findOne(UserEntity, {
        where: { id: userId } as any,
        relations: { roles: true },
      });
      if (!user) throw new ApiError(StatusCodes.NOT_FOUND, `User ${userId} not found`, true);

      user.roles = (user.roles ?? []).filter((r: any) => r.id !== roleId);
      await em.save(user);
    });
  }

  /**
   * Get organizations a user belongs to
   * 
   */
  async getOrganizationsByUser(userId: string): Promise<Organization[]> {
    const user = await this.findOne({
      where: { id: userId } as any,
      relations: { organizations: true },
    });
    if (!user) throw new ApiError(StatusCodes.NOT_FOUND, `User ${userId} not found`, true);
    return (user.organizations ?? []).map((orgUser: OrganizationUser) => orgUser.organization);
  }
}

const userRepository = new UserRepository();
export { userRepository as default, UserRepository };

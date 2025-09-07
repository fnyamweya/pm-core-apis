import jwt, { JwtPayload, Secret, SignOptions } from 'jsonwebtoken';
import { EnvConfiguration } from '../../config/env';
import {
  InternalServerError,
  UnauthorizedError,
} from '../../errors/httpErrors';
import userCredentialsService from '../../services/users/userCredentialsService';
import userRoleService from '../../services/users/userRoleService';
import userService from '../../services/users/userService';
import organizationUserService from '../organizations/organizationUserService';
import { logger } from '../../utils/logger';
import RedisCache from '../../utils/redisCache';

interface TokenConfig {
  secret: Secret;
  expiresIn: string;
}

class AuthService {
  private tokenConfigs: Record<'access' | 'refresh', TokenConfig>;
  private redisCache: RedisCache<any>;

  constructor(redisCache: RedisCache<any>) {
    this.redisCache = redisCache;

    const {
      JWT_SECRET,
      JWT_EXPIRATION,
      JWT_REFRESH_SECRET,
      JWT_REFRESH_EXPIRATION,
    } = EnvConfiguration;

    this.tokenConfigs = {
      access: {
        secret: (JWT_SECRET || 'defaultSecret') as Secret,
        expiresIn: JWT_EXPIRATION || '1h',
      },
      refresh: {
        secret: (JWT_REFRESH_SECRET || 'defaultRefreshSecret') as Secret,
        expiresIn: JWT_REFRESH_EXPIRATION || '30d',
      },
    };

    logger.info('AuthService initialized');
  }

  async authenticate(
    identifier: string,
    credential: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    logger.info('Authenticating user', { identifier });

    const user = await this.getUser(identifier);
    await this.validateCredential(user.id, credential);
    return this.generateTokens(user.id);
  }

  async getAuthenticatedUser(userId: string): Promise<JwtPayload> {
    if (!userId) {
      throw new UnauthorizedError('User ID is required');
    }

    const user = await userService.getById(userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const organizations = await organizationUserService.getOrganizationsByUser(user.id);
    const organizationIds = organizations.map((o) => o.id);

    return {
      sub: user.id,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`,
      organizations,
      organizationIds,
    };
  }

  private async generateToken(
    userId: string,
    type: 'access' | 'refresh'
  ): Promise<string> {
    const { secret, expiresIn } = this.tokenConfigs[type];
    const payload: JwtPayload = { sub: userId };

    if (type === 'access') {
      const roles = await userRoleService.getRolesByUserId(userId);
      const roleIds = roles.map((role) => role.roleId);
      const organizationIds = await organizationUserService.getOrganizationIdsByUser(userId);
      Object.assign(payload, { roles: roleIds, organizationIds });
    }

    // Cast to SignOptions to satisfy the stricter v9 typings
    const options = { expiresIn } as SignOptions;

    return new Promise<string>((resolve, reject) => {
      jwt.sign(
        payload,
        secret,
        options,
        (err, token) => {
          if (err) {
            logger.error('JWT sign error', { err });
            return reject(new InternalServerError('Token generation failed'));
          }
          if (!token) {
            return reject(new InternalServerError('Token generation failed'));
          }
          resolve(token);
        }
      );
    });
  }

  verifyToken(token: string, type: 'access' | 'refresh'): JwtPayload {
    const { secret } = this.tokenConfigs[type];
    try {
      return jwt.verify(token, secret) as JwtPayload;
    } catch (error) {
      logger.error('Token verification failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw new UnauthorizedError('Invalid or expired token');
    }
  }

  async revokeToken(token: string): Promise<void> {
    const decoded = jwt.decode(token) as JwtPayload | null;
    if (!decoded || !decoded.exp) {
      throw new InternalServerError('Invalid token');
    }

    const cacheKey = `revoked_token:${token}`;
    const ttl = decoded.exp - Math.floor(Date.now() / 1000);
    await this.redisCache.setToCache(cacheKey, 'invalid', ttl);

    logger.info('Token revoked', { cacheKey });
  }

  async isTokenRevoked(token: string): Promise<boolean> {
    return (
      (await this.redisCache.getFromCache('revoked_token', token)) ===
      'invalid'
    );
  }

  private async getUser(identifier: string) {
    const user = this.isValidEmail(identifier)
      ? await userService.getByEmail(identifier)
      : await userService.getByPhone(identifier);

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }
    return user;
  }

  async refreshToken(refreshToken: string): Promise<string> {
    const decoded = this.verifyToken(refreshToken, 'refresh');

    if (await this.isTokenRevoked(refreshToken)) {
      throw new UnauthorizedError('Refresh token has been revoked');
    }

    const userId = decoded.sub;
    if (!userId) {
      throw new InternalServerError('Invalid token payload');
    }

    return this.generateToken(userId, 'access');
  }

  private async validateCredential(
    userId: string,
    credential: string
  ): Promise<void> {
    const isValid = await userCredentialsService.verifyUserCredential(
      userId,
      credential
    );
    if (!isValid) {
      throw new UnauthorizedError('Invalid credentials');
    }
  }

  private async generateTokens(userId: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    return {
      accessToken: await this.generateToken(userId, 'access'),
      refreshToken: await this.generateToken(userId, 'refresh'),
    };
  }

  private isValidEmail(identifier: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
  }
}

const redisCacheInstance = new RedisCache<any>(3600);
export default new AuthService(redisCacheInstance);

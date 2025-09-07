import { UserEntity } from '../../entities/users/userEntity';
import userRepository from '../../repositories/users/userRepository';
import { logger } from '../../utils/logger';
import { formatPhoneNumber } from '../../utils/phoneNumber';
import RedisCache from '../../utils/redisCache';
import { BaseService } from '../baseService';
import userCredentialsService from './userCredentialsService';
import {
  CredentialType,
  CredentialAlgorithm,
} from '../../entities/users/userCredentialsEntity';
import smsService from '../sms/smsService';
import { generateNewUserPin } from '../../templates/sms/newUserPin';
import { SmsProviderError } from '../sms/providers/interfaces/smsProvider';
import { Organization } from '@/entities/organizations/organizationEntity';

interface CreateUserDTO {
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  credential?: string;
  credentialType?: CredentialType;
  algorithm?: CredentialAlgorithm;
  credentialExpiry?: Date;
}

interface RegisterUserDTO {
  email:     string;
  phone:     string;
  firstName: string;
  lastName:  string;
}

interface UpdateUserDTO {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  credential?: string;
  credentialType?: CredentialType;
  algorithm?: CredentialAlgorithm;
}

class UserService extends BaseService<UserEntity> {
  private readonly cacheNamespace = 'user';
  private readonly phoneCacheNamespace = 'userPhone';
  private readonly emailCacheNamespace = 'userEmail';

  constructor() {
    super(
      {
        repository: userRepository,
        redisCache: new RedisCache<UserEntity>(3600),
        logger,
      },
      'user'
    );
  }

  private generateCacheKey(namespace: string, key: string): string {
    return `${namespace}:${key}`;
  }

  /**
   * Create a new user, and optionally its credentials.
   */
  async createUser(data: CreateUserDTO): Promise<UserEntity> {
    this.logger.info('Creating user', { email: data.email });

    const standardizedPhone = formatPhoneNumber(data.phone);
    if (!standardizedPhone) {
      throw new Error('Invalid phone number format');
    }

    const user = await this.repository.create({
      email: data.email,
      phone: standardizedPhone,
      firstName: data.firstName,
      lastName: data.lastName,
    });

    if (data.credential) {
      await userCredentialsService.createUserCredentials({
        userId:           user.id,
        credential:       data.credential,
        credentialType:   data.credentialType,
        algorithm:        data.algorithm,
        credentialExpiry: data.credentialExpiry,
      });
    }

    const cacheKey = this.generateCacheKey(this.cacheNamespace, user.id);
    await this.cache.setToCache(this.cacheNamespace, cacheKey, user);

    this.logger.info('User created successfully', { userId: user.id });
    return user;
  }

  /**
   * Register a new user and send a verification SMS.
   */

  async registerUser(data: { email: string; phone: string; firstName: string; lastName: string; }): Promise<UserEntity> {
    logger.info('Registering user', data);

    if (!data.phone) throw new Error('Phone number is required');
    const standardizedPhone = formatPhoneNumber(data.phone);
    if (!standardizedPhone) throw new Error('Invalid phone number format');

    let user = await this.getByEmail(data.email);
    if (!user) {
      user = await this.createUser({ email: data.email, phone: standardizedPhone, firstName: data.firstName, lastName: data.lastName });
    } else if (user.phone !== standardizedPhone) {
      throw new Error('Phone does not match existing account');
    }

    const code            = Math.floor(100000 + Math.random() * 900000).toString();
    const validityMinutes = 10;
    const expiry          = new Date(Date.now() + validityMinutes * 60_000);

    await userCredentialsService.createUserCredentials({
      userId:           user.id,
      credential:       code,
      credentialType:   CredentialType.PIN,
      algorithm:        CredentialAlgorithm.PLAIN,
      credentialExpiry: expiry,
    });

    const smsText = generateNewUserPin(code, validityMinutes);
    try {
      await smsService.sendSms(
        standardizedPhone,
        smsText,
        'USER_REGISTRATION_VERIFICATION',
        { trackDelivery: true }
      );
    } catch (err: any) {
      if (err instanceof SmsProviderError && err.details?.status === 'UserInBlacklist') {
        logger.warn('Number blacklisted – skipping SMS', { userId: user.id, phone: standardizedPhone });
        // swallow blacklist errors: user was created and PIN stored, but SMS isn't deliverable
      } else {
        throw err;  // rethrow all other SMS‐related errors
      }
    }

    return user;
  }
  
  /**
   * Update an existing user, and optionally its credentials.
   */
  async updateUser(id: string, data: UpdateUserDTO): Promise<UserEntity | null> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error('User not found');
    }

    const standardizedPhone = data.phone
      ? formatPhoneNumber(data.phone)
      : existing.phone;
    if (data.phone && !standardizedPhone) {
      throw new Error('Invalid phone number format');
    }

    await this.repository.update(id, {
      email:     data.email,
      phone:     standardizedPhone,
      firstName: data.firstName,
      lastName:  data.lastName,
    });

    if (data.credential) {
      await userCredentialsService.updateUserCredentials({
        userId:        id,
        credential:    data.credential,
        credentialType: data.credentialType,
        algorithm:      data.algorithm,
      });
    }

    const updatedUser = await this.getById(id);
    const cacheKey = this.generateCacheKey(this.cacheNamespace, id);

    await this.cache.deleteKey(this.cacheNamespace, cacheKey);
    if (updatedUser) {
      await this.cache.setToCache(this.cacheNamespace, cacheKey, updatedUser);
    }

    this.logger.info('User updated successfully', { userId: id });
    return updatedUser;
  }

  /**
   * Fetch a user by phone, with caching.
   */
  async getByPhone(phone: string): Promise<UserEntity | null> {
    this.logger.info('Fetching user by phone', { phone });

    const standardizedPhone = formatPhoneNumber(phone);
    if (!standardizedPhone) {
      throw new Error('Invalid phone number format');
    }

    const cacheKey = this.generateCacheKey(this.phoneCacheNamespace, standardizedPhone);
    let user = (await this.cache.getFromCache(
      this.phoneCacheNamespace,
      cacheKey
    )) as UserEntity | null;

    if (!user) {
      user = await this.repository.findOne({ where: { phone: standardizedPhone } });
      if (user) {
        await this.cache.setToCache(this.phoneCacheNamespace, cacheKey, user);
      }
    }

    return user;
  }

  /**
   * Get organizations a user belongs to
   */
  async getOrganizationsByUser(userId: string): Promise<Organization[]> {
    const user = await this.repository.findOne({
      where: { id: userId },
      relations: { organizations: true },
    });
    if (!user) throw new Error(`User ${userId} not found`);
    return user.organizations?.map((orgUser: any) => orgUser.organization) ?? [];
  }

  /**
   * Fetch a user by email, with caching.
   */
  async getByEmail(email: string): Promise<UserEntity | null> {
    this.logger.info('Fetching user by email', { email });

    if (!email) {
      throw new Error('Invalid email format');
    }

    const cacheKey = this.generateCacheKey(this.emailCacheNamespace, encodeURIComponent(email));
    let user = (await this.cache.getFromCache(
      this.emailCacheNamespace,
      cacheKey
    )) as UserEntity | null;

    if (!user) {
      user = await this.repository.findOne({ where: { email } });
      if (user) {
        await this.cache.setToCache(this.emailCacheNamespace, cacheKey, user);
      }
    }

    return user;
  }

  /**
   * Delete a user.
   */
  async deleteUser(userId: string): Promise<void> {
    this.logger.info('Deleting user', { userId });

    const cacheKey = this.generateCacheKey(this.cacheNamespace, userId);
    await this.cache.deleteKey(this.cacheNamespace, cacheKey);
    await this.repository.delete(userId);

    this.logger.info('User deleted successfully', { userId });
  }
}

export default new UserService();

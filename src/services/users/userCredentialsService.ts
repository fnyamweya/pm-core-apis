import bcrypt from 'bcryptjs';
import { hashCredential as argonHash, verifyCredential as argonVerify } from '../../config/argon2';
import UserCredentialsEntity, { CredentialAlgorithm, CredentialType } from '../../entities/users/userCredentialsEntity';
import userCredentialRepository from '../../repositories/users/userCredentialsRespository';
import { logger } from '../../utils/logger';
import RedisCache from '../../utils/redisCache';
import { BaseService } from '../baseService';

class UserCredentialsService extends BaseService<UserCredentialsEntity> {
  private static readonly DEFAULT_CREDENTIAL_TYPE = CredentialType.PASSWORD;
  private static readonly DEFAULT_ALGORITHM        = CredentialAlgorithm.ARGON2;

  constructor() {
    super(
      {
        repository: userCredentialRepository,
        redisCache: new RedisCache<UserCredentialsEntity>(3600),
        logger,
      },
      'userCredential'
    );
  }

  async createUserCredentials({
    userId,
    credential,
    credentialType = UserCredentialsService.DEFAULT_CREDENTIAL_TYPE,
    algorithm      = UserCredentialsService.DEFAULT_ALGORITHM,
    credentialExpiry,
  }: {
    userId: string;
    credential: string;
    credentialType?: CredentialType;
    algorithm?: CredentialAlgorithm;
    credentialExpiry?: Date;
  }): Promise<UserCredentialsEntity> {
    const hashed = await this.hashCredential(credential, algorithm);
    const expiry = credentialExpiry ?? this.calculateCredentialExpiry();
    const existing = await userCredentialRepository.findOne({ where: { user: { id: userId } } });

    if (existing) {
      existing.hashedCredential  = hashed;
      existing.credentialType     = credentialType;
      existing.algorithmVersion   = algorithm;
      existing.credentialExpiry   = expiry;
      return await userCredentialRepository.save(existing);
    }

    const entity = await userCredentialRepository.create({
      user:             { id: userId },
      hashedCredential: hashed,
      credentialType,
      algorithmVersion: algorithm,
      credentialExpiry: expiry,
    });
    return await userCredentialRepository.save(entity);
  }

  async updateUserCredentials({
    userId,
    credential,
    credentialType = UserCredentialsService.DEFAULT_CREDENTIAL_TYPE,
    algorithm      = UserCredentialsService.DEFAULT_ALGORITHM,
    credentialExpiry,
  }: {
    userId: string;
    credential: string;
    credentialType?: CredentialType;
    algorithm?: CredentialAlgorithm;
    credentialExpiry?: Date;
  }): Promise<UserCredentialsEntity> {
    const existing = await userCredentialRepository.findOne({ where: { user: { id: userId } } });
    if (!existing) throw new Error('User credentials not found');

    existing.hashedCredential  = await this.hashCredential(credential, algorithm);
    existing.credentialType     = credentialType;
    existing.algorithmVersion   = algorithm;
    existing.credentialExpiry   = credentialExpiry ?? this.calculateCredentialExpiry();
    return await userCredentialRepository.save(existing);
  }

  async deleteUserCredentials(userId: string): Promise<void> {
    const existing = await userCredentialRepository.findOne({ where: { user: { id: userId } } });
    if (!existing) throw new Error('User credentials not found');
    await userCredentialRepository.delete(existing.id);
  }

  async verifyUserCredential(userId: string, credential: string): Promise<boolean> {
    try {
      const existing = await userCredentialRepository.findOne({ where: { user: { id: userId } } });
      if (!existing) {
        logger.warn('verifyUserCredential: credentials not found', { userId });
        return false;
      }
      if (existing.credentialExpiry && new Date() > existing.credentialExpiry) {
        logger.info('verifyUserCredential: credential expired', { userId });
        return false;
      }
      return this.verifyHash(credential, existing.hashedCredential, existing.algorithmVersion);
    } catch (err) {
      logger.error('verifyUserCredential: unexpected error', { userId, err });
      return false;
    }
  }

  private async hashCredential(credential: string, algorithm: CredentialAlgorithm): Promise<string> {
    switch (algorithm) {
      case CredentialAlgorithm.BCRYPT:
        return bcrypt.hash(credential, 10);
      case CredentialAlgorithm.ARGON2:
        return argonHash('userCredential', credential);
      case CredentialAlgorithm.PLAIN:
        return credential;
      default:
        throw new Error(`Unsupported hashing algorithm: ${algorithm}`);
    }
  }

  private async verifyHash(credential: string, hashedCredential: string, algorithm: CredentialAlgorithm): Promise<boolean> {
    switch (algorithm) {
      case CredentialAlgorithm.BCRYPT:
        return bcrypt.compare(credential, hashedCredential);
      case CredentialAlgorithm.ARGON2:
        return argonVerify('userCredential', credential, hashedCredential);
      case CredentialAlgorithm.PLAIN:
        return credential === hashedCredential;
      default:
        throw new Error(`Unsupported hashing algorithm: ${algorithm}`);
    }
  }

  private calculateCredentialExpiry(): Date {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date;
  }
}

export default new UserCredentialsService();

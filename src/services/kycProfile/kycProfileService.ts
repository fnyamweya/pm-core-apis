import {
  KycProfile,
  KycProfileStatus,
  KycProfileType,
} from '../../entities/kycProfile/kycProfileEntity';
import { KycRequirement } from '../../entities/kycProfile/kycRequirementEntity';
import { Organization } from '../../entities/organizations/organizationEntity';
import { UserEntity } from '../../entities/users/userEntity';
import kycProfileRepository from '../../repositories/kycProfile/kycProfileRepository';
import { logger } from '../../utils/logger';
import RedisCache from '../../utils/redisCache';
import { BaseService } from '../baseService';

interface CreateKycProfileDTO {
  type: KycProfileType;
  requirement: KycRequirement;
  value?: string | number | boolean | Record<string, any>;
  status?: KycProfileStatus;
  user?: UserEntity;
  organization?: Organization;
  notes?: string;
}

interface UpdateKycProfileDTO {
  type?: KycProfileType;
  requirement?: KycRequirement;
  value?: string | number | boolean | Record<string, any>;
  status?: KycProfileStatus;
  user?: UserEntity;
  organization?: Organization;
  notes?: string;
}

class KycProfileService extends BaseService<KycProfile> {
  private readonly cacheNamespace = 'kycProfile';
  private readonly allKycProfilesCacheKey = 'allKycProfiles';

  constructor() {
    super(
      {
        repository: kycProfileRepository,
        redisCache: new RedisCache<KycProfile>(3600), // 1-hour TTL for KYC profile cache
        logger,
      },
      'kycProfile'
    );

    this.logger.info('KycProfileService initialized');
  }

  private generateCacheKey(key: string): string {
    return `${this.cacheNamespace}:${key}`;
  }

  async createKycProfile(data: CreateKycProfileDTO): Promise<KycProfile> {
    this.logger.info('Creating a new KYC profile', { data });

    const kycProfile = await (
      this.repository as typeof kycProfileRepository
    ).createKycProfile(data);
    this.logger.info('KYC profile created successfully', {
      kycProfileId: kycProfile.id,
    });

    await this.cacheKycProfile(kycProfile);
    await this.invalidateAllKycProfilesCache();

    return kycProfile;
  }

  async updateKycProfile(
    kycProfileId: string,
    data: UpdateKycProfileDTO
  ): Promise<KycProfile | null> {
    this.logger.info('Updating KYC profile', { kycProfileId, data });

    const kycProfile = await this.getById(kycProfileId);
    if (!kycProfile) throw new Error('KYC profile not found');
    await this.invalidateCache(kycProfile);

    await (this.repository as typeof kycProfileRepository).updateKycProfile(
      kycProfileId,
      data
    );
    this.logger.info('KYC profile updated in repository', { kycProfileId });

    await this.cacheKycProfile(kycProfile);
    await this.invalidateAllKycProfilesCache();

    return kycProfile;
  }

  async getById(id: string): Promise<KycProfile> {
    const cacheKey = this.generateCacheKey(id);
    let kycProfile = await this.cache.getFromCache<KycProfile>(
      this.cacheNamespace,
      cacheKey
    );

    if (!kycProfile) {
      kycProfile = await (
        this.repository as typeof kycProfileRepository
      ).getKycProfileById(id);
      if (kycProfile) {
        await this.cacheKycProfile(kycProfile);
        this.logger.info('KYC profile retrieved from repository and cached', {
          kycProfileId: kycProfile.id,
        });
      } else {
        this.logger.info('KYC profile not found in repository', { id });
      }
    } else {
      this.logger.info('KYC profile found in cache', { kycProfileId: id });
    }

    if (!kycProfile) throw new Error('KYC profile not found');
    return kycProfile as KycProfile;
  }

  async deleteKycProfile(kycProfileId: string): Promise<void> {
    this.logger.info('Deleting KYC profile', { kycProfileId });

    const kycProfile = await this.getById(kycProfileId);
    if (!kycProfile) throw new Error('KYC profile not found');
    await this.invalidateCache(kycProfile);

    await (this.repository as typeof kycProfileRepository).deleteKycProfile(
      kycProfileId
    );
    this.logger.info('KYC profile deleted from repository', { kycProfileId });

    await this.invalidateAllKycProfilesCache();
  }

  async getKycProfilesByType(type: KycProfileType): Promise<KycProfile[]> {
    this.logger.info('Fetching KYC profiles by type', { type });

    const cacheKey = this.generateCacheKey(`type:${type}`);
    let kycProfiles = await this.cache.getFromCache<KycProfile[]>(
      this.cacheNamespace,
      cacheKey
    );

    if (!kycProfiles) {
      kycProfiles = await (
        this.repository as typeof kycProfileRepository
      ).getKycProfilesByType(type);
      if (kycProfiles.length > 0) {
        await this.cache.setToCache(this.cacheNamespace, cacheKey, kycProfiles);
        this.logger.info('KYC profiles retrieved from repository and cached', {
          type,
        });
      } else {
        this.logger.info('No KYC profiles found in repository for type', {
          type,
        });
      }
    } else {
      this.logger.info('KYC profiles found in cache', { type });
    }

    return kycProfiles as KycProfile[];
  }

  async getKycProfilesByStatus(
    status: KycProfileStatus
  ): Promise<KycProfile[]> {
    this.logger.info('Fetching KYC profiles by status', { status });

    const cacheKey = this.generateCacheKey(`status:${status}`);
    let kycProfiles = await this.cache.getFromCache<KycProfile[]>(
      this.cacheNamespace,
      cacheKey
    );

    if (!kycProfiles) {
      kycProfiles = await (
        this.repository as typeof kycProfileRepository
      ).getKycProfilesByStatus(status);
      if (kycProfiles.length > 0) {
        await this.cache.setToCache(this.cacheNamespace, cacheKey, kycProfiles);
        this.logger.info('KYC profiles retrieved from repository and cached', {
          status,
        });
      } else {
        this.logger.info('No KYC profiles found in repository for status', {
          status,
        });
      }
    } else {
      this.logger.info('KYC profiles found in cache', { status });
    }

    return kycProfiles as KycProfile[];
  }

  async getProfilesByUserId(userId: string): Promise<KycProfile[]> {
    this.logger.info('Fetching KYC profiles by user ID', { userId });

    const cacheKey = this.generateCacheKey(`user:${userId}`);
    let kycProfiles = await this.cache.getFromCache<KycProfile[]>(
      this.cacheNamespace,
      cacheKey
    );

    if (!kycProfiles) {
      kycProfiles = await (
        this.repository as typeof kycProfileRepository
      ).getProfilesByUserId(userId);
      if (kycProfiles.length > 0) {
        await this.cache.setToCache(this.cacheNamespace, cacheKey, kycProfiles);
        this.logger.info('KYC profiles retrieved from repository and cached', {
          userId,
        });
      } else {
        this.logger.info('No KYC profiles found in repository for user ID', {
          userId,
        });
      }
    } else {
      this.logger.info('KYC profiles found in cache', { userId });
    }

    return kycProfiles as KycProfile[];
  }

  async getProfilesByOrganizationId(
    organizationId: string
  ): Promise<KycProfile[]> {
    this.logger.info('Fetching KYC profiles by organization ID', {
      organizationId,
    });

    const cacheKey = this.generateCacheKey(`organization:${organizationId}`);
    let kycProfiles = await this.cache.getFromCache<KycProfile[]>(
      this.cacheNamespace,
      cacheKey
    );

    if (!kycProfiles) {
      kycProfiles = await (
        this.repository as typeof kycProfileRepository
      ).getProfilesByOrganizationId(organizationId);
      if (kycProfiles.length > 0) {
        await this.cache.setToCache(this.cacheNamespace, cacheKey, kycProfiles);
        this.logger.info('KYC profiles retrieved from repository and cached', {
          organizationId,
        });
      } else {
        this.logger.info(
          'No KYC profiles found in repository for organization ID',
          { organizationId }
        );
      }
    } else {
      this.logger.info('KYC profiles found in cache', { organizationId });
    }

    return kycProfiles as KycProfile[];
  }

  private async cacheKycProfile(kycProfile: KycProfile): Promise<void> {
    const cacheKey = this.generateCacheKey(kycProfile.id);
    await this.cache.setToCache(this.cacheNamespace, cacheKey, kycProfile);
    this.logger.info('KYC profile cached', { kycProfileId: kycProfile.id });
  }

  private async invalidateCache(kycProfile: KycProfile): Promise<void> {
    const cacheKey = this.generateCacheKey(kycProfile.id);
    await this.cache.deleteKey(this.cacheNamespace, cacheKey);
    this.logger.info('KYC profile cache invalidated', {
      kycProfileId: kycProfile.id,
    });
  }

  private async invalidateAllKycProfilesCache(): Promise<void> {
    const cacheKey = this.generateCacheKey(this.allKycProfilesCacheKey);
    await this.cache.deleteKey(this.cacheNamespace, cacheKey);
    this.logger.info('All KYC profiles cache invalidated');
  }
}

export default new KycProfileService();

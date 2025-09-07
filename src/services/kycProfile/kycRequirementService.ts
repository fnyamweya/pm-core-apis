import { Role } from '../../entities/accessControl/roleEntity';
import {
  KycDataType,
  KycRequirement,
} from '../../entities/kycProfile/kycRequirementEntity';
import { OrganizationType } from '../../entities/organizations/organizationTypeEntity';
import kycRequirementRepository from '../../repositories/kycProfile/kycRequirementRepository';
import { logger } from '../../utils/logger';
import RedisCache from '../../utils/redisCache';
import { BaseService } from '../baseService';

interface CreateKycRequirementDTO {
  name: string;
  description?: string;
  dataType: KycDataType;
  isRequired: boolean;
  roleId?: Role;
  organizationTypeId?: OrganizationType;
}

interface UpdateKycRequirementDTO {
  name?: string;
  description?: string;
  dataType?: KycDataType;
  isRequired?: boolean;
  roleId?: Role;
  organizationTypeId?: OrganizationType;
}

class KycRequirementService extends BaseService<KycRequirement> {
  private readonly cacheNamespace = 'kycRequirement';

  constructor() {
    super(
      {
        repository: kycRequirementRepository,
        redisCache: new RedisCache<KycRequirement>(3600),
        logger,
      },
      'kycRequirement'
    );
  }

  private generateCacheKey(key: string): string {
    return `${this.cacheNamespace}:${key}`;
  }

  async createKycRequirement(
    data: CreateKycRequirementDTO
  ): Promise<KycRequirement> {
    this.logger.info('Creating KYC requirement', { data });

    const requirement =
      await kycRequirementRepository.createKycRequirement(data);
    this.logger.info('KYC requirement created successfully', {
      requirementId: requirement.id,
    });

    const cacheKey = this.generateCacheKey(requirement.id);
    await this.cache.setToCache(this.cacheNamespace, cacheKey, requirement);

    return requirement;
  }

  async updateKycRequirement(
    id: string,
    data: UpdateKycRequirementDTO
  ): Promise<KycRequirement | null> {
    this.logger.info('Updating KYC requirement', { id, data });

    const requirement = await this.getById(id);
    if (!requirement) throw new Error('KYC requirement not found');

    await kycRequirementRepository.updateKycRequirement(id, data);
    this.logger.info('KYC requirement updated in repository', { id });

    const updatedRequirement = await this.getById(id);
    const cacheKey = this.generateCacheKey(id);
    await this.cache.setToCache(
      this.cacheNamespace,
      cacheKey,
      updatedRequirement
    );

    return updatedRequirement;
  }

  async getById(id: string): Promise<KycRequirement> {
    const cacheKey = this.generateCacheKey(id);
    let requirement = await this.cache.getFromCache(
      this.cacheNamespace,
      cacheKey
    );

    if (!requirement) {
      requirement = await kycRequirementRepository.getKycRequirementById(id);
      if (requirement) {
        await this.cache.setToCache(this.cacheNamespace, cacheKey, requirement);
        this.logger.info(
          'KYC requirement retrieved from repository and cached',
          {
            requirementId: requirement.id,
          }
        );
      } else {
        this.logger.info('KYC requirement not found in repository', { id });
      }
    } else {
      this.logger.info('KYC requirement found in cache', {
        requirementId: requirement.id,
      });
    }

    if (!requirement) throw new Error('KYC requirement not found');
    return requirement as KycRequirement;
  }

  async deleteKycRequirement(id: string): Promise<void> {
    this.logger.info('Deleting KYC requirement', { id });

    const requirement = await this.getById(id);
    if (!requirement) throw new Error('KYC requirement not found');

    await kycRequirementRepository.deleteKycRequirement(id);
    this.logger.info('KYC requirement deleted from repository', { id });

    const cacheKey = this.generateCacheKey(id);
    await this.cache.deleteKey(this.cacheNamespace, cacheKey);
  }
}

export default new KycRequirementService();

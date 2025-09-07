import { AccessPolicy } from '../../entities/accessControl/accessPolicyEntity';
import accessPolicyRepository from '../../repositories/accessControl/accessPolicyRepository';
import { logger } from '../../utils/logger';
import RedisCache from '../../utils/redisCache';
import { BaseService } from '../baseService';

interface CreatePolicyDTO {
  resource: string;
  action: string;
  effect: 'ALLOW' | 'DENY' | 'LOG' | 'NOTIFY' | 'AUDIT';
  priority?: number;
  conditions?: Array<{
    attribute: string;
    operator: string;
    value: string | number | boolean | string[];
  }>;
  nestedConditions?: Array<{
    logicalOperator: 'AND' | 'OR';
    conditions: Array<{
      attribute: string;
      operator: string;
      value: string | number | boolean | string[];
    }>;
  }>;
  overrides?: string[];
  timeConstraints?: {
    startTime?: string;
    endTime?: string;
    daysOfWeek?: string[];
  };
  geoConstraints?: {
    allowedRegions?: string[];
    deniedRegions?: string[];
  };
  validity?: {
    startDate?: string;
    endDate?: string;
  };
  customLogic?: string;
  audit?: {
    lastModifiedBy?: string;
    lastModifiedAt?: string;
    lastEvaluatedAt?: string;
  };
}

interface UpdatePolicyDTO {
  effect?: 'ALLOW' | 'DENY' | 'LOG' | 'NOTIFY' | 'AUDIT';
  priority?: number;
  conditions?: Array<{
    attribute: string;
    operator: string;
    value: string | number | boolean | string[];
  }>;
  nestedConditions?: Array<{
    logicalOperator: 'AND' | 'OR';
    conditions: Array<{
      attribute: string;
      operator: string;
      value: string | number | boolean | string[];
    }>;
  }>;
  overrides?: string[];
  timeConstraints?: {
    startTime?: string;
    endTime?: string;
    daysOfWeek?: string[];
  };
  geoConstraints?: {
    allowedRegions?: string[];
    deniedRegions?: string[];
  };
  validity?: {
    startDate?: string;
    endDate?: string;
  };
  customLogic?: string;
  audit?: {
    lastModifiedBy?: string;
    lastModifiedAt?: string;
    lastEvaluatedAt?: string;
  };
}

class AccessPolicyService extends BaseService<AccessPolicy> {
  private readonly cacheNamespace = 'accessPolicy';

  constructor() {
    super(
      {
        repository: accessPolicyRepository,
        redisCache: new RedisCache<AccessPolicy>(3600), // Cache TTL: 1 hour
        logger,
      },
      'accessPolicy'
    );
  }

  private generateCacheKey(namespace: string, key: string): string {
    return `${namespace}:${key}`;
  }

  async createPolicy(data: CreatePolicyDTO): Promise<AccessPolicy> {
    this.logger.info('Creating access policy', {
      resource: data.resource,
      action: data.action,
    });

    const policy = await this.repository.create(data);

    const cacheKey = this.generateCacheKey(this.cacheNamespace, policy.id);
    await this.cache.setToCache(this.cacheNamespace, cacheKey, policy);

    this.logger.info('Access policy created successfully', {
      policyId: policy.id,
    });
    return policy;
  }

  async updatePolicy(
    id: string,
    data: UpdatePolicyDTO
  ): Promise<AccessPolicy | null> {
    const policy = await this.getById(id);
    if (!policy) throw new Error('Policy not found');

    await this.repository.update(id, data);

    const updatedPolicy = await this.getById(id);

    const cacheKey = this.generateCacheKey(this.cacheNamespace, id);
    await this.cache.deleteKey(this.cacheNamespace, cacheKey);
    if (updatedPolicy) {
      await this.cache.setToCache(this.cacheNamespace, cacheKey, updatedPolicy);
    }

    this.logger.info('Access policy updated successfully', { policyId: id });
    return this.getById(id);
  }

  async getPolicyByResourceAndAction(
    resource: string,
    action: string
  ): Promise<AccessPolicy | null> {
    this.logger.info('Fetching access policy by resource and action', {
      resource,
      action,
    });

    const cacheKey = this.generateCacheKey(
      this.cacheNamespace,
      `${resource}:${action}`
    );
    let policy = await this.cache.getFromCache(this.cacheNamespace, cacheKey);

    if (!policy) {
      policy = await accessPolicyRepository.getPolicyByResourceAndAction(
        resource,
        action
      );
      if (policy) {
        await this.cache.setToCache(this.cacheNamespace, cacheKey, policy);
        this.logger.info('Access policy retrieved from repository and cached', {
          resource,
          action,
        });
      } else {
        this.logger.info('Access policy not found in repository', {
          resource,
          action,
        });
      }
    } else {
      this.logger.info('Access policy found in cache', { resource, action });
    }

    return policy as AccessPolicy | null;
  }

  async deletePolicy(id: string): Promise<void> {
    const cacheKey = this.generateCacheKey(this.cacheNamespace, id);

    this.logger.info('Deleting access policy', { policyId: id });

    await this.cache.deleteKey(this.cacheNamespace, cacheKey);

    await this.repository.delete(id);
    this.logger.info('Access policy deleted successfully', { policyId: id });
  }
}

export default new AccessPolicyService();

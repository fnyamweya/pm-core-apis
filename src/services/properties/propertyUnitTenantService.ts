import {
  PropertyUnitTenantEntity,
  UnitTenantStatus,
} from '../../entities/properties/propertyUnitTenantEntity';
import propertyUnitTenantRepository from '../../repositories/properties/propertyUnitTenantRepository';
import { logger } from '../../utils/logger';
import RedisCache from '../../utils/redisCache';
import { BaseService } from '../baseService';
import userService from '../users/userService';
import userCredentialsService from '../users/userCredentialsService';
import { CredentialAlgorithm, CredentialType } from '../../entities/users/userCredentialsEntity';
import smsService from '../sms/smsService';
import { generateNewUserPin } from '../../templates/sms/newUserPin';
import propertyService from './propertyService';
import { formatPhoneNumber } from '../../utils/phoneNumber';

interface CreateUnitTenantDTO {
  propertyId: string;
  unitId: string;
  userId: string;
  status: UnitTenantStatus;
  kyc?: any;
  createdBy?: string;
}

interface UpdateUnitTenantDTO {
  status?: UnitTenantStatus;
  kyc?: any;
}

class PropertyUnitTenantService extends BaseService<PropertyUnitTenantEntity> {
  private listCache = new RedisCache<PropertyUnitTenantEntity[]>(3600);

  constructor() {
    super(
      {
        repository: propertyUnitTenantRepository,
        redisCache: new RedisCache<PropertyUnitTenantEntity>(3600),
        logger,
      },
      'unitTenant',
    );
    this.logger.info('PropertyUnitTenantService initialized');
  }

  private listCacheKey(prefix: string, id: string): string {
    return `${prefix}:${id}`;
  }

  /**
   * Create a new tenancy record.
   */
  async createUnitTenant(data: CreateUnitTenantDTO): Promise<PropertyUnitTenantEntity> {
    this.logger.info('Creating unit tenancy', { data });
    const tenant = await this.repository.create({
      property: { id: data.propertyId } as any,
      unit:     { id: data.unitId }       as any,
      user:     { id: data.userId }       as any,
      status:   data.status,
      kyc:      data.kyc,
      createdBy: data.createdBy,
    });

    // Invalidate related caches
    await this.listCache.deleteKey('tenantsByProperty', data.propertyId);
    await this.listCache.deleteKey('tenantsByUnit', data.unitId);
    await this.listCache.deleteKey('tenanciesByUser', data.userId);

    return tenant;
  }

  /**
   * Update an existing tenancy record.
   */
  async updateUnitTenant(
    id: string,
    data: UpdateUnitTenantDTO
  ): Promise<PropertyUnitTenantEntity> {
    this.logger.info('Updating unit tenancy', { id, data });
    // perform the update
    await this.repository.update(id, {
      status: data.status,
      kyc:    data.kyc,
    } as any);

    // re-fetch to get relations
    const updated = await this.getById(id);
    const propertyId = (updated.property as any).id;
    const unitId     = (updated.unit     as any).id;
    const userId     = (updated.user     as any).id;

    // Invalidate related caches
    await this.listCache.deleteKey('tenantsByProperty', propertyId);
    await this.listCache.deleteKey('tenantsByUnit', unitId);
    await this.listCache.deleteKey('tenanciesByUser', userId);

    return updated;
  }

  /**
   * Delete a tenancy record.
   */
  async deleteUnitTenant(id: string): Promise<void> {
    this.logger.info('Deleting unit tenancy', { id });
    const existing = await this.getById(id);
    await this.repository.delete(id);

    const propertyId = (existing.property as any).id;
    const unitId     = (existing.unit     as any).id;
    const userId     = (existing.user     as any).id;

    // Invalidate related caches
    await this.listCache.deleteKey('tenantsByProperty', propertyId);
    await this.listCache.deleteKey('tenantsByUnit', unitId);
    await this.listCache.deleteKey('tenanciesByUser', userId);
  }

  /**
   * Get all tenants for a property (cached).
   */
  async getTenantsByProperty(propertyId: string): Promise<PropertyUnitTenantEntity[]> {
    this.logger.info('Fetching tenants by property', { propertyId });
    const key = this.listCacheKey('tenantsByProperty', propertyId);

    let list = await this.listCache.getFromCache('tenantsByProperty', key);
    if (!list) {
      list = await propertyUnitTenantRepository.getTenantsByProperty(propertyId);
      await this.listCache.setToCache('tenantsByProperty', key, list);
    }
    return list;
  }

  /**
   * Get all tenants for a unit (cached).
   */
  async getTenantsByUnit(unitId: string): Promise<PropertyUnitTenantEntity[]> {
    this.logger.info('Fetching tenants by unit', { unitId });
    const key = this.listCacheKey('tenantsByUnit', unitId);

    let list = await this.listCache.getFromCache('tenantsByUnit', key);
    if (!list) {
      list = await propertyUnitTenantRepository.getTenantsByUnit(unitId);
      await this.listCache.setToCache('tenantsByUnit', key, list);
    }
    return list;
  }

  /**
   * Get the active tenant for a unit.
   */
  async getActiveTenantByUnit(unitId: string): Promise<PropertyUnitTenantEntity | null> {
    this.logger.info('Fetching active tenant by unit', { unitId });
    return propertyUnitTenantRepository.getActiveTenantByUnit(unitId);
  }

  /**
   * Get all tenancies for a user (cached).
   */
  async getTenanciesByUser(userId: string): Promise<PropertyUnitTenantEntity[]> {
    this.logger.info('Fetching tenancies by user', { userId });
    const key = this.listCacheKey('tenanciesByUser', userId);

    let list = await this.listCache.getFromCache('tenanciesByUser', key);
    if (!list) {
      list = await propertyUnitTenantRepository.getTenanciesByUser(userId);
      await this.listCache.setToCache('tenanciesByUser', key, list);
    }
    return list;
  }

  /**
   * Get tenants by status for a property.
   */
  async getTenantsByStatus(
    propertyId: string,
    status: UnitTenantStatus
  ): Promise<PropertyUnitTenantEntity[]> {
    this.logger.info('Fetching tenants by status', { propertyId, status });
    return propertyUnitTenantRepository.getTenantsByStatus(propertyId, status);
  }

  /**
   * Get past or evicted tenants for a property.
   */
  async getPastOrEvictedTenants(propertyId: string): Promise<PropertyUnitTenantEntity[]> {
    this.logger.info('Fetching past/evicted tenants', { propertyId });
    return propertyUnitTenantRepository.getPastOrEvictedTenants(propertyId);
  }

  /**
   * Get active tenants with incomplete KYC for a property.
   */
  async getActiveTenantsWithIncompleteKYC(propertyId: string): Promise<PropertyUnitTenantEntity[]> {
    this.logger.info('Fetching active tenants with incomplete KYC', { propertyId });
    return propertyUnitTenantRepository.getActiveTenantsWithIncompleteKYC(propertyId);
  }

  /**
   * Get tenants for an organization.
   */
  async getTenantsByOrganization(orgId: string): Promise<PropertyUnitTenantEntity[]> {
    this.logger.info('Fetching tenants by organization', { orgId });
    return propertyUnitTenantRepository.getTenantsByOrganizationId(orgId);
  }

  /**
   * Get tenants for multiple organizations.
   */
  async getTenantsByOrganizationIds(orgIds: string[]): Promise<PropertyUnitTenantEntity[]> {
    this.logger.info('Fetching tenants by organizations', { orgIds });
    return propertyUnitTenantRepository.getTenantsByOrganizationIds(orgIds);
  }

  /**
   * Create a tenant: ensures user exists (or creates), assigns to unit, creates a 4‑digit PIN credential
   * expiring in 30 minutes, and sends an SMS with a welcome message and the PIN.
   */
  async createTenantWithUser(params: {
    user: { firstName: string; lastName?: string; email?: string; phone: string };
    propertyId: string;
    unitId: string;
    password?: string; // not used here, PIN is enforced per requirement
    credentialExpiry?: Date; // optional override, otherwise 30 minutes
    createdBy?: string;
  }): Promise<PropertyUnitTenantEntity> {
    this.logger.info('Creating tenant with user', { propertyId: params.propertyId, unitId: params.unitId, email: params.user.email });

    // 1) Ensure user exists (by phone) or create
    const phone = params.user.phone;
    if (!phone) throw new Error('Phone number is required');
    const standardizedPhone = formatPhoneNumber(phone);
    if (!standardizedPhone) throw new Error('Invalid phone number format');
    // Generate temporary 4‑digit PIN and expiry 30 minutes (unless overridden)
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    const validityMinutes = params.credentialExpiry ? Math.max(1, Math.ceil((params.credentialExpiry.getTime() - Date.now()) / 60000)) : 30;
    const expiry = params.credentialExpiry ?? new Date(Date.now() + 30 * 60_000);

    let user = await userService.getByPhone(standardizedPhone);
    if (!user) {
      // Autogenerate email when missing to satisfy DB non-null constraint
      const email = params.user.email ?? `${standardizedPhone.replace('+', '')}@autogen.local`;
      user = await userService.createUser({
        email,
        phone: standardizedPhone,
        firstName: params.user.firstName,
        lastName: params.user.lastName || '',
        credential: pin,
        credentialType: CredentialType.PIN,
        algorithm: CredentialAlgorithm.PLAIN,
        credentialExpiry: expiry,
      });
    } else {
      // Optionally sync profile fields (names only) if provided and different
      const updates: any = {};
      if (params.user.firstName && params.user.firstName !== user.firstName) updates.firstName = params.user.firstName;
      if (typeof params.user.lastName === 'string' && params.user.lastName !== user.lastName) updates.lastName = params.user.lastName;
      if (Object.keys(updates).length) {
        user = (await userService.updateUser(user.id, updates)) || user;
      }
      // Upsert credentials for existing user
      await userCredentialsService.createUserCredentials({
        userId: user.id,
        credential: pin,
        credentialType: CredentialType.PIN,
        algorithm: CredentialAlgorithm.PLAIN,
        credentialExpiry: expiry,
      });
    }
    if (!user) throw new Error('Failed to create or fetch user');

    // 2) Idempotent create: if tenancy already exists for (property, unit, user), return it; otherwise create
    const existingTenancy = await propertyUnitTenantRepository.findOne({
      where: {
        property: { id: params.propertyId } as any,
        unit:     { id: params.unitId }     as any,
        user:     { id: user.id }           as any,
      },
    });
    const tenancy = existingTenancy
      ? existingTenancy
      : await this.createUnitTenant({
          propertyId: params.propertyId,
          unitId: params.unitId,
          userId: user.id,
          status: UnitTenantStatus.ACTIVE,
          createdBy: params.createdBy,
        });

    // 3) Send SMS with welcome text + PIN
    try {
      const property = await propertyService.getById(params.propertyId);
      const welcomePrefix = property?.name ? `Welcome to ${property.name}. ` : 'Welcome! ';
      const pinText = generateNewUserPin(pin, validityMinutes);
      const message = `${welcomePrefix}${pinText}`;
      if (user.phone) {
        await smsService.sendSms(user.phone, message, 'TENANT_WELCOME_PIN', { trackDelivery: true });
      } else {
        this.logger.warn('User has no phone; skipping PIN SMS', { userId: user.id });
      }
    } catch (smsErr) {
      this.logger.error('Failed to send tenant PIN SMS', { error: smsErr });
      // Do not fail the entire operation if SMS delivery fails
    }

    return tenancy;
  }
}

export default new PropertyUnitTenantService();

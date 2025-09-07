import { Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import { PropertyUnitTenantEntity } from '../../entities/properties/propertyUnitTenantEntity';
import propertyUnitTenantService from '../../services/properties/propertyUnitTenantService';
import ALLOWED_KINDS, { AllowedKind } from '../../constants/allowedKinds';
import BaseController from '../baseController';
import { logger } from '../../utils/logger';
import { UnitTenantStatus } from '../../entities/properties/propertyUnitTenantEntity';

const RESPONSE_MESSAGES = {
  SUCCESS: {
    CREATE:                         'Tenant assigned to unit successfully',
    UPDATE:                         'Unit tenancy updated successfully',
    RETRIEVE:                       'Unit tenancy retrieved successfully',
    DELETE:                         'Unit tenancy deleted successfully',
    TENANTS_BY_PROPERTY:            'Tenants for property retrieved successfully',
    TENANTS_BY_UNIT:                'Tenants for unit retrieved successfully',
    ACTIVE_TENANT_BY_UNIT:          'Active tenant for unit retrieved successfully',
    TENANCIES_BY_USER:              'Tenancies for user retrieved successfully',
    TENANTS_BY_STATUS:              'Tenants by status retrieved successfully',
    PAST_OR_EVICTED_TENANTS:        'Past or evicted tenants retrieved successfully',
    ACTIVE_INCOMPLETE_KYC_TENANTS:  'Active tenants with incomplete KYC retrieved successfully',
  },
  ERROR: {
    TENANCY_NOT_FOUND:              'Unit tenancy not found.',
    INVALID_INPUT:                  'Invalid input data.',
  },
};

class PropertyUnitTenantController extends BaseController<PropertyUnitTenantEntity> {
  constructor() {
    super(
      propertyUnitTenantService,
      'UNIT_TENANT' as AllowedKind
    );
  }

  /** GET /properties/tenants/my-orgs (scoped)
   * Lists tenants for the selected organization (header/query) or for all
   * organizations the user belongs to when authenticated.
   */
  public async listTenantsForUserOrganizations(req: Request, res: Response): Promise<void> {
    const orgId = req.orgId as string | undefined;
    const userOrgIds = (req.user?.organizationIds || []) as string[];
    try {
      if (orgId) {
        const list = await propertyUnitTenantService.getTenantsByOrganization(orgId);
        return this.sendSuccess(req, res, list, RESPONSE_MESSAGES.SUCCESS.TENANTS_BY_PROPERTY);
      }
      if (userOrgIds.length) {
        const list = await propertyUnitTenantService.getTenantsByOrganizationIds(userOrgIds);
        return this.sendSuccess(req, res, list, RESPONSE_MESSAGES.SUCCESS.TENANTS_BY_PROPERTY);
      }
      return this.sendSuccess(req, res, [], RESPONSE_MESSAGES.SUCCESS.TENANTS_BY_PROPERTY);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /** POST /unit-tenants */
  public async createUnitTenant(req: Request, res: Response): Promise<void> {
    const { propertyId, unitId } = req.params;
    logger.info('Creating unit tenancy', { body: req.body, propertyId, unitId });
    try {
      const tenant = await propertyUnitTenantService.createUnitTenant({
        ...req.body,
        propertyId,
        unitId,
        createdBy: req.user?.sub,
      });
      this.sendCreated(req, res, tenant, RESPONSE_MESSAGES.SUCCESS.CREATE);
    } catch (error: any) {
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.INVALID_INPUT);
    }
  }

  /** POST /properties/:propertyId/units/:unitId/tenants/with-user */
  public async createTenantWithUser(req: Request, res: Response): Promise<void> {
    const { propertyId, unitId } = req.params;
    logger.info('Creating tenant with user', { propertyId, unitId, body: req.body });
    try {
      const tenant = await propertyUnitTenantService.createTenantWithUser({
        propertyId,
        unitId,
        ...req.body,
        createdBy: req.user?.sub,
      });
      this.sendCreated(req, res, tenant, RESPONSE_MESSAGES.SUCCESS.CREATE);
    } catch (error: any) {
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.INVALID_INPUT);
    }
  }

  /** PUT /unit-tenants/:id */
  public async updateUnitTenant(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    logger.info('Updating unit tenancy', { tenancyId: id, body: req.body });
    try {
      const updated = await propertyUnitTenantService.updateUnitTenant(id, req.body);
      this.sendOrNotFound(
        updated,
        req,
        res,
        RESPONSE_MESSAGES.SUCCESS.UPDATE,
        RESPONSE_MESSAGES.ERROR.TENANCY_NOT_FOUND
      );
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /** DELETE /unit-tenants/:id */
  public async deleteUnitTenant(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    logger.info('Deleting unit tenancy', { tenancyId: id });
    try {
      await propertyUnitTenantService.deleteUnitTenant(id);
      res.status(httpStatus.NO_CONTENT).send();
    } catch (error) {
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.TENANCY_NOT_FOUND);
    }
  }

  /** GET /unit-tenants/:id */
  public async getUnitTenantById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    logger.info('Fetching unit tenancy by ID', { tenancyId: id });
    try {
      const tenancy = await propertyUnitTenantService.getById(id);
      this.sendOrNotFound(
        tenancy,
        req,
        res,
        RESPONSE_MESSAGES.SUCCESS.RETRIEVE,
        RESPONSE_MESSAGES.ERROR.TENANCY_NOT_FOUND
      );
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /** GET /unit-tenants/property/:propertyId */
  public async getTenantsByProperty(req: Request, res: Response): Promise<void> {
    const { propertyId } = req.params;
    logger.info('Fetching tenants for property', { propertyId });
    try {
      const list = await propertyUnitTenantService.getTenantsByProperty(propertyId);
      this.sendSuccess(req, res, list, RESPONSE_MESSAGES.SUCCESS.TENANTS_BY_PROPERTY);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /** GET /unit-tenants/unit/:unitId */
  public async getTenantsByUnit(req: Request, res: Response): Promise<void> {
    const { unitId } = req.params;
    logger.info('Fetching tenants for unit', { unitId });
    try {
      const list = await propertyUnitTenantService.getTenantsByUnit(unitId);
      this.sendSuccess(req, res, list, RESPONSE_MESSAGES.SUCCESS.TENANTS_BY_UNIT);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /** GET /unit-tenants/unit/:unitId/active */
  public async getActiveTenantByUnit(req: Request, res: Response): Promise<void> {
    const { unitId } = req.params;
    logger.info('Fetching active tenant for unit', { unitId });
    try {
      const tenancy = await propertyUnitTenantService.getActiveTenantByUnit(unitId);
      this.sendOrNotFound(
        tenancy,
        req,
        res,
        RESPONSE_MESSAGES.SUCCESS.ACTIVE_TENANT_BY_UNIT,
        RESPONSE_MESSAGES.ERROR.TENANCY_NOT_FOUND
      );
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /** GET /unit-tenants/user/:userId */
  public async getTenanciesByUser(req: Request, res: Response): Promise<void> {
    const { userId } = req.params;
    logger.info('Fetching tenancies for user', { userId });
    try {
      const list = await propertyUnitTenantService.getTenanciesByUser(userId);
      this.sendSuccess(req, res, list, RESPONSE_MESSAGES.SUCCESS.TENANCIES_BY_USER);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /** GET /unit-tenants/property/:propertyId/status/:status */
  public async getTenantsByStatus(req: Request, res: Response): Promise<void> {
    const { propertyId, status } = req.params;
    logger.info('Fetching tenants by status', { propertyId, status });
    try {
      const list = await propertyUnitTenantService.getTenantsByStatus(
        propertyId,
        status as UnitTenantStatus
      );
      this.sendSuccess(req, res, list, RESPONSE_MESSAGES.SUCCESS.TENANTS_BY_STATUS);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /** GET /unit-tenants/property/:propertyId/past-evicted */
  public async getPastOrEvictedTenants(req: Request, res: Response): Promise<void> {
    const { propertyId } = req.params;
    logger.info('Fetching past/evicted tenants', { propertyId });
    try {
      const list = await propertyUnitTenantService.getPastOrEvictedTenants(propertyId);
      this.sendSuccess(req, res, list, RESPONSE_MESSAGES.SUCCESS.PAST_OR_EVICTED_TENANTS);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  /** GET /unit-tenants/property/:propertyId/active-incomplete-kyc */
  public async getActiveTenantsWithIncompleteKYC(req: Request, res: Response): Promise<void> {
    const { propertyId } = req.params;
    logger.info('Fetching active tenants with incomplete KYC', { propertyId });
    try {
      const list = await propertyUnitTenantService.getActiveTenantsWithIncompleteKYC(propertyId);
      this.sendSuccess(req, res, list, RESPONSE_MESSAGES.SUCCESS.ACTIVE_INCOMPLETE_KYC_TENANTS);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }
}

export default new PropertyUnitTenantController();

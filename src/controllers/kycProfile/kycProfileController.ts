import { AllowedKind } from '../../constants/allowedKinds';
import { Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import ALLOWED_KINDS from '../../constants/allowedKinds';
import { KycProfile } from '../../entities/kycProfile/kycProfileEntity';
import { KycRequirement } from '../../entities/kycProfile/kycRequirementEntity';
import { Organization } from '../../entities/organizations/organizationEntity';
import { UserEntity } from '../../entities/users/userEntity';
import kycProfileService from '../../services/kycProfile/kycProfileService';
import BaseController from '../baseController';


const RESPONSE_MESSAGES = {
  SUCCESS: {
    CREATE: 'KYC profile created successfully',
    UPDATE: 'KYC profile updated successfully',
    RETRIEVE: 'KYC profile retrieved successfully',
    DELETE: 'KYC profile deleted successfully',
  },
  ERROR: {
    KYC_PROFILE_NOT_FOUND: 'KYC profile not found.',
    INVALID_INPUT: 'Invalid input data.',
  },
};

class KycProfileController extends BaseController<KycProfile> {
  constructor() {
    super(kycProfileService, ALLOWED_KINDS.KYC_PROFILE.BASE as AllowedKind);
  }

  public async createKycProfile(req: Request, res: Response): Promise<void> {
    const { type, requirement, value, status, user, organization, notes } =
      req.body;

    if (!type || !requirement) {
      return this.sendError(
        req,
        res,
        httpStatus.BAD_REQUEST,
        'INVALID_INPUT',
        RESPONSE_MESSAGES.ERROR.INVALID_INPUT
      );
    }

    try {
      const profile = await kycProfileService.createKycProfile({
        type,
        requirement: requirement as KycRequirement,
        value,
        status,
        user: user as UserEntity,
        organization: organization as Organization,
        notes,
      });
      this.sendCreated(req, res, profile, RESPONSE_MESSAGES.SUCCESS.CREATE);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  public async updateKycProfile(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { type, requirement, value, status, user, organization, notes } =
      req.body;

    if (!id) {
      return this.sendError(
        req,
        res,
        httpStatus.BAD_REQUEST,
        'INVALID_INPUT',
        RESPONSE_MESSAGES.ERROR.INVALID_INPUT
      );
    }

    try {
      const updatedProfile = await kycProfileService.updateKycProfile(id, {
        type,
        requirement: requirement as KycRequirement,
        value,
        status,
        user: user as UserEntity,
        organization: organization as Organization,
        notes,
      });
      this.sendOrNotFound(
        updatedProfile,
        req,
        res,
        RESPONSE_MESSAGES.SUCCESS.UPDATE
      );
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  public async getKycProfileById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    try {
      const profile = await kycProfileService.getById(id);
      this.sendOrNotFound(
        profile,
        req,
        res,
        RESPONSE_MESSAGES.SUCCESS.RETRIEVE
      );
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  public async getKycProfilesByUserId(
    req: Request,
    res: Response
  ): Promise<void> {
    const { userId } = req.params;

    try {
      const profiles = await kycProfileService.getProfilesByUserId(userId);
      this.sendSuccess(req, res, profiles);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  public async getKycProfilesByOrganizationId(
    req: Request,
    res: Response
  ): Promise<void> {
    const { organizationId } = req.params;

    try {
      const profiles =
        await kycProfileService.getProfilesByOrganizationId(organizationId);
      this.sendSuccess(req, res, profiles);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  public async deleteKycProfile(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    try {
      await kycProfileService.deleteKycProfile(id);
      res.status(httpStatus.NO_CONTENT).send();
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  protected sendOrNotFound(
    data: KycProfile | null,
    req: Request,
    res: Response,
    successMessage: string
  ): void {
    if (!data) {
      this.sendError(
        req,
        res,
        httpStatus.NOT_FOUND,
        'KYC_PROFILE_NOT_FOUND',
        RESPONSE_MESSAGES.ERROR.KYC_PROFILE_NOT_FOUND
      );
    } else {
      this.sendSuccess(req, res, data, successMessage);
    }
  }
}

export default new KycProfileController();

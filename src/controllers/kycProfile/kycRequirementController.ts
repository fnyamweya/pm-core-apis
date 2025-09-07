import { Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import ALLOWED_KINDS from '../../constants/allowedKinds';
import { KycRequirement } from '../../entities/kycProfile/kycRequirementEntity';
import kycRequirementService from '../../services/kycProfile/kycRequirementService';
import BaseController from '../baseController';
import { AllowedKind } from '../../constants/allowedKinds';

const RESPONSE_MESSAGES = {
  SUCCESS: {
    CREATE: 'KYC requirement created successfully',
    UPDATE: 'KYC requirement updated successfully',
    RETRIEVE: 'KYC requirement retrieved successfully',
    DELETE: 'KYC requirement deleted successfully',
  },
  ERROR: {
    KYC_REQUIREMENT_NOT_FOUND: 'KYC requirement not found.',
    INVALID_INPUT: 'Invalid input data.',
  },
};

class KycRequirementController extends BaseController<KycRequirement> {
  constructor() {
    super(kycRequirementService, ALLOWED_KINDS.KYC_REQUIREMENT.BASE as AllowedKind);
  }

  public async createKycRequirement(
    req: Request,
    res: Response
  ): Promise<void> {
    const {
      name,
      description,
      dataType,
      isRequired,
      roleId,
      organizationTypeId,
    } = req.body;

    if (!name || !dataType || isRequired === undefined) {
      return this.sendError(
        req,
        res,
        httpStatus.BAD_REQUEST,
        'INVALID_INPUT',
        RESPONSE_MESSAGES.ERROR.INVALID_INPUT
      );
    }

    try {
      const requirement = await kycRequirementService.createKycRequirement({
        name,
        description,
        dataType,
        isRequired,
        roleId,
        organizationTypeId,
      });
      this.sendCreated(req, res, requirement, RESPONSE_MESSAGES.SUCCESS.CREATE);
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  public async updateKycRequirement(
    req: Request,
    res: Response
  ): Promise<void> {
    const { id } = req.params;
    const updateData = req.body;

    if (!updateData) {
      return this.sendError(
        req,
        res,
        httpStatus.BAD_REQUEST,
        'INVALID_INPUT',
        RESPONSE_MESSAGES.ERROR.INVALID_INPUT
      );
    }

    try {
      const updatedRequirement =
        await kycRequirementService.updateKycRequirement(id, updateData);
      this.sendOrNotFound(
        updatedRequirement,
        req,
        res,
        RESPONSE_MESSAGES.SUCCESS.UPDATE
      );
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  public async getKycRequirementById(
    req: Request,
    res: Response
  ): Promise<void> {
    const { id } = req.params;

    try {
      const requirement = await kycRequirementService.getById(id);
      this.sendOrNotFound(
        requirement,
        req,
        res,
        RESPONSE_MESSAGES.SUCCESS.RETRIEVE
      );
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  public async deleteKycRequirement(
    req: Request,
    res: Response
  ): Promise<void> {
    const { id } = req.params;

    try {
      await kycRequirementService.deleteKycRequirement(id);
      res.status(httpStatus.NO_CONTENT).send();
    } catch (error) {
      this.handleError(error, req, res);
    }
  }

  protected sendOrNotFound(
    data: KycRequirement | null,
    req: Request,
    res: Response,
    successMessage: string
  ): void {
    if (!data) {
      this.sendError(
        req,
        res,
        httpStatus.NOT_FOUND,
        'KYC_REQUIREMENT_NOT_FOUND',
        RESPONSE_MESSAGES.ERROR.KYC_REQUIREMENT_NOT_FOUND
      );
    } else {
      this.sendSuccess(req, res, data, successMessage);
    }
  }
}

export default new KycRequirementController();

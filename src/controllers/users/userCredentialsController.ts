import { Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import ALLOWED_KINDS, { AllowedKind } from '../../constants/allowedKinds';
import userCredentialsService from '../../services/users/userCredentialsService';
import BaseController from '../baseController';


const RESPONSE_MESSAGES = {
  SUCCESS: {
    CREATE: 'User credential created successfully',
    UPDATE: 'User credential updated successfully',
    VERIFY: 'User credential verified successfully',
  },
  ERROR: {
    USER_CREDENTIAL_NOT_FOUND: 'User credential not found.',
    INVALID_CREDENTIAL: 'Invalid user credential.',
    CREDENTIAL_REQUIRED: 'Credential is required.',
  },
};

/**
 * UserCredentialsController handles user credential-related operations,
 * delegating business logic to the UserCredentialsService and extending BaseController.
 */
class UserCredentialsController extends BaseController<any> {
  constructor() {
    super(userCredentialsService, ALLOWED_KINDS.USER.BASE as AllowedKind);
  }

  /**
   * Handles the creation of user credentials.
   * @param req - Express request object.
   * @param res - Express response object.
   */
  async createUserCredential(req: Request, res: Response): Promise<void> {
    const { credential, algorithm, credentialType } = req.body;
    const { userId } = req.params;

    if (!credential) {
      return this.sendError(
        req,
        res,
        httpStatus.BAD_REQUEST,
        'INVALID_INPUT',
        RESPONSE_MESSAGES.ERROR.CREDENTIAL_REQUIRED
      );
    }

    try {
      await userCredentialsService.createUserCredentials({
        userId,
        credential,
        algorithm,
        credentialType,
      });

      this.sendCreated(req, res, {}, RESPONSE_MESSAGES.SUCCESS.CREATE);
    } catch (error) {
      this.handleError(
        error,
        req,
        res,
        RESPONSE_MESSAGES.ERROR.USER_CREDENTIAL_NOT_FOUND
      );
    }
  }

  /**
   * Handles updating of user credentials.
   * @param req - Express request object.
   * @param res - Express response object.
   */
  async updateUserCredential(req: Request, res: Response): Promise<void> {
    const { credential, algorithm, credentialType } = req.body;
    const { userId } = req.params;

    if (!credential) {
      return this.sendError(
        req,
        res,
        httpStatus.BAD_REQUEST,
        'INVALID_INPUT',
        RESPONSE_MESSAGES.ERROR.CREDENTIAL_REQUIRED
      );
    }

    try {
      await userCredentialsService.updateUserCredentials({
        userId,
        credential,
        algorithm,
        credentialType,
      });

      this.sendSuccess(req, res, {}, RESPONSE_MESSAGES.SUCCESS.UPDATE);
    } catch (error) {
      this.handleError(
        error,
        req,
        res,
        RESPONSE_MESSAGES.ERROR.USER_CREDENTIAL_NOT_FOUND
      );
    }
  }

  /**
   * Handles verification of user credentials.
   * @param req - Express request object.
   * @param res - Express response object.
   */
  async verifyUserCredential(req: Request, res: Response): Promise<void> {
    const { credential } = req.body;
    const { userId } = req.params;

    if (!credential) {
      return this.sendError(
        req,
        res,
        httpStatus.BAD_REQUEST,
        'INVALID_INPUT',
        RESPONSE_MESSAGES.ERROR.CREDENTIAL_REQUIRED
      );
    }

    try {
      const isValid = await userCredentialsService.verifyUserCredential(
        userId,
        credential
      );

      if (isValid) {
        this.sendSuccess(req, res, {}, RESPONSE_MESSAGES.SUCCESS.VERIFY);
      } else {
        this.sendError(
          req,
          res,
          httpStatus.UNAUTHORIZED,
          'INVALID_CREDENTIAL',
          RESPONSE_MESSAGES.ERROR.INVALID_CREDENTIAL
        );
      }
    } catch (error) {
      this.handleError(
        error,
        req,
        res,
        RESPONSE_MESSAGES.ERROR.USER_CREDENTIAL_NOT_FOUND
      );
    }
  }
}

export default new UserCredentialsController();

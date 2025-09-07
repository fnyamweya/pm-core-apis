import { Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import { UserEntity } from '../../entities/users/userEntity';
import userService from '../../services/users/userService';
import BaseController from '../baseController';
import ALLOWED_KINDS, { AllowedKind } from '../../constants/allowedKinds';
import { logger } from '../../utils/logger';

const RESPONSE_MESSAGES = {
  SUCCESS: {
    CREATE:   'User created successfully',
    UPDATE:   'User updated successfully',
    RETRIEVE: 'User retrieved successfully',
    DELETE:   'User deleted successfully',
  },
  ERROR: {
    USER_NOT_FOUND:     'User not found.',
    USER_EXISTS:        'User with this email or phone already exists.',
    INVALID_PHONE:      'Invalid phone number format.',
    INVALID_INPUT:      'Email, phone, firstName, and lastName are required.',
  },
};

const OMIT_FIELDS = ['credentials'];

/**
 * UserController handles user-related HTTP requests.
 */
class UserController extends BaseController<UserEntity> {
  constructor() {
    super(userService, ALLOWED_KINDS.USER.BASE as AllowedKind);
  }

  /**
   * Creates a new user. Accepts optional credential props.
   */
  public async createUser(req: Request, res: Response): Promise<void> {
    const { email, phone, firstName, lastName, credential, credentialType, algorithm } = req.body;

    if (!email || !phone || !firstName || !lastName) {
      return this.sendError(
        req,
        res,
        httpStatus.BAD_REQUEST,
        'INVALID_INPUT',
        RESPONSE_MESSAGES.ERROR.INVALID_INPUT
      );
    }

    try {
      const user = await userService.createUser({
        email,
        phone,
        firstName,
        lastName,
        credential,
        credentialType,
        algorithm,
      });

      this.sendCreated(req, res, user, RESPONSE_MESSAGES.SUCCESS.CREATE);
    } catch (error: any) {
      this.handleError(
        error,
        req,
        res,
        error.message.includes('Invalid phone') 
          ? RESPONSE_MESSAGES.ERROR.INVALID_PHONE
          : RESPONSE_MESSAGES.ERROR.USER_EXISTS
      );
    }
  }

  /**
   * Registers a new user.
   * Accepts email, phone, firstName, lastName, and optional credential props.
   */
  public async registerUser(
    req: Request<{}, {}, { email: string; phone: string; firstName: string; lastName: string }>,
    res: Response
  ): Promise<void> {
    try {
      const { email, phone, firstName, lastName } = req.body;
      const user = await userService.registerUser({ email, phone, firstName, lastName });
      return this.sendCreated(req, res, user, 'Registration successful; PIN sent via SMS');
    } catch (err: any) {
      logger.error('POST /users/register failed', {
        body:    req.body,
        message: err.message,
        stack:   err.stack,
      });
      return this.handleError(err, req, res);
    }
  }

  /**
   * Updates an existing user and optionally their credentials.
   */
  public async updateUser(req: Request, res: Response): Promise<void> {
    const { userId } = req.params;
    const updateData = req.body;

    if (!updateData || Object.keys(updateData).length === 0) {
      return this.sendError(
        req,
        res,
        httpStatus.BAD_REQUEST,
        'INVALID_INPUT',
        'No update data provided.'
      );
    }

    try {
      const updated = await userService.updateUser(userId, updateData);
      this.sendOrNotFound(updated, req, res, RESPONSE_MESSAGES.SUCCESS.UPDATE);
    } catch (error: any) {
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.USER_NOT_FOUND);
    }
  }

  /**
   * Retrieves a user by ID.
   */
  public async getUserById(req: Request, res: Response): Promise<void> {
    const { userId } = req.params;
    try {
      const user = await userService.getById(userId);
      this.sendSuccess(req, res, user, RESPONSE_MESSAGES.SUCCESS.RETRIEVE, undefined, OMIT_FIELDS);
    } catch (error: any) {
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.USER_NOT_FOUND);
    }
  }

  /**
   * Retrieves a user by email.
   */
  public async getUserByEmail(req: Request, res: Response): Promise<void> {
    const email = req.query.email as string | undefined;
    if (!email) {
      return this.sendError(
        req,
        res,
        httpStatus.BAD_REQUEST,
        'INVALID_INPUT',
        'Email query parameter is required.'
      );
    }

    try {
      const user = await userService.getByEmail(email);
      this.sendOrNotFound(user, req, res, RESPONSE_MESSAGES.SUCCESS.RETRIEVE);
    } catch (error: any) {
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.USER_NOT_FOUND);
    }
  }

  /**
   * Get organizations a user belongs to
   */
  public async getOrganizationsByUser(req: Request, res: Response): Promise<void> {
    const { userId } = req.params;
    try {
      const organizations = await userService.getOrganizationsByUser(userId);
      this.sendSuccess(req, res, organizations, RESPONSE_MESSAGES.SUCCESS.RETRIEVE);
    } catch (error: any) {
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.USER_NOT_FOUND);
    }
  }

  /**
   * Deletes a user by ID.
   */
  public async deleteUser(req: Request, res: Response): Promise<void> {
    const { userId } = req.params;
    try {
      await userService.deleteUser(userId);
      res.status(httpStatus.NO_CONTENT).send();
    } catch (error: any) {
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.USER_NOT_FOUND);
    }
  }

  /**
   * Helper to send 404 or success.
   */
  protected sendOrNotFound(
    data: UserEntity | null,
    req: Request,
    res: Response,
    successMessage: string
  ): void {
    if (!data) {
      this.sendError(
        req,
        res,
        httpStatus.NOT_FOUND,
        'USER_NOT_FOUND',
        RESPONSE_MESSAGES.ERROR.USER_NOT_FOUND
      );
    } else {
      this.sendSuccess(req, res, data, successMessage, undefined, OMIT_FIELDS);
    }
  }
}

export default new UserController();

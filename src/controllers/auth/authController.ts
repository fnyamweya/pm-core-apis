import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import { UnauthorizedError } from '../../errors/httpErrors';
import authService from '../../services/auth/authService';
import userService from '../../services/users/userService';

const RESPONSE_MESSAGES = {
  SUCCESS: {
    LOGIN: 'Login successful',
    TOKEN_VALID: 'Token validation successful',
    REFRESH_SUCCESS: 'Token refreshed successfully',
    LOGOUT: 'Logout successful',
  },
  ERROR: {
    INVALID_INPUT: {
      message: 'Identifier and credential are required',
      errorCode: 'INVALID_INPUT',
      statusCode: httpStatus.BAD_REQUEST,
    },
    INVALID_TOKEN_INPUT: {
      message: 'Token and type (access or refresh) are required',
      errorCode: 'INVALID_TOKEN_INPUT',
      statusCode: httpStatus.BAD_REQUEST,
    },
    INVALID_REFRESH_TOKEN: {
      message: 'Refresh token is required',
      errorCode: 'INVALID_REFRESH_TOKEN',
      statusCode: httpStatus.BAD_REQUEST,
    },
    INVALID_CREDENTIALS: {
      message: 'Invalid credentials',
      errorCode: 'INVALID_CREDENTIALS',
      statusCode: httpStatus.UNAUTHORIZED,
    },
    AUTHENTICATION_FAILED: {
      message: 'Authentication failed',
      errorCode: 'AUTHENTICATION_FAILED',
      statusCode: httpStatus.INTERNAL_SERVER_ERROR,
    },
  },
};

class AuthController {
  constructor() {
    // Binding methods to ensure correct 'this' context
    this.login = this.login.bind(this);
    this.validateToken = this.validateToken.bind(this);
    this.logout = this.logout.bind(this);
    this.refreshToken = this.refreshToken.bind(this);
  }

  private sendError(
    req: Request,
    res: Response,
    status: number,
    code: string,
    message: string
  ): void {
    res.status(status).json({ code, message });
  }

  private sendSuccess(
    req: Request,
    res: Response,
    data: any,
    message: string
  ): void {
    res.status(httpStatus.OK).json({ message, data });
  }

  public handleException(error: Error, req: Request, res: Response): void {
    if (error instanceof UnauthorizedError) {
      this.sendError(
        req,
        res,
        RESPONSE_MESSAGES.ERROR.INVALID_CREDENTIALS.statusCode,
        RESPONSE_MESSAGES.ERROR.INVALID_CREDENTIALS.errorCode,
        RESPONSE_MESSAGES.ERROR.INVALID_CREDENTIALS.message
      );
    } else {
      this.sendError(
        req,
        res,
        RESPONSE_MESSAGES.ERROR.AUTHENTICATION_FAILED.statusCode,
        RESPONSE_MESSAGES.ERROR.AUTHENTICATION_FAILED.errorCode,
        RESPONSE_MESSAGES.ERROR.AUTHENTICATION_FAILED.message
      );
    }
  }

  public async login(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { identifier, credential } = req.body;

    if (!identifier || !credential) {
      return this.sendError(
        req,
        res,
        RESPONSE_MESSAGES.ERROR.INVALID_INPUT.statusCode,
        RESPONSE_MESSAGES.ERROR.INVALID_INPUT.errorCode,
        RESPONSE_MESSAGES.ERROR.INVALID_INPUT.message
      );
    }

    try {
      const { accessToken, refreshToken } = await authService.authenticate(
        identifier,
        credential
      );
      this.sendSuccess(
        req,
        res,
        { accessToken, refreshToken },
        RESPONSE_MESSAGES.SUCCESS.LOGIN
      );
    } catch (error) {
      this.handleException(error as Error, req, res);
    }
  }

  public async validateToken(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { token, type } = req.body;

    if (!token || (type !== 'access' && type !== 'refresh')) {
      return this.sendError(
        req,
        res,
        RESPONSE_MESSAGES.ERROR.INVALID_TOKEN_INPUT.statusCode,
        RESPONSE_MESSAGES.ERROR.INVALID_TOKEN_INPUT.errorCode,
        RESPONSE_MESSAGES.ERROR.INVALID_TOKEN_INPUT.message
      );
    }

    try {
      const decoded = authService.verifyToken(token, type);
      this.sendSuccess(
        req,
        res,
        { valid: true, decoded },
        RESPONSE_MESSAGES.SUCCESS.TOKEN_VALID
      );
    } catch (error: unknown) {
      this.handleException(error as Error, req, res);
    }
  }

  public async logout(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return this.sendError(
        req,
        res,
        RESPONSE_MESSAGES.ERROR.INVALID_REFRESH_TOKEN.statusCode,
        RESPONSE_MESSAGES.ERROR.INVALID_REFRESH_TOKEN.errorCode,
        RESPONSE_MESSAGES.ERROR.INVALID_REFRESH_TOKEN.message
      );
    }

    try {
      await authService.revokeToken(refreshToken);
      this.sendSuccess(req, res, {}, RESPONSE_MESSAGES.SUCCESS.LOGOUT);
    } catch (error: unknown) {
      this.handleException(error as Error, req, res);
    }
  }

  /**
   * Refreshes the access token using a valid refresh token.
   */
  public async refreshToken(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return this.sendError(
        req,
        res,
        RESPONSE_MESSAGES.ERROR.INVALID_REFRESH_TOKEN.statusCode,
        RESPONSE_MESSAGES.ERROR.INVALID_REFRESH_TOKEN.errorCode,
        RESPONSE_MESSAGES.ERROR.INVALID_REFRESH_TOKEN.message
      );
    }

    try {
      const newAccessToken = await authService.refreshToken(refreshToken);
      this.sendSuccess(
        req,
        res,
        { accessToken: newAccessToken },
        RESPONSE_MESSAGES.SUCCESS.REFRESH_SUCCESS
      );
    } catch (error: unknown) {
      this.handleException(error as Error, req, res);
    }
  }


  /**
   * Retrieves authenticated user profile
   */
  public async getAuthenticatedUser(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const userId = req.user?.sub;

    if (!userId) {
      return this.sendError(
        req,
        res,
        httpStatus.UNAUTHORIZED,
        'UNAUTHORIZED',
        'User not authenticated'
      );
    }

    try {
      const authenticatedUser = await authService.getAuthenticatedUser(userId);

      // Derive a current organization for a smoother UX on hard reloads.
      const orgIds: string[] = (authenticatedUser as any).organizationIds || [];
      const organizations: any[] = (authenticatedUser as any).organizations || [];

      // Prefer explicit header or query override when valid
      const requestedOrgId =
        (req.headers['x-org-id'] as string | undefined) ||
        (req.query.orgId as string | undefined);

      // Choose current organization id based on precedence
      let currentOrganizationId: string | undefined;
      if (requestedOrgId && orgIds.includes(requestedOrgId)) {
        currentOrganizationId = requestedOrgId;
      } else {
        // Prefer an active membership if present; otherwise first membership
        const active = organizations.find((o) => o?.status === 'active');
        currentOrganizationId = active?.id || orgIds[0];
      }

      // Attach a hint header and include in body so the client can hydrate state immediately
      if (currentOrganizationId) {
        res.setHeader('x-current-org-id', currentOrganizationId);
      }

      this.sendSuccess(
        req,
        res,
        { ...authenticatedUser, currentOrganizationId },
        'Authenticated user profile retrieved successfully'
      );
    } catch (error: unknown) {
      this.handleException(error as Error, req, res);
    }
  }
}

export default new AuthController();

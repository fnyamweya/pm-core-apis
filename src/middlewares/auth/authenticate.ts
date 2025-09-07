import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import authService from '../../services/auth/authService';
import userRoleService from '../../services/users/userRoleService'; // Import the UserRoleService
import organizationUserService from '../../services/organizations/organizationUserService';
import { logger } from '../../utils/logger';

export interface DecodedToken {
  sub: string;
  iat: number;
  exp: number;
  roles: string[];
  organizationIds?: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: DecodedToken;
    }
  }
}

// Centralized Error Management
class AuthenticationError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = httpStatus.UNAUTHORIZED
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

const AUTH_ERRORS = {
  NO_TOKEN: new AuthenticationError(
    'NO_TOKEN_PROVIDED',
    'Authorization token is required'
  ),
  INVALID_FORMAT: new AuthenticationError(
    'INVALID_TOKEN_FORMAT',
    'Invalid token format'
  ),
  INVALID_TOKEN: new AuthenticationError(
    'INVALID_TOKEN',
    'Invalid or expired token'
  ),
};

// Extracts token and ensures it's in Bearer format
const extractBearerToken = (authHeader?: string): string => {
  if (!authHeader?.startsWith('Bearer ')) throw AUTH_ERRORS.NO_TOKEN;
  const token = authHeader.split(' ')[1];
  if (!token) throw AUTH_ERRORS.INVALID_FORMAT;
  return token;
};

// Handles errors in a uniform format
const handleAuthError = (
  error: Error,
  res: Response,
  requestId?: string
): void => {
  const authError =
    error instanceof AuthenticationError ? error : AUTH_ERRORS.INVALID_TOKEN;

  logger.error('Authentication failed', {
    context: 'authenticate',
    error: error.message,
    code: authError.code,
    requestId,
  });

  res.status(authError.statusCode).json({
    code: authError.code,
    message: authError.message,
    requestId,
  });
};

// Logs authentication duration
const logAuthCompletion = (
  startTime: [number, number],
  requestId: string | undefined,
  userId: string
) => {
  const [seconds, nanoseconds] = process.hrtime(startTime);
  const duration = (seconds * 1000 + nanoseconds / 1e6).toFixed(2);
  logger.debug('Authentication completed', {
    context: 'authenticate',
    requestId,
    duration: `${duration}ms`,
    userId,
  });
};

// Middleware for flexible token types
const authenticate =
  (tokenType: 'access' | 'refresh' = 'access') =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const requestId = req.headers['x-request-id'] as string;

    try {
      const token = extractBearerToken(req.headers.authorization);
      const decoded = (await authService.verifyToken(
        token,
        tokenType
      )) as DecodedToken;

      // Fetch roles using UserRoleService
      const roles = await userRoleService.getRolesByUserId(decoded.sub);
      decoded.roles = roles.map((role) => role.roleId); // Assuming roleId is the role identifier

      // Ensure organization IDs are attached
      try {
        const orgIds = await organizationUserService.getOrganizationIdsByUser(decoded.sub);
        decoded.organizationIds = orgIds;
      } catch (e) {
        // Non-fatal: keep going even if org lookup fails
      }

      req.user = decoded;
      const startTime = process.hrtime();

      res.on('finish', () =>
        logAuthCompletion(startTime, requestId, decoded.sub)
      );

      next();
    } catch (error) {
      handleAuthError(error as Error, res, requestId);
    }
  };

export default authenticate;

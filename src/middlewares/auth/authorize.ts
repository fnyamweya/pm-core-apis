import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import { getCerbosClient } from '../../config/cerbos';
import { UnauthorizedError } from '../../errors/httpErrors';
import { logger } from '../../utils/logger';
import { DecodedToken } from './authenticate';

interface UserRoles {
  roles: string[];
}

type User = DecodedToken & UserRoles;

const authorize = (
  resourceKind: string,
  action: string,
  idField: string = 'id'
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user as User;
      if (!user) {
        throw new UnauthorizedError('User not authenticated');
      }

      if (!user.roles || user.roles.length === 0) {
        throw new UnauthorizedError('User roles are not defined');
      }

      logger.info('User roles:', { roles: user.roles });

      const resourceId = req.params[idField] || 'default-resource-id';
      logger.info('Request parameters:', req.params);
      if (!resourceId) {
        logger.warn('Resource ID is not defined in the request parameters', {
          params: req.params,
        });
      }

      const principal = {
        id: user.sub,
        roles: user.roles,
      };

      const resource = {
        kind: resourceKind,
        id: resourceId,
        attributes: {},
      };

      const cerbosClient = await getCerbosClient();

      logger.info('Cerbos authorization check:', {
        principal,
        resource,
        action,
      });

      const decision = await cerbosClient.checkResource({
        principal,
        resource,
        actions: [action],
      });

      logger.info('Cerbos decision:', { decision });

      if (decision.isAllowed(action)) {
        next();
      } else {
        res.status(httpStatus.FORBIDDEN).json({ message: 'Access denied' });
      }
    } catch (error) {
      logger.error('Authorization error:', error);

      if (error instanceof UnauthorizedError) {
        res.status(httpStatus.UNAUTHORIZED).json({ message: error.message });
      } else {
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
          message: 'An unexpected error occurred during authorization',
        });
      }
    }
  };
};

export default authorize;

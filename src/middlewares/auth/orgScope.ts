import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status-codes';

declare global {
  namespace Express {
    interface Request {
      orgId?: string;
    }
  }
}

/**
 * orgScope middleware
 * - Reads organization ID from query or headers: `organizationId`, `x-org-id`, `x-organization-id`.
 * - If user is authenticated and has organizationIds, validates membership when an orgId is supplied.
 * - Attaches `req.orgId` for downstream handlers.
 * - Does not enforce presence; acts as a hint when provided.
 */
export default function orgScope(req: Request, res: Response, next: NextFunction) {
  try {
    const q = (req.query.organizationId as string | undefined)?.trim();
    const h1 = (req.headers['x-org-id'] as string | undefined)?.trim();
    const h2 = (req.headers['x-organization-id'] as string | undefined)?.trim();
    const candidate = q || h1 || h2;

    if (candidate) {
      const userOrgIds = (req.user?.organizationIds || []) as string[];
      if (userOrgIds.length) {
        if (!userOrgIds.includes(candidate)) {
          return res.status(httpStatus.FORBIDDEN).json({
            code: 'FORBIDDEN_ORG_SCOPE',
            message: 'You are not a member of the specified organization',
          });
        }
      }
      req.orgId = candidate;
    }

    next();
  } catch (e) {
    return res.status(httpStatus.BAD_REQUEST).json({
      code: 'BAD_ORG_SCOPE',
      message: 'Invalid organization scope parameters',
    });
  }
}


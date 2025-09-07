import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import { OrganizationUserRole } from '../../entities/organizations/organizationUserEntity';
import organizationUserService from '../../services/organizations/organizationUserService';
import propertyRepository from '../../repositories/properties/propertyRepository';

type RoleList = OrganizationUserRole[];

const forbidden = (res: Response, message: string) =>
  res.status(httpStatus.FORBIDDEN).json({ code: 'FORBIDDEN', message });

const notFound = (res: Response, message: string) =>
  res.status(httpStatus.NOT_FOUND).json({ code: 'NOT_FOUND', message });

const badRequest = (res: Response, message: string) =>
  res.status(httpStatus.BAD_REQUEST).json({ code: 'BAD_REQUEST', message });

/**
 * Ensures the authenticated user is a member of the organization specified in the request body,
 * and (optionally) holds at least one required role for that organization.
 */
export function requireOrgRoleFromBody(
  orgIdBodyKey: string,
  requiredRoles?: RoleList
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    const organizationId = (req.body?.[orgIdBodyKey] as string) || req.params?.[orgIdBodyKey];
    if (!user || !user.sub) return forbidden(res, 'Authentication required');
    if (!organizationId) return badRequest(res, `Missing ${orgIdBodyKey}`);

    const memberships = user.organizationIds || [];
    if (!memberships.includes(organizationId)) {
      return forbidden(res, 'You are not a member of the specified organization');
    }

    if (!requiredRoles || requiredRoles.length === 0) return next();

    try {
      const membership = await organizationUserService.getUserMembership(organizationId, user.sub);
      const roles = membership?.roles || [];
      const ok = roles.some((r) => requiredRoles.includes(r));
      if (!ok) {
        return forbidden(
          res,
          `Insufficient role for organization ${organizationId}. Required one of: ${requiredRoles.join(', ')}`
        );
      }
      next();
    } catch (e) {
      return forbidden(res, 'Authorization check failed');
    }
  };
}

/**
 * Ensures the authenticated user is a member of the organization that owns the property in :paramName,
 * and (optionally) holds at least one required role for that organization.
 */
export function requireOrgRoleForProperty(
  propertyIdParamName: string,
  requiredRoles?: RoleList
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    const propertyId = req.params?.[propertyIdParamName];
    if (!user || !user.sub) return forbidden(res, 'Authentication required');
    if (!propertyId) return badRequest(res, `Missing property id param: ${propertyIdParamName}`);

    const property = await propertyRepository.findById(propertyId);
    if (!property) return notFound(res, `Property ${propertyId} not found`);
    const organizationId = property.organization?.id;
    if (!organizationId) return badRequest(res, 'Property has no owning organization');

    const memberships = user.organizationIds || [];
    if (!memberships.includes(organizationId)) {
      return forbidden(res, 'You are not a member of the owning organization');
    }

    if (!requiredRoles || requiredRoles.length === 0) return next();

    try {
      const membership = await organizationUserService.getUserMembership(organizationId, user.sub);
      const roles = membership?.roles || [];
      const ok = roles.some((r) => requiredRoles.includes(r));
      if (!ok) {
        return forbidden(
          res,
          `Insufficient role for organization ${organizationId}. Required one of: ${requiredRoles.join(', ')}`
        );
      }
      next();
    } catch (e) {
      return forbidden(res, 'Authorization check failed');
    }
  };
}


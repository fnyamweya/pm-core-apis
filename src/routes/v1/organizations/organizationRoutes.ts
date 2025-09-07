import { Router } from 'express';
import OrganizationController from '../../../controllers/organizations/organizationController';
import OrganizationUserController from '../../../controllers/organizations/organizationUserController';
import authenticate from '../../../middlewares/auth/authenticate';
import asyncHandler from '../../../middlewares/common/asyncHandler';
import validate from '../../../middlewares/common/validate';
import {
  addUserToOrgWithRolesSchema,
  getMembershipSchema,
  updateStatusSchema,
  replaceRolesSchema,
  removeRolesSchema,
  orgUserIdSchema,
} from '../../../validations/organizations/organizationUserValidation';
import {
  createOrganizationSchema,
  deleteOrganizationSchema,
  getOrganizationByIdSchema,
  getOrganizationWithRelationsSchema,
  restoreOrganizationSchema,
  softDeleteOrganizationSchema,
  updateOrganizationSchema,
} from '../../../validations/organizations/organizationValidation';

const router = Router();

/**
 * --------------------------
 * Organization CRUD routes
 * --------------------------
 */

/**
 * @route POST /organizations
 * @description Create a new organization
 * @access Public
 */
router.post(
  '/',
  authenticate('access'),
  validate(createOrganizationSchema),
  asyncHandler(OrganizationController.createOrganization.bind(OrganizationController))
);

/**
 * @route PUT /organizations/:id
 * @description Update an existing organization by ID
 * @access Protected
 */
router.put(
  '/:id',
  authenticate('access'),
  validate(updateOrganizationSchema),
  asyncHandler(OrganizationController.updateOrganization.bind(OrganizationController))
);

/**
 * @route GET /organizations
 * @description Retrieve all organizations with optional pagination
 * @access Public
 */
router.get(
  '/',
  // authenticate('access'),
  asyncHandler(OrganizationController.getAll.bind(OrganizationController))
);

/**
 * @route GET /organizations/:id
 * @description Retrieve an organization by ID
 * @access Protected
 */
router.get(
  '/:id',
  authenticate('access'),
  validate(getOrganizationByIdSchema),
  asyncHandler(OrganizationController.getOrganizationById.bind(OrganizationController))
);

/**
 * @route DELETE /organizations/:id
 * @description Delete an organization by ID
 * @access Protected
 */
router.delete(
  '/:id',
  authenticate('access'),
  validate(deleteOrganizationSchema),
  asyncHandler(OrganizationController.deleteOrganization.bind(OrganizationController))
);

/**
 * @route PATCH /organizations/:id/soft-delete
 * @description Soft delete an organization by ID
 * @access Protected
 */
router.patch(
  '/:id/soft-delete',
  authenticate('access'),
  validate(softDeleteOrganizationSchema),
  asyncHandler(OrganizationController.softDeleteOrganization.bind(OrganizationController))
);

/**
 * @route PATCH /organizations/:id/restore
 * @description Restore a soft-deleted organization by ID
 * @access Protected
 */
router.patch(
  '/:id/restore',
  authenticate('access'),
  validate(restoreOrganizationSchema),
  asyncHandler(OrganizationController.restoreOrganization.bind(OrganizationController))
);

/**
 * @route GET /organizations/:id/with-relations
 * @description Retrieve an organization with all related entities
 * @access Protected
 */
router.get(
  '/:id/with-relations',
  authenticate('access'),
  validate(getOrganizationWithRelationsSchema),
  asyncHandler(OrganizationController.getOrganizationWithRelations.bind(OrganizationController))
);

/**
 * -------------------------------------------
 * Organization–User membership routes (NEW)
 * Base: /organizations/:organizationId/users
 * -------------------------------------------
 */

/**
 * @route POST /organizations/:organizationId/users
 * @description Create or merge a membership with roles.
 * @body { userId: string, roles?: OrganizationUserRole[], status?: string }
 * @access Protected
 */
router.post(
  '/:organizationId/users',
  // authenticate('access'),
  validate(addUserToOrgWithRolesSchema),
  asyncHandler(OrganizationUserController.addUserToOrganizationWithRoles.bind(OrganizationUserController))
);

/**
 * @route GET /organizations/:organizationId/users
 * @description List users/memberships in an organization
 * @access Protected
 */
router.get(
  '/:organizationId/users',
  authenticate('access'),
  asyncHandler(OrganizationUserController.listUsersByOrganization.bind(OrganizationUserController))
);

/**
 * @route GET /organizations/:organizationId/users/:userId
 * @description Get a membership by composite keys
 * @access Protected
 */
router.get(
  '/:organizationId/users/:userId',
  authenticate('access'),
  validate(getMembershipSchema),
  asyncHandler(OrganizationUserController.getMembership.bind(OrganizationUserController))
);

/**
 * @route PATCH /organizations/:organizationId/users/:userId/status
 * @description Update membership status
 * @body { status: string }
 * @access Protected
 */
router.patch(
  '/:organizationId/users/:userId/status',
  authenticate('access'),
  validate(updateStatusSchema),
  asyncHandler(OrganizationUserController.updateStatus.bind(OrganizationUserController))
);

/**
 * @route PUT /organizations/:organizationId/users/:userId/roles
 * @description Replace roles exactly (overwrite)
 * @body { roles: OrganizationUserRole[] }
 * @access Protected
 */
router.put(
  '/:organizationId/users/:userId/roles',
  authenticate('access'),
  validate(replaceRolesSchema),
  asyncHandler(OrganizationUserController.replaceRoles.bind(OrganizationUserController))
);

/**
 * @route PATCH /organizations/:organizationId/users/:userId/roles
 * @description Remove specific roles (no-op if role not present)
 * @body { roles: OrganizationUserRole[] }
 * @access Protected
 */
router.patch(
  '/:organizationId/users/:userId/roles',
  authenticate('access'),
  validate(removeRolesSchema),
  asyncHandler(OrganizationUserController.removeRoles.bind(OrganizationUserController))
);

/**
 * @route DELETE /organizations/:organizationId/users/:userId
 * @description Soft delete membership
 * @access Protected
 */
router.delete(
  '/:organizationId/users/:userId',
  authenticate('access'),
  validate(getMembershipSchema),
  asyncHandler(OrganizationUserController.softDeleteOrganizationUser.bind(OrganizationUserController))
);

/**
 * @route POST /organizations/:organizationId/users/:userId/restore
 * @description Restore soft-deleted membership
 * @access Protected
 */
router.post(
  '/:organizationId/users/:userId/restore',
  authenticate('access'),
  validate(getMembershipSchema),
  asyncHandler(OrganizationUserController.restoreOrganizationUser.bind(OrganizationUserController))
);

/**
 * (Optional) If you sometimes reference org-user row by its own ID:
 * @route GET /organizations/org-users/:id
 * @description Get membership by row ID
 * @access Protected
 */
router.get(
  '/org-users/:id',
  authenticate('access'),
  validate(orgUserIdSchema),
  asyncHandler(OrganizationUserController.getOrganizationUserById.bind(OrganizationUserController))
);

export default router;

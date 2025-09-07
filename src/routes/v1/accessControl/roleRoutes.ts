import { Router } from 'express';
import RoleController from '../../../controllers/accessControl/roleController';
import authenticate from '../../../middlewares/auth/authenticate';
import asyncHandler from '../../../middlewares/common/asyncHandler';
import validate from '../../../middlewares/common/validate';
import {
  createRoleSchema,
  deleteRoleSchema,
  getRoleSchema,
  updateRoleSchema,
} from '../../../validations/accessControl/roleValidation';

const router = Router();

/**
 * @route POST /roles
 * @description Create a new role
 * @access Public
 */
router.post(
  '/',
  authenticate('access'),
  // authorize(['admin'], ['create_role'], { requireAll: true }),
  validate(createRoleSchema),
  asyncHandler(RoleController.createRole.bind(RoleController))
);

/**
 * @route PUT /roles/:roleId
 * @description Update an existing role by code
 * @access Public
 */
router.put(
  '/:roleId',
  authenticate('access'),
  validate(updateRoleSchema),
  asyncHandler(RoleController.updateRole.bind(RoleController))
);

/**
 * @route GET /roles
 * @description Retrieve all roles with optional pagination
 * @access Public
 */
router.get(
  '/',
  // authenticate('access'),
  // authorize(['admin'], ['get_roles'], { requireAll: true }),
  asyncHandler(RoleController.getAll.bind(RoleController))
);

/**
 * @route GET /roles/:roleIdentifier
 * @description Retrieve a role by code
 * @access Public
 */
router.get(
  '/:roleId',
  authenticate('access'),
  // authorize(['admin'], ['get_role'], { requireAll: true }),
  validate(getRoleSchema),
  asyncHandler(RoleController.getRoleById.bind(RoleController))
);

/**
 * @route DELETE /roles/:roleId
 * @description Delete a role by code
 * @access Public
 */
router.delete(
  '/:roleId',
  authenticate('access'),
  validate(deleteRoleSchema),
  asyncHandler(RoleController.deleteRole.bind(RoleController))
);

export default router;

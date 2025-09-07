import { Router } from 'express';
import RolePermissionController from '../../../controllers/accessControl/rolePermissionController';
import authenticate from '../../../middlewares/auth/authenticate';
import asyncHandler from '../../../middlewares/common/asyncHandler';
import validate from '../../../middlewares/common/validate';
import { createRolePermissionSchema } from '../../../validations/accessControl/rolePermissionValidation';

const router = Router();

/**
 * @route POST /role-permissions
 * @description Create a new role permission
 * @access Public
 */
router.post(
  '/:roleId/permissions',
  validate(createRolePermissionSchema),
  authenticate('access'),
  asyncHandler(
    RolePermissionController.createRolePermission.bind(RolePermissionController)
  )
);

/**
 * @route GET /role-permissions/:roleId/:permissionId
 * @description Retrieve a role permission by role and permission identifiers
 * @access Public
 */
router.get(
  '/:roleId/permissions/:permissionId',
  asyncHandler(
    RolePermissionController.getRolePermissionByRoleIdAndPermissionId.bind(
      RolePermissionController
    )
  )
);

/**
 * @route GET /role-permissions/:roleId/permissions
 * @description Retrieve all role permissions for a specific role
 * @access Public
 */
router.get(
  '/:roleId/permissions',
  asyncHandler(
    RolePermissionController.getAllRolePermissions.bind(
      RolePermissionController
    )
  )
);

/**
 * @route DELETE /role-permissions/:roleId/:permissionId
 * @description Delete a role permission by role and permission identifiers
 * @access Public
 */
router.delete(
  '/:roleId/:permissionId',
  asyncHandler(
    RolePermissionController.deleteRolePermission.bind(RolePermissionController)
  )
);

export default router;

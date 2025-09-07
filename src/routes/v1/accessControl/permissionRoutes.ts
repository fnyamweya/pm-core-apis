import { Router } from 'express';
import PermissionController from '../../../controllers/accessControl/permissionController';
import authenticate from '../../../middlewares/auth/authenticate';
import asyncHandler from '../../../middlewares/common/asyncHandler';
import validate from '../../../middlewares/common/validate';
import { createPermissionSchema } from '../../../validations/accessControl/permissionValidation';

const router = Router();

/**
 * @route POST /permissions
 * @description Create a new permission
 * @access Public
 */
router.post(
  '/',
  validate(createPermissionSchema),
  authenticate('access'),
  // authorize(['admin'], [''], { requireAll: false }),
  asyncHandler(PermissionController.createPermission.bind(PermissionController))
);

/**
 * @route PUT /permissions/:permissionIdentifier
 * @description Update an existing permission by code
 * @access Public
 */
router.put(
  '/:permissionIdentifier',
  asyncHandler(PermissionController.updatePermission.bind(PermissionController))
);

/**
 * @route GET /permissions
 * @description Retrieve all permissions with optional pagination
 * @access Public
 */
router.get(
  '/',
  asyncHandler(PermissionController.getAll.bind(PermissionController))
);

/**
 * @route GET /permissions/:permissionIdentifier
 * @description Retrieve a permission by code
 * @access Public
 */
router.get(
  '/:permissionIdentifier',
  asyncHandler(
    PermissionController.getPermissionById.bind(PermissionController)
  )
);

/**
 * @route DELETE /permissions/:permissionIdentifier
 * @description Delete a permission by code
 * @access Public
 */
router.delete(
  '/:permissionIdentifier',
  asyncHandler(PermissionController.deletePermission.bind(PermissionController))
);

export default router;

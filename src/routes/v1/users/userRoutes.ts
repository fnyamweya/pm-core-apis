import { Router } from 'express';
import UserController from '../../../controllers/users/userController';
import UserRoleController from '../../../controllers/users/userRoleController';
import authenticate from '../../../middlewares/auth/authenticate';
import authorize from '../../../middlewares/auth/authorize';
import asyncHandler from '../../../middlewares/common/asyncHandler';
import validate from '../../../middlewares/common/validate';
import { assignRoleSchema } from '../../../validations/users/userRoleValidation';
import {
  createUserSchema,
  registerUserSchema,
  updateUserSchema,
} from '../../../validations/users/userValidation';

const router = Router();

/**
 * @route POST /users
 * @description Create a new user
 * @access Public
 */
router.post(
  '/',
  validate(createUserSchema),
  // authenticate('access'),
  // authorize('users', 'create'),
  asyncHandler(UserController.createUser.bind(UserController))
);

/**
 * @route POST /users/register
 * @description Register a new user (self-registration)
 * @access Public
 */
router.post(
  '/register',
  validate(registerUserSchema),
  asyncHandler(UserController.registerUser.bind(UserController))
);

/**
 * @route PUT /users/:userId
 * @description Update an existing user by ID
 * @access Public
 */
router.put(
  '/:userId',
  authenticate('access'),
  // authorize('users', 'update'),
  validate(updateUserSchema),
  asyncHandler(UserController.updateUser.bind(UserController))
);

/**
 * @route GET /users
 * @description Retrieve all users with optional pagination
 * @access Public
 */
router.get(
  '/',
  // authenticate('access'),
  asyncHandler(UserController.getPaginated.bind(UserController))
);

/**
 * @route GET /users/:userId
 * @description Retrieve a user by ID
 * @access Public
 */
router.get(
  '/:userId',
  authenticate('access'),
  asyncHandler(UserController.getUserById.bind(UserController))
);

/**
 * @route GET /users/email
 * @description Retrieve a user by email
 * @access Public
 */
router.get(
  '/email',
  authenticate('access'),
  asyncHandler(UserController.getUserByEmail.bind(UserController))
);

/**
 * @route DELETE /users/:userId
 * @description Delete a user by ID
 * @access Public
 */
router.delete(
  '/:userId',
  authenticate('access'),
  asyncHandler(UserController.deleteUser.bind(UserController))
);

/** -------------------- User Role Routes -------------------- **/

/**
 * @route POST /users/:userId/roles
 * @description Add a role to a specific user
 * @access Public
 */
router.post(
  '/:userId/roles',
  validate(assignRoleSchema),
  authenticate('access'),
  asyncHandler(UserRoleController.addUserRole.bind(UserRoleController))
);

/**
 * @route GET /users/:userId/roles
 * @description Retrieve all roles for a specific user
 * @access Public
 */
router.get(
  '/:userId/roles',
  authenticate('access'),
  asyncHandler(UserRoleController.getUserRoles.bind(UserRoleController))
);

/**
 * @route DELETE /users/:userId/roles/:roleId
 * @description Remove a specific role from a user
 * @access Public
 */
router.delete(
  '/:userId/roles/:roleId',
  authenticate('access'),
  asyncHandler(UserRoleController.removeUserRole.bind(UserRoleController))
);

/**
 * @route DELETE /users/:userId/roles
 * @description Remove all roles from a specific user
 * @access Public
 */
router.delete(
  '/:userId/roles',
  authenticate('access'),
  asyncHandler(UserRoleController.removeAllUserRoles.bind(UserRoleController))
);

/**
 * @route GET /users/:userId/organizations
 * @description Get organizations a user belongs to
 * @access Public
 */
router.get(
  '/:userId/organizations',
  authenticate('access'),
  asyncHandler(UserController.getOrganizationsByUser.bind(UserController))
);

export default router;

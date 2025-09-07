import { Router } from 'express';
import authController from '../../../controllers/auth/authController';
import authenticate from '../../../middlewares/auth/authenticate';

const router = Router();

/**
 * @route POST /auth/login
 * @desc Authenticate user and issue tokens (access and refresh tokens)
 * @access Public
 */
router.post('/login', authController.login);

/**
 * @route POST /auth/me
 * @desc Retrieve authenticated user's profile
 * @access Private
 */
/**
 * @openapi
 * /auth/me:
 *   post:
 *     summary: Get authenticated user profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Authenticated user's profile including organizations and organizationIds
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/me',
  authenticate('access'),
  authController.getAuthenticatedUser.bind(authController)
);

/**
 * @route GET /auth/me
 * @desc Retrieve authenticated user's profile
 * @access Private
 */
router.get(
  '/me',
  authenticate('access'),
  authController.getAuthenticatedUser.bind(authController)
);

/**
 * @route POST /auth/validate
 * @desc Validate an access or refresh token
 * @access Public
 */
router.post('/validate', authController.validateToken);

/**
 * @route POST /auth/refresh
 * @desc Generate a new access token using a valid refresh token
 * @access Public
 */
router.post('/refresh', authController.refreshToken);

/**
 * @route POST /auth/logout
 * @desc Invalidate a refresh token to log the user out
 * @access Public
 */
router.post('/logout', authController.logout);

export default router;

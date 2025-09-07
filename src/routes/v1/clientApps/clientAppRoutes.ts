import { Router } from 'express';
import ClientAppConfigController from '../../../controllers/clientApps/clientAppConfigController';
import ClientAppController from '../../../controllers/clientApps/clientAppController';
import authenticate from '../../../middlewares/auth/authenticate';
import asyncHandler from '../../../middlewares/common/asyncHandler';
import validate from '../../../middlewares/common/validate';
import {
  createApplicationConfigSchema,
  updateApplicationConfigSchema,
} from '../../../validations/clientApps/clientAppConfigValidation';
import {
  createClientAppSchema,
  updateClientAppSchema,
} from '../../../validations/clientApps/clientAppValidation';

const router = Router();

/**
 * @route POST /applications
 * @description Create a new client app
 * @access Private (requires authentication and authorization)
 */
router.post(
  '/',
  validate(createClientAppSchema),
  authenticate('access'),
  asyncHandler(ClientAppController.createClientApp.bind(ClientAppController))
);

/**
 * @route PUT /applications/:appId
 * @description Update an existing client app by appId
 * @access Private (requires authentication and authorization)
 */
router.put(
  '/:appId',
  validate(updateClientAppSchema),
  authenticate('access'),
  asyncHandler(ClientAppController.updateClientApp.bind(ClientAppController))
);

/**
 * @route GET /applications
 * @description Retrieve all client apps with optional pagination
 * @access Private (requires authentication and authorization)
 */
router.get(
  '/',
  authenticate('access'),
  asyncHandler(ClientAppController.getPaginated.bind(ClientAppController))
);

/**
 * @route GET /applications/:appId
 * @description Retrieve a client app by appId
 * @access Private (requires authentication and authorization)
 */
router.get(
  '/:appId',
  authenticate('access'),
  asyncHandler(
    ClientAppController.getClientAppByAppId.bind(ClientAppController)
  )
);

/**
 * @route DELETE /applications/:appId
 * @description Delete a client app by appId
 * @access Private (requires authentication and authorization)
 */
router.delete(
  '/:appId',
  authenticate('access'),
  asyncHandler(ClientAppController.deleteClientApp.bind(ClientAppController))
);

/**
 * @route POST /applications/:appId/config
 * @description Create a new client app config for a specific appId
 * @access Private (requires authentication and authorization)
 */
router.post(
  '/:appId/config',
  validate(createApplicationConfigSchema),
  authenticate('access'),
  asyncHandler(
    ClientAppConfigController.createClientAppConfig.bind(
      ClientAppConfigController
    )
  )
);

/**
 * @route PUT /applications/:appId/config
 * @description Update an existing client app config by appId
 * @access Private (requires authentication and authorization)
 */
router.put(
  '/:appId/config',
  validate(updateApplicationConfigSchema),
  authenticate('access'),
  asyncHandler(
    ClientAppConfigController.updateClientAppConfig.bind(
      ClientAppConfigController
    )
  )
);

/**
 * @route GET /applications/:appId/config
 * @description Retrieve a client app config by appId
 * @access Private (requires authentication and authorization)
 */
router.get(
  '/:appId/config',
  authenticate('access'),
  asyncHandler(
    ClientAppConfigController.getClientAppConfigByAppId.bind(
      ClientAppConfigController
    )
  )
);

/**
 * @route DELETE /applications/:appId/config
 * @description Delete a client app config by appId
 * @access Private (requires authentication and authorization)
 */
router.delete(
  '/:appId/config',
  authenticate('access'),
  asyncHandler(
    ClientAppConfigController.deleteClientAppConfig.bind(
      ClientAppConfigController
    )
  )
);

export default router;

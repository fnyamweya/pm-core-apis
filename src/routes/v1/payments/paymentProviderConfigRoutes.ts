import { Router } from 'express';
import PaymentProviderConfigController from '../../../controllers/payments/paymentProviderConfigController';
import authenticate from '../../../middlewares/auth/authenticate';
import asyncHandler from '../../../middlewares/common/asyncHandler';

const router = Router();

/**
 * @route POST /payment-configs/:providerCode/configs
 * @description Create a new configuration for a payment provider
 * @access Public
 */
router.post(
  '/:providerCode/configs',
  authenticate('access'),
  asyncHandler(
    PaymentProviderConfigController.createConfig.bind(
      PaymentProviderConfigController
    )
  )
);

/**
 * @route GET /payment-configs/:providerCode/configs
 * @description Retrieve all configurations for a specific payment provider
 * @access Public
 */
router.get(
  '/:providerCode/configs',
  authenticate('access'),
  asyncHandler(
    PaymentProviderConfigController.getConfigsByProviderCode.bind(
      PaymentProviderConfigController
    )
  )
);

/**
 * @route PUT /payment-providers/:providerCode/configs/:key
 * @description Update a configuration for a payment provider by key
 * @access Public
 */
router.put(
  '/:providerCode/configs/:key',
  authenticate('access'),
  asyncHandler(
    PaymentProviderConfigController.updateConfigByProviderCode.bind(
      PaymentProviderConfigController
    )
  )
);

/**
 * @route DELETE /payment-providers/:providerCode/configs/:key
 * @description Delete a configuration for a payment provider by key
 * @access Public
 */
router.delete(
  '/:providerCode/configs/:key',
  authenticate('access'),
  asyncHandler(
    PaymentProviderConfigController.deleteConfigByProviderCode.bind(
      PaymentProviderConfigController
    )
  )
);

export default router;

import { Router } from 'express';
import PaymentProviderController from '../../../controllers/payments/paymentProviderController';
import authenticate from '../../../middlewares/auth/authenticate';
import asyncHandler from '../../../middlewares/common/asyncHandler';
import validate from '../../../middlewares/common/validate';
import { createPaymentProviderSchema, updatePaymentProviderSchema } from '../../../validations/payments/paymentProviderValidation';

const router = Router();

/**
 * @route POST /payment-providers
 * @description Create a new payment provider
 * @access Public
 */
router.post(
  '/',
  authenticate('access'),
  validate(createPaymentProviderSchema),
  asyncHandler(
    PaymentProviderController.createPaymentProvider.bind(
      PaymentProviderController
    )
  )
);

/**
 * @route GET /payment-providers
 * @description Retrieve all payment providers
 * @access Public
 */
router.get(
  '/',
  authenticate('access'),
  asyncHandler(
    PaymentProviderController.getAllPaymentProviders.bind(
      PaymentProviderController
    )
  )
);

/**
 * @route GET /payment-providers/:code
 * @description Retrieve a payment provider by its code
 * @access Public
 */
router.get(
  '/:code',
  authenticate('access'),
  asyncHandler(
    PaymentProviderController.getPaymentProviderByCode.bind(
      PaymentProviderController
    )
  )
);

/**
 * @route PUT /payment-providers/:code
 * @description Update a payment provider by its code
 * @access Public
 */
router.put(
  '/:code',
  authenticate('access'),
  validate(updatePaymentProviderSchema),
  asyncHandler(
    PaymentProviderController.updatePaymentProviderByCode.bind(
      PaymentProviderController
    )
  )
);

/**
 * @route DELETE /payment-providers/:code
 * @description Delete a payment provider by its code
 * @access Public
 */
router.delete(
  '/:code',
  authenticate('access'),
  asyncHandler(
    PaymentProviderController.deletePaymentProviderByCode.bind(
      PaymentProviderController
    )
  )
);

export default router;

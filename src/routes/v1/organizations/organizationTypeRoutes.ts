import { Router } from 'express';
import OrganizationTypeController from '../../../controllers/organizations/organizationTypeController';
import authenticate from '../../../middlewares/auth/authenticate';
import asyncHandler from '../../../middlewares/common/asyncHandler';
import validate from '../../../middlewares/common/validate';
import {
  createOrganizationTypeSchema,
  deleteOrganizationTypeSchema,
  getOrganizationTypeByIdSchema,
  getOrganizationTypeByNameSchema,
  updateOrganizationTypeSchema,
} from '../../../validations/organizations/organizationTypeValidation';

const router = Router();

/**
 * @route POST /organizations
 * @description Create a new organization type
 * @access Private
 */
router.post(
  '',
  // authenticate('access'),
  // validate(createOrganizationTypeSchema),
  asyncHandler(
    OrganizationTypeController.createOrganizationType.bind(
      OrganizationTypeController
    )
  )
);

/**
 * @route PUT /organizations/:id
 * @description Update an existing organization type by ID
 * @access Private
 */
router.put(
  '/:id',
  // authenticate('access'),
  // validate(updateOrganizationTypeSchema),
  asyncHandler(
    OrganizationTypeController.updateOrganizationType.bind(
      OrganizationTypeController
    )
  )
);

/**
 * @route GET /organizations
 * @description Retrieve all organization types with optional pagination
 * @access Public
 */
router.get(
  '',
  asyncHandler(
    OrganizationTypeController.getAll.bind(OrganizationTypeController)
  )
);

/**
 * @route GET /organizations/:id
 * @description Retrieve an organization type by ID
 * @access Public
 */
router.get(
  '/:id',
  validate(getOrganizationTypeByIdSchema),
  asyncHandler(
    OrganizationTypeController.getOrganizationTypeById.bind(
      OrganizationTypeController
    )
  )
);

/**
 * @route GET /organizations/name
 * @description Retrieve an organization type by name
 * @access Public
 */
router.get(
  '/name',
  validate(getOrganizationTypeByNameSchema),
  asyncHandler(
    OrganizationTypeController.getOrganizationTypeByName.bind(
      OrganizationTypeController
    )
  )
);

/**
 * @route GET /organizations/active
 * @description Retrieve all active organization types
 * @access Public
 */
router.get(
  '/status/active',
  asyncHandler(
    OrganizationTypeController.getActiveOrganizationTypes.bind(
      OrganizationTypeController
    )
  )
);

/**
 * @route DELETE /organizations/:id
 * @description Delete an organization type by ID
 * @access Private
 */
router.delete(
  '/:id',
  authenticate('access'),
  validate(deleteOrganizationTypeSchema),
  asyncHandler(
    OrganizationTypeController.deleteOrganizationType.bind(
      OrganizationTypeController
    )
  )
);

export default router;

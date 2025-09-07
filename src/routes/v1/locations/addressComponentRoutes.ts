import { Router } from 'express';
import AddressComponentController from '../../../controllers/locations/addressComponentContoller';
import authenticate from '../../../middlewares/auth/authenticate';
import authorize from '../../../middlewares/auth/authorize';
import asyncHandler from '../../../middlewares/common/asyncHandler';
import validate from '../../../middlewares/common/validate';

import {
  createAddressComponentSchema,
  updateAddressComponentSchema,
  getAddressComponentByIdSchema,
  getByTypeAndValueSchema,
  listByTypesSchema,
  getForLocationSchema,
  searchPaginatedSchema,
  deleteAddressComponentSchema,
  bulkDeleteAddressComponentsSchema,
  moveAddressComponentSchema,
  getChildrenSchema,
  getAncestorsSchema,
  getDescendantsSchema,
  upsertByTypeValueParentSchema,
  bulkUpsertAddressComponentsSchema,
} from '../../../validations/locations/addressComponentValidation';

const router = Router();

/**
 * @route POST /address-components
 * @description Create a new address component
 * @access Public
 */
router.post(
  '/',
  validate(createAddressComponentSchema),
  authenticate('access'),
  // authorize('address_components', 'create'),
  asyncHandler(AddressComponentController.createAddressComponent.bind(AddressComponentController))
);

/**
 * @route GET /address-components/by/type-value
 * @description Retrieve a component by type and value
 * @access Public
 */
router.get(
  '/by/type-value',
  validate(getByTypeAndValueSchema),
  // authenticate('access'),
  // authorize('address_components', 'view'),
  asyncHandler(AddressComponentController.getByTypeAndValue.bind(AddressComponentController))
);

/**
 * @route GET /address-components/types
 * @description List components filtered by multiple types
 * @access Public
 */
router.get(
  '/types',
  validate(listByTypesSchema),
  // authenticate('access'),
  // authorize('address_components', 'view'),
  asyncHandler(AddressComponentController.listByTypes.bind(AddressComponentController))
);

/**
 * @route GET /address-components/location/:locationId
 * @description Get components linked to a location
 * @access Public
 */
router.get(
  '/location/:locationId',
  validate(getForLocationSchema),
  // authenticate('access'),
  // authorize('address_components', 'view'),
  asyncHandler(AddressComponentController.getForLocation.bind(AddressComponentController))
);

/**
 * @route GET /address-components
 * @description Search & paginate
 * @access Public
 */
router.get(
  '/',
  validate(searchPaginatedSchema),
  // authenticate('access'),
  // authorize('address_components', 'view'),
  asyncHandler(AddressComponentController.searchPaginated.bind(AddressComponentController))
);

/**
 * @route GET /address-components/:id
 * @description Retrieve a component by ID
 * @access Public
 */
router.get(
  '/:id',
  validate(getAddressComponentByIdSchema),
  // authenticate('access'),
  // authorize('address_components', 'view'),
  asyncHandler(AddressComponentController.getAddressComponentById.bind(AddressComponentController))
);

/**
 * @route PUT /address-components/:id
 * @description Update an address component by ID
 * @access Public
 */
router.put(
  '/:id',
  validate(updateAddressComponentSchema),
  authenticate('access'),
  // authorize('address_components', 'update'),
  asyncHandler(AddressComponentController.updateAddressComponent.bind(AddressComponentController))
);

/**
 * @route DELETE /address-components/:id
 * @description Delete a component by ID
 * @access Public
 */
router.delete(
  '/:id',
  validate(deleteAddressComponentSchema),
  authenticate('access'),
  // authorize('address_components', 'delete'),
  asyncHandler(AddressComponentController.deleteAddressComponent.bind(AddressComponentController))
);

/**
 * @route POST /address-components/bulk/delete
 * @description Bulk delete components
 * @access Public
 */
router.post(
  '/bulk/delete',
  validate(bulkDeleteAddressComponentsSchema),
  authenticate('access'),
  // authorize('address_components', 'delete'),
  asyncHandler(AddressComponentController.bulkDelete.bind(AddressComponentController))
);

/**
 * @route POST /address-components/:id/move
 * @description Change a component's parent
 * @access Public
 */
router.post(
  '/:id/move',
  validate(moveAddressComponentSchema),
  authenticate('access'),
  // authorize('address_components', 'update'),
  asyncHandler(AddressComponentController.move.bind(AddressComponentController))
);

/**
 * @route GET /address-components/:id/children
 * @description Get direct children of a component
 * @access Public
 */
router.get(
  '/:id/children',
  validate(getChildrenSchema),
  // authenticate('access'),
  // authorize('address_components', 'view'),
  asyncHandler(AddressComponentController.getChildren.bind(AddressComponentController))
);

/**
 * @route GET /address-components/:id/ancestors
 * @description Get ancestors of a component
 * @access Public
 */
router.get(
  '/:id/ancestors',
  validate(getAncestorsSchema),
  // authenticate('access'),
  // authorize('address_components', 'view'),
  asyncHandler(AddressComponentController.getAncestors.bind(AddressComponentController))
);

/**
 * @route GET /address-components/:id/descendants
 * @description Get descendants of a component
 * @access Public
 */
router.get(
  '/:id/descendants',
  validate(getDescendantsSchema),
  // authenticate('access'),
  // authorize('address_components', 'view'),
  asyncHandler(AddressComponentController.getDescendants.bind(AddressComponentController))
);

/**
 * @route PUT /address-components/upsert
 * @description Upsert a component by (type, value, parentId)
 * @access Public
 */
router.put(
  '/upsert',
  validate(upsertByTypeValueParentSchema),
  authenticate('access'),
  // authorize('address_components', 'upsert'),
  asyncHandler(AddressComponentController.upsertByTypeValueParent.bind(AddressComponentController))
);

/**
 * @route POST /address-components/bulk/upsert
 * @description Bulk upsert components
 * @access Public
 */
router.post(
  '/bulk/upsert',
  validate(bulkUpsertAddressComponentsSchema),
  authenticate('access'),
  // authorize('address_components', 'upsert'),
  asyncHandler(AddressComponentController.bulkUpsert.bind(AddressComponentController))
);

export default router;

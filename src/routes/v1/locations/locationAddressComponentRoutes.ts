import { Router } from 'express';
import LocationAddressComponentController from '../../../controllers/locations/locationAddressComponentController';
import authenticate from '../../../middlewares/auth/authenticate';
import authorize from '../../../middlewares/auth/authorize';
import asyncHandler from '../../../middlewares/common/asyncHandler';
import validate from '../../../middlewares/common/validate';

import {
  createLinkSchema,
  updateLinkSchema,
  deleteLinkSchema,
  bulkDeleteLinksSchema,
  getLinkByIdSchema,
  listByLocationSchema,
  listByAddressComponentSchema,
  getPrimaryForLocationSchema,
  reorderSequencesSchema,
  upsertLinkSchema,
  bulkUpsertLinksSchema,
  clearCenterPointSchema,
  findComponentsNearPointSchema,
} from '../../../validations/locations/locationAddressComponentValidation';

const router = Router();

/**
 * @route POST /location-address-components
 * @description Create a new location-address component link
 * @access Public
 */
router.post(
  '/',
  validate(createLinkSchema),
  authenticate('access'),
  // authorize('location_address_components', 'create'),
  asyncHandler(LocationAddressComponentController.createLink.bind(LocationAddressComponentController))
);

/**
 * @route GET /location-address-components
 * @description (Optional) You can add a list-all if needed
 * @access Public
 */
// router.get(
//   '/',
//   // authenticate('access'),
//   // authorize('location_address_components', 'view'),
//   asyncHandler(LocationAddressComponentController.getAll.bind(LocationAddressComponentController))
// );

/**
 * @route GET /location-address-components/:id
 * @description Retrieve a single link by ID
 * @access Public
 */
router.get(
  '/:id',
  validate(getLinkByIdSchema),
  // authenticate('access'),
  // authorize('location_address_components', 'view'),
  asyncHandler(LocationAddressComponentController.getLinkById.bind(LocationAddressComponentController))
);

/**
 * @route PUT /location-address-components/:id
 * @description Update an existing link
 * @access Public
 */
router.put(
  '/:id',
  validate(updateLinkSchema),
  authenticate('access'),
  // authorize('location_address_components', 'update'),
  asyncHandler(LocationAddressComponentController.updateLink.bind(LocationAddressComponentController))
);

/**
 * @route DELETE /location-address-components/:id
 * @description Delete a link
 * @access Public
 */
router.delete(
  '/:id',
  validate(deleteLinkSchema),
  authenticate('access'),
  // authorize('location_address_components', 'delete'),
  asyncHandler(LocationAddressComponentController.deleteLink.bind(LocationAddressComponentController))
);

/**
 * @route DELETE /location-address-components/bulk
 * @description Bulk delete links (body: { ids: string[] })
 * @access Public
 */
router.delete(
  '/bulk',
  validate(bulkDeleteLinksSchema),
  authenticate('access'),
  // authorize('location_address_components', 'delete'),
  asyncHandler(LocationAddressComponentController.bulkDeleteLinks.bind(LocationAddressComponentController))
);

/**
 * @route PUT /location-address-components/upsert
 * @description Upsert a single link
 * @access Public
 */
router.put(
  '/upsert',
  validate(upsertLinkSchema),
  authenticate('access'),
  // authorize('location_address_components', 'upsert'),
  asyncHandler(LocationAddressComponentController.upsertLink.bind(LocationAddressComponentController))
);

/**
 * @route PUT /location-address-components/bulk-upsert
 * @description Bulk upsert links
 * @access Public
 */
router.put(
  '/bulk-upsert',
  validate(bulkUpsertLinksSchema),
  authenticate('access'),
  // authorize('location_address_components', 'upsert'),
  asyncHandler(LocationAddressComponentController.bulkUpsertLinks.bind(LocationAddressComponentController))
);

/**
 * @route POST /location-address-components/:id/clear-center-point
 * @description Clear geometry (center point) for a link
 * @access Public
 */
router.post(
  '/:id/clear-center-point',
  validate(clearCenterPointSchema),
  authenticate('access'),
  // authorize('location_address_components', 'update'),
  asyncHandler(LocationAddressComponentController.clearCenterPoint.bind(LocationAddressComponentController))
);

/**
 * @route GET /location-address-components/near
 * @description Spatial search (query: lat,lng,distanceMeters,limit?)
 * @access Public
 */
router.get(
  '/near',
  validate(findComponentsNearPointSchema), // <-- this is { query: Joi.object(...) }
  // authenticate('access'),
  // authorize('location_address_components', 'view'),
  asyncHandler(LocationAddressComponentController.findComponentsNearPoint.bind(LocationAddressComponentController))
);

/**
 * @route GET /location-address-components/locations/:locationId
 * @description List links for a location
 * @access Public
 */
router.get(
  '/locations/:locationId',
  validate(listByLocationSchema),
  // authenticate('access'),
  // authorize('location_address_components', 'view'),
  asyncHandler(LocationAddressComponentController.listByLocation.bind(LocationAddressComponentController))
);

/**
 * @route GET /location-address-components/address-components/:addressComponentId
 * @description List links for an address component
 * @access Public
 */
router.get(
  '/address-components/:addressComponentId',
  validate(listByAddressComponentSchema),
  // authenticate('access'),
  // authorize('location_address_components', 'view'),
  asyncHandler(LocationAddressComponentController.listByAddressComponent.bind(LocationAddressComponentController))
);

/**
 * @route GET /location-address-components/locations/:locationId/primary
 * @description Get primary link for a location
 * @access Public
 */
router.get(
  '/locations/:locationId/primary',
  validate(getPrimaryForLocationSchema),
  // authenticate('access'),
  // authorize('location_address_components', 'view'),
  asyncHandler(LocationAddressComponentController.getPrimaryForLocation.bind(LocationAddressComponentController))
);

/**
 * @route POST /location-address-components/locations/:locationId/reorder
 * @description Reorder sequences for a location (body: { orderedLinkIds: string[] })
 * @access Public
 */
router.post(
  '/locations/:locationId/reorder',
  validate(reorderSequencesSchema),
  authenticate('access'),
  // authorize('location_address_components', 'update'),
  asyncHandler(LocationAddressComponentController.reorderSequences.bind(LocationAddressComponentController))
);

export default router;

import { Router } from 'express';
import LocationController from '../../../controllers/locations/locationController';
import authenticate from '../../../middlewares/auth/authenticate';
import authorize from '../../../middlewares/auth/authorize';
import asyncHandler from '../../../middlewares/common/asyncHandler';
import validate from '../../../middlewares/common/validate';
import {
  createLocationSchema,
  updateLocationSchema,
  moveLocationSchema,
} from '../../../validations/locations/locationValidation';

const router = Router();

/**
 * @route POST /locations
 * @description Create a new location
 * @access Public
 */
router.post(
  '/',
  validate(createLocationSchema),
  authenticate('access'),
  // authorize('locations', 'create'),
  asyncHandler(LocationController.createLocation.bind(LocationController))
);

/**
 * @route GET /locations
 * @description Retrieve all locations (with optional filters/pagination)
 * @access Public
 */
router.get(
  '/',
  // authenticate('access'),
  // authorize('locations', 'view'),
  asyncHandler(LocationController.getAll.bind(LocationController))
);

/**
 * @route GET /locations/:locationId
 * @description Retrieve a single location by ID
 * @access Public
 */
router.get(
  '/:locationId',
  // authenticate('access'),
  // authorize('locations', 'view'),
  asyncHandler(LocationController.getById.bind(LocationController))
);

/**
 * @route PUT /locations/:locationId
 * @description Update an existing location
 * @access Public
 */
router.put(
  '/:locationId',
  validate(updateLocationSchema),
  authenticate('access'),
  // authorize('locations', 'update'),
  asyncHandler(LocationController.updateLocation.bind(LocationController))
);

/**
 * @route DELETE /locations/:locationId
 * @description Delete a location
 * @access Public
 */
router.delete(
  '/:locationId',
  authenticate('access'),
  // authorize('locations', 'delete'),
  asyncHandler(LocationController.deleteLocation.bind(LocationController))
);

/**
 * @route POST /locations/:locationId/move
 * @description Move a location to a new parent
 * @access Public
 */
router.post(
  '/:locationId/move',
  validate(moveLocationSchema),
  authenticate('access'),
  // authorize('locations', 'update'),
  asyncHandler(LocationController.moveLocation.bind(LocationController))
);

/**
 * @route GET /locations/:locationId/children
 * @description Get direct children of a location
 * @access Public
 */
router.get(
  '/:locationId/children',
  // authenticate('access'),
  // authorize('locations', 'view'),
  asyncHandler(LocationController.getDescendants.bind(LocationController))
);

/**
 * @route GET /locations/:locationId/ancestors
 * @description Get all ancestors of a location
 * @access Public
 */
router.get(
  '/:locationId/ancestors',
  // authenticate('access'),
  // authorize('locations', 'view'),
  asyncHandler(LocationController.getAncestors.bind(LocationController))
);

/**
 * @route GET /locations/:locationId/descendants
 * @description Get all descendants of a location
 * @access Public
 */
router.get(
  '/:locationId/descendants',
  // authenticate('access'),
  // authorize('locations', 'view'),
  asyncHandler(LocationController.getDescendants.bind(LocationController))
);

export default router;

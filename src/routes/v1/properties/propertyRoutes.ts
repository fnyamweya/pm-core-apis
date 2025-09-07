import { Router } from 'express';
import PropertyController from '../../../controllers/properties/propertyController';
import PropertyAddressController from '../../../controllers/properties/propertyAddressController';
import PropertyUnitController from '../../../controllers/properties/propertyUnitController';
import PropertyUnitTenantController from '../../../controllers/properties/propertyUnitTenantController';
import PropertyOwnerController from '../../../controllers/properties/propertyOwnerController';
import PropertyStaffController from '../../../controllers/properties/propertyStaffController';
import PropertyRequestController from '../../../controllers/properties/propertyRequestController';
import PropertyLeaseAgreementController from '../../../controllers/properties/propertyLeaseAgreementController';
import PropertyLeasePaymentController from '../../../controllers/properties/propertyLeasePaymentController';

import authenticate from '../../../middlewares/auth/authenticate';
import orgScope from '../../../middlewares/auth/orgScope';
import authorize from '../../../middlewares/auth/authorize';
import asyncHandler from '../../../middlewares/common/asyncHandler';
import { requireOrgRoleFromBody, requireOrgRoleForProperty } from '../../../middlewares/auth/requireOrgRole';
import { OrganizationUserRole } from '../../../entities/organizations/organizationUserEntity';
import validate from '../../../middlewares/common/validate';

// import {
//   createPropertySchema,
//   updatePropertySchema,
//   getPropertyByCodeSchema,
//   findByConfigSchema,
// } from '../../validations/properties/propertyValidation';

// import {
//   createAddressSchema,
//   updateAddressSchema,
// } from '../../validations/properties/propertyAddressValidation';

import {
  createUnitSchema,
  updateUnitSchema,
  listUnitsSchema,
  searchUnitsSchema,
} from '../../../validations/properties/propertyUnitValidation';

import {
  createTenantSchema,
  updateTenantSchema,
  getTenantsByStatusSchema,
  createTenantWithUserSchema,
} from '../../../validations/properties/propertyUnitTenantValidation';

// import {
//   createOwnerSchema,
//   updateOwnerSchema,
//   getLandlordsByRoleSchema,
// } from '../../validations/properties/propertyOwnerValidation';

// import {
//   createStaffSchema,
//   updateStaffSchema,
// } from '../../validations/properties/propertyStaffValidation';

import {
  createRequestSchema,
  updateRequestSchema,
  getRequestsByStatusSchema,
  getRecentRequestsSchema,
} from '../../../validations/properties/propertyRequestValidation';

import {
  createLeaseAgreementSchema,
  updateLeaseAgreementSchema,
  extendLeaseAgreementSchema,
  terminateLeaseAgreementSchema,
} from '../../../validations/properties/propertyLeaseAgreementValidation';

import {
  createPaymentSchema,
  updatePaymentSchema,
  getPaymentsInDateRangeSchema,
} from '../../../validations/properties/propertyLeasePaymentValidation';

const router = Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     EsignatureParty:
 *       type: object
 *       properties:
 *         role: { type: string }
 *         userId: { type: string }
 *         name: { type: string }
 *         email: { type: string, format: email }
 *         status: { type: string, enum: [pending, signed, rejected, canceled] }
 *         signedAt: { type: string, format: date-time, nullable: true }
 *         signatureUrl: { type: string, format: uri, nullable: true }
 *         provider: { type: string, nullable: true }
 *         providerSignatureId: { type: string, nullable: true }
 *     Lease:
 *       type: object
 *       description: Lease agreement with computed nextDueDate
 *       properties:
 *         id: { type: string }
 *         unit:
 *           type: object
 *           properties:
 *             id: { type: string }
 *         tenant:
 *           type: object
 *           properties:
 *             id: { type: string }
 *         landlord:
 *           type: object
 *           properties:
 *             id: { type: string }
 *         startDate: { type: string, format: date }
 *         endDate: { type: string, format: date }
 *         amount: { type: number }
 *         leaseType: { type: string, enum: [fixed_term, periodic] }
 *         chargeType: { type: string, enum: [rent, other] }
 *         paymentFrequency: { type: string, enum: [weekly, biweekly, monthly, quarterly, yearly] }
 *         firstPaymentDate: { type: string, format: date, nullable: true }
 *         status: { type: string, enum: [active, pending, terminated, expired, suspended] }
 *         nextDueDate: { type: string, format: date, nullable: true }
 *         signedDocumentUrl: { type: string, format: uri, nullable: true }
 *         contractHash: { type: string, nullable: true }
 *         terms: { type: object, nullable: true }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 *     LeaseCreateRequest:
 *       type: object
 *       required: [tenantId, organizationId, startDate, endDate, amount]
 *       properties:
 *         tenantId: { type: string, description: "PropertyUnitTenantEntity ID" }
 *         organizationId: { type: string, description: "Organization ID owning the property" }
 *         startDate: { type: string, format: date }
 *         endDate: { type: string, format: date }
 *         amount: { type: number }
 *         leaseType: { type: string, enum: [fixed_term, periodic] }
 *         chargeType: { type: string, enum: [rent, other] }
 *         paymentFrequency: { type: string, enum: [weekly, biweekly, monthly, quarterly, yearly] }
 *         firstPaymentDate: { type: string, format: date, nullable: true }
 *         esignatures:
 *           type: array
 *           items: { $ref: '#/components/schemas/EsignatureParty' }
 *         signedDocumentUrl: { type: string, format: uri }
 *         contractHash: { type: string }
 *         terms: { type: object }
 *         metadata: { type: object, description: "Arbitrary metadata for the lease" }
 *     LeaseExtendRequest:
 *       type: object
 *       required: [newEndDate]
 *       properties:
 *         newEndDate: { type: string, format: date }
 *         amount: { type: number, description: Optional new amount }
 *     LeaseTerminateRequest:
 *       type: object
 *       required: [terminationDate]
 *       properties:
 *         terminationDate: { type: string, format: date }
 *         reason: { type: string }
 */

/** -------------------- Property Routes -------------------- */

/**
 * @route POST /properties
 * @desc   Create a new property
 * @access Protected
 */
router.post(
  '/',
  // validate(createPropertySchema),
  authenticate('access'),
  requireOrgRoleFromBody('organizationId', [OrganizationUserRole.OWNER, OrganizationUserRole.CARETAKER]),
  asyncHandler(PropertyController.createProperty.bind(PropertyController))
);

/**
 * @route PUT /properties/:id
 * @desc   Update an existing property
 * @access Protected
 */
router.put(
  '/:id',
  authenticate('access'),
  requireOrgRoleForProperty('id', [OrganizationUserRole.OWNER, OrganizationUserRole.CARETAKER]),
  asyncHandler(PropertyController.updateProperty.bind(PropertyController))
);

/**
 * @route GET /properties
 * @desc   Get paginated properties
 * @access Protected
 */
router.get('/', orgScope, asyncHandler(PropertyController.listScoped.bind(PropertyController)));

/**
 * @route GET /properties/tenants/my-orgs
 * @desc   List all unit tenants for the selected organization or the caller's organizations
 * @access Protected
 */
router.get(
  '/tenants/my-orgs',
  authenticate('access'),
  orgScope,
  asyncHandler(
    PropertyUnitTenantController.listTenantsForUserOrganizations.bind(
      PropertyUnitTenantController
    )
  )
);

/**
 * @route GET /properties/requests/my-orgs
 * @desc   List all maintenance requests for the selected organization or the caller's organizations
 * @access Protected
 */
router.get(
  '/requests/my-orgs',
  authenticate('access'),
  orgScope,
  asyncHandler(
    PropertyRequestController.listRequestsForUserOrganizations.bind(
      PropertyRequestController
    )
  )
);

/**
 * @route GET /properties/my-orgs
 * @desc   List properties for the caller's organizations (optionally filter with ?orgIds=a,b)
 * @access Protected
 */
/**
 * @openapi
 * /properties/my-orgs:
 *   get:
 *     summary: List properties for the caller's organizations
 *     description: >-
 *       Returns properties owned directly by any of the organizations the caller belongs to,
 *       or by organizations that co-own properties via the property_owners relation. When the
 *       optional `orgIds` query is provided, it must be a subset of the user's organization IDs.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: orgIds
 *         required: false
 *         schema:
 *           type: string
 *         description: Comma-separated organization IDs to filter by
 *     responses:
 *       200:
 *         description: Properties list
 *       403:
 *         description: The requested organizations are not within the user's scope
 */
router.get(
  '/my-orgs',
  authenticate('access'),
  asyncHandler(PropertyController.getPropertiesForUserOrganizations.bind(PropertyController))
);

/**
 * @route GET /properties/:id
 * @desc   Get property by ID
 * @access Protected
 */
router.get(
  '/:id',
  // authenticate('access'),
  asyncHandler(PropertyController.getPropertyById.bind(PropertyController))
);

/**
 * @route GET /properties/code/:code
 * @desc   Get property by code
 * @access Protected
 */
router.get(
  '/code/:code',
  // authenticate('access'),
  // validate(getPropertyByCodeSchema),
  asyncHandler(PropertyController.getPropertyByCode.bind(PropertyController))
);

/**
 * @route GET /properties/organization/:organizationId
 * @desc   Get all properties for an organization
 * @access Protected
 */
router.get(
  '/organization/:organizationId',
  // authenticate('access'),
  asyncHandler(PropertyController.getPropertiesByOrganization.bind(PropertyController))
);

/**
 * @route GET /properties/owner/:ownerId
 * @desc   Get all properties for an owner
 * @access Protected
 */
router.get(
  '/owner/:ownerId',
  // authenticate('access'),
  asyncHandler(PropertyController.getPropertiesByOwner.bind(PropertyController))
);

/**
 * @route GET /properties/listed
 * @desc   Get all listed properties
 * @access Protected
 */
router.get(
  '/listed',
  // authenticate('access'),
  asyncHandler(PropertyController.getListedProperties.bind(PropertyController))
);

/**
 * @route GET /properties/config
 * @desc   Find properties by config key/value
 * @access Protected
 */
router.get(
  '/config',
  // authenticate('access'),
  // validate(findByConfigSchema),
  asyncHandler(PropertyController.findByConfigKeyValue.bind(PropertyController))
);

/** -------------------- Address Routes -------------------- */

/**
 * @route POST /properties/:propertyId/addresses
 * @desc   Create an address for a property
 * @access Protected
 * @openapi
 * /properties/{propertyId}/addresses:
 *   post:
 *     tags: [Properties]
 *     summary: Create address for a property
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tenantId: { type: string }
 *               landlordId: { type: string }
 *               startDate: { type: string, format: date }
 *               endDate: { type: string, format: date }
 *               amount: { type: number }
 *               leaseType: { type: string, enum: [fixed_term, periodic] }
 *               chargeType: { type: string, enum: [rent, other] }
 *               paymentFrequency: { type: string, enum: [weekly, biweekly, monthly, quarterly, yearly] }
 *               firstPaymentDate: { type: string, format: date }
 *     responses:
 *       201:
 *         description: Created
 */
router.post(
  '/:propertyId/addresses',
  // authenticate('access'),
  // authorize('properties', 'update'),
  // validate(createAddressSchema),
  asyncHandler(PropertyAddressController.createAddress.bind(PropertyAddressController))
);

/**
 * @route PUT /properties/:propertyId/addresses/:id
 * @desc   Update an address
 * @access Protected
 * @openapi
 * /properties/{propertyId}/addresses/{id}:
 *   put:
 *     tags: [Properties]
 *     summary: Update property address
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Updated
 */
router.put(
  '/:propertyId/addresses/:id',
  // authenticate('access'),
  // authorize('properties', 'update'),
  // validate(updateAddressSchema),
  asyncHandler(PropertyAddressController.updateAddress.bind(PropertyAddressController))
);

/**
 * @route GET /properties/:propertyId/addresses
 * @desc   List all addresses for a property
 * @access Protected
 * @openapi
 * /properties/{propertyId}/addresses:
 *   get:
 *     tags: [Properties]
 *     summary: List addresses for a property
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 */
router.get(
  '/:propertyId/addresses',
  // authenticate('access'),
  asyncHandler(PropertyAddressController.getAddressesByProperty.bind(PropertyAddressController))
);

/**
 * @route GET /properties/:propertyId/addresses/:id
 * @desc   Get an address by ID
 * @access Protected
 * @openapi
 * /properties/{propertyId}/addresses/{id}:
 *   get:
 *     tags: [Properties]
 *     summary: Get address by id
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 */
router.get(
  '/:propertyId/addresses/:id',
  // authenticate('access'),
  asyncHandler(PropertyAddressController.getAddressById.bind(PropertyAddressController))
);

/**
 * @route DELETE /properties/:propertyId/addresses/:id
 * @desc   Delete an address
 * @access Protected
 * @openapi
 * /properties/{propertyId}/addresses/{id}:
 *   delete:
 *     tags: [Properties]
 *     summary: Delete address
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Deleted
 */
router.delete(
  '/:propertyId/addresses/:id',
  authenticate('access'),
  requireOrgRoleForProperty('propertyId', [OrganizationUserRole.OWNER, OrganizationUserRole.CARETAKER]),
  asyncHandler(PropertyAddressController.deleteAddress.bind(PropertyAddressController))
);

/** -------------------- Unit Routes -------------------- */

/**
 * @route POST /properties/:propertyId/units
 * @desc   Create a unit under a property
 * @access Protected
 * @openapi
 * /properties/{propertyId}/units:
 *   post:
 *     tags: [Properties]
 *     summary: Create a unit under a property
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [unitNumber]
 *             properties:
 *               unitNumber: { type: string }
 *               name: { type: string }
 *               floor: { type: string }
 *               area: { type: number }
 *               description: { type: string }
 *               isListed: { type: boolean }
 *               status: { type: string, enum: [vacant, occupied, reserved, maintenance, unavailable] }
 *               amenities: { type: array, items: { type: string } }
 *               metadata:
 *                 type: object
 *                 properties:
 *                   bedrooms: { type: integer, minimum: 0 }
 *                   bathrooms: { type: integer, minimum: 0 }
 *                   features: { type: array, items: { type: string } }
 *                   floorPlan: { type: string }
 *                   furnishing: { type: string, enum: [unfurnished, semi-furnished, furnished] }
 *                   utilities:
 *                     type: object
 *                     properties:
 *                       waterIncluded: { type: boolean }
 *                       electricityIncluded: { type: boolean }
 *                       internetIncluded: { type: boolean }
 *                   sizeUnit: { type: string, enum: [sqm, sqft] }
 *                   parkingSpaces: { type: integer, minimum: 0 }
 *                   rent: { type: number }
 *                   deposit: { type: number }
 *                   view: { type: string }
 *                   orientation: { type: string }
 *                   appliances: { type: array, items: { type: string } }
 *                   images: { type: array, items: { type: string, format: uri } }
 *                   notes: { type: string }
 *     responses:
 *       201:
 *         description: Created
 */
router.post(
  '/:propertyId/units',
  authenticate('access'),
  requireOrgRoleForProperty('propertyId', [OrganizationUserRole.OWNER, OrganizationUserRole.CARETAKER]),
  validate(createUnitSchema),
  asyncHandler(PropertyUnitController.createUnit.bind(PropertyUnitController))
);

/**
 * @route PUT /properties/:propertyId/units/:id
 * @desc   Update a unit
 * @access Protected
 * @openapi
 * /properties/{propertyId}/units/{id}:
 *   put:
 *     tags: [Properties]
 *     summary: Update a unit
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               unitNumber: { type: string }
 *               name: { type: string }
 *               floor: { type: string }
 *               area: { type: number }
 *               description: { type: string }
 *               isListed: { type: boolean }
 *               status: { type: string, enum: [vacant, occupied, reserved, maintenance, unavailable] }
 *               amenities: { type: array, items: { type: string } }
 *               tenantId: { type: string, nullable: true }
 *               metadata:
 *                 type: object
 *                 description: Additional ad-hoc fields; extra keys accepted
 *                 properties:
 *                   bedrooms: { type: integer, minimum: 0 }
 *                   bathrooms: { type: integer, minimum: 0 }
 *                   features: { type: array, items: { type: string } }
 *                   floorPlan: { type: string }
 *                   furnishing: { type: string, enum: [unfurnished, semi-furnished, furnished] }
 *                   utilities:
 *                     type: object
 *                     properties:
 *                       waterIncluded: { type: boolean }
 *                       electricityIncluded: { type: boolean }
 *                       internetIncluded: { type: boolean }
 *                   sizeUnit: { type: string, enum: [sqm, sqft] }
 *                   parkingSpaces: { type: integer, minimum: 0 }
 *                   rent: { type: number }
 *                   deposit: { type: number }
 *                   view: { type: string }
 *                   orientation: { type: string }
 *                   appliances: { type: array, items: { type: string } }
 *                   images: { type: array, items: { type: string, format: uri } }
 *                   notes: { type: string }
 *     responses:
 *       200:
 *         description: Updated
 */
router.put(
  '/:propertyId/units/:id',
  authenticate('access'),
  requireOrgRoleForProperty('propertyId', [OrganizationUserRole.OWNER, OrganizationUserRole.CARETAKER]),
  validate(updateUnitSchema),
  asyncHandler(PropertyUnitController.updateUnit.bind(PropertyUnitController))
);

/**
 * @route GET /properties/:propertyId/units
 * @desc   List all units for a property
 * @access Protected
 * @openapi
 * /properties/{propertyId}/units:
 *   get:
 *     tags: [Properties]
 *     summary: List units for a property
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 */
router.get(
  '/:propertyId/units',
  // authenticate('access'),
  validate(listUnitsSchema),
  asyncHandler(PropertyUnitController.getUnitsByProperty.bind(PropertyUnitController))
);

/**
 * @route GET /properties/:propertyId/units/available
 * @desc   List all available units
 * @access Protected
 */
router.get(
  '/:propertyId/units/available',
  // authenticate('access'),
  asyncHandler(PropertyUnitController.getAvailableUnits.bind(PropertyUnitController))
);

/**
 * @route GET /properties/:propertyId/units/number/:unitNumber
 * @desc   Get a unit by its number
 * @access Protected
 */
router.get(
  '/:propertyId/units/number/:unitNumber',
  // authenticate('access'),
  asyncHandler(PropertyUnitController.getUnitByNumber.bind(PropertyUnitController))
);

/**
 * @route GET /properties/:propertyId/units/occupied
 * @desc   List all occupied units
 * @access Protected
 */
router.get(
  '/:propertyId/units/occupied',
  // authenticate('access'),
  asyncHandler(PropertyUnitController.getOccupiedUnits.bind(PropertyUnitController))
);

/**
 * @route GET /properties/:propertyId/units/search
 * @desc   Search units by query
 * @access Protected
 * @openapi
 * /properties/{propertyId}/units/search:
 *   get:
 *     tags: [Properties]
 *     summary: Search units
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 */
router.get(
  '/:propertyId/units/search',
  // authenticate('access'),
  validate(searchUnitsSchema),
  asyncHandler(PropertyUnitController.searchUnits.bind(PropertyUnitController))
);

/** -------------------- Tenant Routes -------------------- */

/**
 * @route POST /properties/:propertyId/units/:unitId/tenants
 * @desc   Assign a tenant to a unit
 * @access Protected
 * @openapi
 * /properties/{propertyId}/units/{unitId}/tenants:
 *   post:
 *     tags: [Properties]
 *     summary: Assign a tenant to a unit
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: unitId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LeaseCreateRequest'
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Lease'
 *                 message: { type: string }
 */
router.post(
  '/:propertyId/units/:unitId/tenants',
  authenticate('access'),
  requireOrgRoleForProperty('propertyId', [OrganizationUserRole.OWNER, OrganizationUserRole.CARETAKER]),
  validate(createTenantSchema),
  asyncHandler(PropertyUnitTenantController.createUnitTenant.bind(PropertyUnitTenantController))
);

/**
 * @openapi
 * components:
 *   schemas:
 *     UnitTenancy:
 *       type: object
 *       properties:
 *         id: { type: string }
 *         property:
 *           type: object
 *           properties:
 *             id: { type: string }
 *         unit:
 *           type: object
 *           properties:
 *             id: { type: string }
 *         user:
 *           type: object
 *           properties:
 *             id: { type: string }
 *             firstName: { type: string }
 *             lastName: { type: string, nullable: true }
 *             email: { type: string, format: email }
 *             phone: { type: string, nullable: true }
 *         status: { type: string, enum: [active, pending, past, evicted, rejected] }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 *     TenantWithUserCreateRequest:
 *       type: object
 *       description: Create or find a user, assign as tenant, and issue a 4‑digit PIN expiring in 30 minutes.
 *       required: [user]
 *       properties:
 *         user:
 *           type: object
 *           required: [firstName, phone]
 *           properties:
 *             firstName: { type: string }
 *             lastName: { type: string }
 *             email: { type: string, format: email, nullable: true, description: 'Optional; autogenerated if missing' }
 *             phone: { type: string, description: 'Primary identifier used to find the user' }
 *         password: { type: string, description: 'Ignored; a temporary 4‑digit PIN is generated instead' }
 *         credentialExpiry: { type: string, format: date-time, description: 'Optional PIN expiry override' }
 */
/**
 * @openapi
 * /properties/{propertyId}/units/{unitId}/tenants/with-user:
 *   post:
 *     tags: [Properties]
 *     summary: Create a tenant with a new/existing user and send a PIN via SMS
 *     description: >-
 *       Creates or finds the user by email, assigns them as a tenant of the unit, generates a 4‑digit PIN that
 *       expires in 30 minutes (or the provided expiry), and sends a welcome SMS with the PIN.
 *       Notes:
 *       - Phone is the primary identifier and must be valid; it is standardized to +2547XXXXXXXX.
 *       - For existing users, email is NOT updated to avoid uniqueness conflicts; firstName/lastName may be updated.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: unitId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TenantWithUserCreateRequest'
 *           examples:
 *             newUser:
 *               summary: Create a brand new user and assign as tenant
 *               value:
 *                 user:
 *                   firstName: Jane
 *                   lastName: Doe
 *                   phone: "0712345678"
 *                   email: jane@example.com
 *             existingUser:
 *               summary: Assign an existing user (found by phone) as tenant
 *               value:
 *                 user:
 *                   firstName: Jane
 *                   phone: "+254712345678"
 *             customExpiry:
 *               summary: Override the default 30‑minute PIN expiry
 *               value:
 *                 user:
 *                   firstName: Jane
 *                   phone: "0712345678"
 *                 credentialExpiry: "2025-12-31T23:59:59.000Z"
 *     responses:
 *       201:
 *         description: Tenant created and assigned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/UnitTenancy'
 *                 message: { type: string }
 *             examples:
 *               success:
 *                 summary: Successful creation
 *                 value:
 *                   data:
 *                     id: "d9f0a3e2-5c2c-4f7e-bf2b-8d8a7c9f1234"
 *                     property: { id: "4f3794c8-cc50-4716-8ce4-be1286c4ce55" }
 *                     unit: { id: "137b3dfe-54b2-44df-bd31-6ef32c2abbb6" }
 *                     user:
 *                       id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                       firstName: Jane
 *                       lastName: Doe
 *                       email: jane@example.com
 *                       phone: "+254712345678"
 *                     status: active
 *                     createdAt: "2025-09-05T10:10:00.000Z"
 *                     updatedAt: "2025-09-05T10:10:00.000Z"
 *                   message: "Tenant assigned to unit successfully"
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             examples:
 *               invalidPhone:
 *                 summary: Phone format is invalid
 *                 value:
 *                   message: "Invalid phone number format"
 *               missingPhone:
 *                 summary: Phone is required
 *                 value:
 *                   message: "Phone number is required"
 *       403:
 *         description: Insufficient permissions
 *
 *     x-codeSamples:
 *       - lang: cURL
 *         label: cURL
 *         source: |
 *           curl -X POST \
 *             -H "Authorization: Bearer <TOKEN>" \
 *             -H "Content-Type: application/json" \
 *             "https://api.example.com/v1/properties/4f3794c8-cc50-4716-8ce4-be1286c4ce55/units/137b3dfe-54b2-44df-bd31-6ef32c2abbb6/tenants/with-user" \
 *             -d '{
 *               "user": {
 *                 "firstName": "Jane",
 *                 "lastName": "Doe",
 *                 "phone": "0712345678",
 *                 "email": "jane@example.com"
 *               }
 *             }'
 *       - lang: JavaScript
 *         label: fetch
 *         source: |
 *           const res = await fetch(`/api/v1/properties/${propertyId}/units/${unitId}/tenants/with-user`, {
 *             method: 'POST',
 *             headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
 *             body: JSON.stringify({
 *               user: { firstName: 'Jane', phone: '0712345678', email: 'jane@example.com' },
 *             }),
 *           });
 *           if (!res.ok) throw new Error('Failed to create tenant');
 *           const { data } = await res.json();
 *       - lang: TypeScript
 *         label: axios
 *         source: |
 *           import axios from 'axios';
 *           const { data } = await axios.post(
 *             `/api/v1/properties/${propertyId}/units/${unitId}/tenants/with-user`,
 *             { user: { firstName: 'Jane', phone: '+254712345678' } },
 *             { headers: { Authorization: `Bearer ${token}` } }
 *           );
 */
router.post(
  '/:propertyId/units/:unitId/tenants/with-user',
  authenticate('access'),
  requireOrgRoleForProperty('propertyId', [OrganizationUserRole.OWNER, OrganizationUserRole.CARETAKER]),
  validate(createTenantWithUserSchema),
  asyncHandler(PropertyUnitTenantController.createTenantWithUser.bind(PropertyUnitTenantController))
);

/**
 * @route PUT /properties/:propertyId/units/:unitId/tenants/:id
 * @desc   Update unit tenancy
 * @access Protected
 */
router.put(
  '/:propertyId/units/:unitId/tenants/:id',
  authenticate('access'),
  requireOrgRoleForProperty('propertyId', [OrganizationUserRole.OWNER, OrganizationUserRole.CARETAKER]),
  validate(updateTenantSchema),
  asyncHandler(PropertyUnitTenantController.updateUnitTenant.bind(PropertyUnitTenantController))
);

/**
 * @route GET /properties/:propertyId/units/:unitId/tenants
 * @desc   List tenants for a unit
 * @access Protected
 */
router.get(
  '/:propertyId/units/:unitId/tenants',
  // authenticate('access'),
  asyncHandler(PropertyUnitTenantController.getTenantsByUnit.bind(PropertyUnitTenantController))
);

/**
 * @route GET /properties/:propertyId/units/:unitId/tenants/active
 * @desc   Get active tenant for a unit
 * @access Protected
 */
router.get(
  '/:propertyId/units/:unitId/tenants/active',
  // authenticate('access'),
  asyncHandler(PropertyUnitTenantController.getActiveTenantByUnit.bind(PropertyUnitTenantController))
);

/**
 * @route GET /properties/:propertyId/units/:unitId/tenants/status/:status
 * @desc   List tenants by status
 * @access Protected
 */
router.get(
  '/:propertyId/units/:unitId/tenants/status/:status',
  // authenticate('access'),
  validate(getTenantsByStatusSchema),
  asyncHandler(PropertyUnitTenantController.getTenantsByStatus.bind(PropertyUnitTenantController))
);

/**
 * @route DELETE /properties/:propertyId/units/:unitId/tenants/:id
 * @desc   Delete a tenancy record
 * @access Protected
 */
router.delete(
  '/:propertyId/units/:unitId/tenants/:id',
  authenticate('access'),
  requireOrgRoleForProperty('propertyId', [OrganizationUserRole.OWNER, OrganizationUserRole.CARETAKER]),
  asyncHandler(PropertyUnitTenantController.deleteUnitTenant.bind(PropertyUnitTenantController))
);

/** -------------------- Owner Routes -------------------- */

/**
 * @route POST /properties/:propertyId/owners
 * @desc   Add an owner to a property
 * @access Protected
 * @openapi
 * /properties/{propertyId}/owners:
 *   post:
 *     tags: [Properties]
 *     summary: Add owner to property
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Created
 */
router.post(
  '/:propertyId/owners',
  authenticate('access'),
  requireOrgRoleForProperty('propertyId', [OrganizationUserRole.OWNER, OrganizationUserRole.CARETAKER]),
  // validate(createOwnerSchema),
  asyncHandler(PropertyOwnerController.createOwner.bind(PropertyOwnerController))
);

/**
 * @route PUT /properties/:propertyId/owners/:id
 * @desc   Update an owner’s role
 * @access Protected
 * @openapi
 * /properties/{propertyId}/owners/{id}:
 *   put:
 *     tags: [Properties]
 *     summary: Update property owner
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Lease'
 *                 message: { type: string }
 */
router.put(
  '/:propertyId/owners/:id',
  authenticate('access'),
  requireOrgRoleForProperty('propertyId', [OrganizationUserRole.OWNER, OrganizationUserRole.CARETAKER]),
  // validate(updateOwnerSchema),
  asyncHandler(PropertyOwnerController.updateOwner.bind(PropertyOwnerController))
);

/**
 * @route GET /properties/:propertyId/owners
 * @desc   List all owners for a property
 * @access Protected
 * @openapi
 * /properties/{propertyId}/owners:
 *   get:
 *     tags: [Properties]
 *     summary: List owners by property
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 */
router.get(
  '/:propertyId/owners',
  // authenticate('access'),
  asyncHandler(PropertyOwnerController.getOwnersByProperty.bind(PropertyOwnerController))
);

/**
 * @route GET /properties/owners/user/:userId
 * @desc   Get owner record by user
 * @access Protected
 */
router.get(
  '/owners/user/:userId',
  // authenticate('access'),
  asyncHandler(PropertyOwnerController.getOwnerByUser.bind(PropertyOwnerController))
);

/**
 * @route GET /properties/owners/landlords/:role
 * @desc   List landlords by owner role
 * @access Protected
 */
router.get(
  '/owners/landlords/:role',
  // authenticate('access'),
  // validate(getLandlordsByRoleSchema),
  asyncHandler(PropertyOwnerController.getLandlordsByRole.bind(PropertyOwnerController))
);

/** -------------------- Staff Routes -------------------- */

/**
 * @route POST /properties/:propertyId/staff
 * @desc   Assign staff to a property
 * @access Protected
 * @openapi
 * /properties/{propertyId}/staff:
 *   post:
 *     tags: [Properties]
 *     summary: Assign staff to property
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Created
 */
router.post(
  '/:propertyId/staff',
  authenticate('access'),
  requireOrgRoleForProperty('propertyId', [OrganizationUserRole.OWNER, OrganizationUserRole.CARETAKER]),
  // validate(createStaffSchema),
  asyncHandler(PropertyStaffController.createStaff.bind(PropertyStaffController))
);

/**
 * @route PUT /properties/:propertyId/staff/:id
 * @desc   Update a staff assignment
 * @access Protected
 * @openapi
 * /properties/{propertyId}/staff/{id}:
 *   put:
 *     tags: [Properties]
 *     summary: Update staff assignment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Updated
 */
router.put(
  '/:propertyId/staff/:id',
  authenticate('access'),
  requireOrgRoleForProperty('propertyId', [OrganizationUserRole.OWNER, OrganizationUserRole.CARETAKER]),
  // validate(updateStaffSchema),
  asyncHandler(PropertyStaffController.updateStaff.bind(PropertyStaffController))
);

/**
 * @route GET /properties/:propertyId/staff
 * @desc   List all staff for a property
 * @access Protected
 * @openapi
 * /properties/{propertyId}/staff:
 *   get:
 *     tags: [Properties]
 *     summary: List property staff
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 */
router.get(
  '/:propertyId/staff',
  // authenticate('access'),
  asyncHandler(PropertyStaffController.getStaffByProperty.bind(PropertyStaffController))
);

/**
 * @route GET /properties/staff/user/:userId
 * @desc   List staff assignments for a user
 * @access Protected
 * @openapi
 * /properties/staff/user/{userId}:
 *   get:
 *     tags: [Properties]
 *     summary: List staff assignments for a user
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 */
router.get(
  '/staff/user/:userId',
  // authenticate('access'),
  asyncHandler(PropertyStaffController.getStaffByUser.bind(PropertyStaffController))
);

/** -------------------- Request Routes -------------------- */

/**
 * @route POST /properties/:propertyId/requests
 * @desc   Create a maintenance request
 * @access Protected
 * @openapi
 * /properties/{propertyId}/requests:
 *   post:
 *     tags: [Maintenance]
 *     summary: Create a maintenance request
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [requesterId, title, description]
 *             properties:
 *               unitId: { type: string }
 *               requesterId: { type: string }
 *               assigneeId: { type: string }
 *               title: { type: string }
 *               description: { type: string }
 *               priority: { type: string, enum: [low, medium, high, urgent] }
 *               status: { type: string, enum: [pending, in_progress, completed, rejected, canceled] }
 *               attachments: { type: array, items: { type: string } }
 *               metadata: { type: object }
 *           example:
 *             unitId: "unit-001"
 *             requesterId: "ten-001"
 *             assigneeId: "staff-001"
 *             title: "Leaking sink"
 *             description: "Water leaking under the kitchen sink"
 *             priority: "high"
 *             status: "pending"
 *             attachments: ["https://files.example.com/issue.jpg"]
 *             metadata: { reportedVia: "app" }
 *     responses:
 *       201:
 *         description: Created
 */
router.post(
  '/:propertyId/requests',
  authenticate('access'),
  requireOrgRoleForProperty('propertyId', [OrganizationUserRole.OWNER, OrganizationUserRole.CARETAKER]),
  validate(createRequestSchema),
  asyncHandler(PropertyRequestController.createRequest.bind(PropertyRequestController))
);

/**
 * @route PUT /properties/:propertyId/requests/:id
 * @desc   Update a request
 * @access Protected
 * @openapi
 * /properties/{propertyId}/requests/{id}:
 *   put:
 *     tags: [Maintenance]
 *     summary: Update a maintenance request
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               assigneeId: { type: string, nullable: true }
 *               status: { type: string, enum: [pending, in_progress, completed, rejected, canceled] }
 *               priority: { type: string, enum: [low, medium, high, urgent] }
 *               description: { type: string }
 *           example:
 *             assigneeId: null
 *             status: "in_progress"
 *             priority: "urgent"
 *             description: "Plumber on site"
 *     responses:
 *       200:
 *         description: Updated
 */
router.put(
  '/:propertyId/requests/:id',
  authenticate('access'),
  requireOrgRoleForProperty('propertyId', [OrganizationUserRole.OWNER, OrganizationUserRole.CARETAKER]),
  validate(updateRequestSchema),
  asyncHandler(PropertyRequestController.updateRequest.bind(PropertyRequestController))
);

/**
 * @route GET /properties/:propertyId/requests
 * @desc   List all requests for a property
 * @access Protected
 * @openapi
 * /properties/{propertyId}/requests:
 *   get:
 *     tags: [Maintenance]
 *     summary: List requests by property
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 */
router.get(
  '/:propertyId/requests',
  authenticate('access'),
  asyncHandler(PropertyRequestController.getRequestsByProperty.bind(PropertyRequestController))
);

/**
 * @route GET /properties/:propertyId/requests/status/:status
 * @desc   List requests by status
 * @access Protected
 * @openapi
 * /properties/{propertyId}/requests/status/{status}:
 *   get:
 *     tags: [Maintenance]
 *     summary: List requests by status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: status
 *         required: true
 *         schema: { type: string, enum: [pending, in_progress, completed, rejected, canceled] }
 *     responses:
 *       200:
 *         description: OK
 */
router.get(
  '/:propertyId/requests/status/:status',
  authenticate('access'),
  validate(getRequestsByStatusSchema),
  asyncHandler(PropertyRequestController.getRequestsByStatus.bind(PropertyRequestController))
);

/**
 * @route DELETE /properties/:propertyId/requests/:id
 * @desc   Delete a request
 * @access Protected
 */
router.delete(
  '/:propertyId/requests/:id',
  authenticate('access'),
  requireOrgRoleForProperty('propertyId', [OrganizationUserRole.OWNER, OrganizationUserRole.CARETAKER]),
  asyncHandler(PropertyRequestController.deleteRequest.bind(PropertyRequestController))
);

/**
 * @route GET /properties/:propertyId/requests/open
 * @desc   List open (pending/in_progress) requests
 * @access Protected
 * @openapi
 * /properties/{propertyId}/requests/open:
 *   get:
 *     tags: [Maintenance]
 *     summary: List open requests
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 */
router.get(
  '/:propertyId/requests/open',
  authenticate('access'),
  asyncHandler(PropertyRequestController.getOpenRequests.bind(PropertyRequestController))
);

/**
 * @route GET /properties/:propertyId/requests/unassigned
 * @desc   List unassigned requests
 * @access Protected
 * @openapi
 * /properties/{propertyId}/requests/unassigned:
 *   get:
 *     tags: [Maintenance]
 *     summary: List unassigned requests
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 */
router.get(
  '/:propertyId/requests/unassigned',
  authenticate('access'),
  asyncHandler(PropertyRequestController.getUnassignedRequests.bind(PropertyRequestController))
);

/**
 * @route GET /properties/:propertyId/requests/priority
 * @desc   List high/urgent priority requests
 * @access Protected
 * @openapi
 * /properties/{propertyId}/requests/priority:
 *   get:
 *     tags: [Maintenance]
 *     summary: List high/urgent requests
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 */
router.get(
  '/:propertyId/requests/priority',
  authenticate('access'),
  asyncHandler(PropertyRequestController.getPriorityRequests.bind(PropertyRequestController))
);

/**
 * @route GET /properties/:propertyId/requests/recent?days=7
 * @desc   List requests created within last N days
 * @access Protected
 * @openapi
 * /properties/{propertyId}/requests/recent:
 *   get:
 *     tags: [Maintenance]
 *     summary: List requests in last N days
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: days
 *         required: false
 *         schema: { type: integer, minimum: 0, default: 7 }
 *     responses:
 *       200:
 *         description: OK
 */
router.get(
  '/:propertyId/requests/recent',
  authenticate('access'),
  validate(getRecentRequestsSchema),
  asyncHandler(PropertyRequestController.getRecentRequests.bind(PropertyRequestController))
);

/** -------------------- Lease Agreement Routes -------------------- */

/**
 * @route POST /properties/:propertyId/units/:unitId/leases
 * @desc   Create a lease agreement
 * @access Protected
 * @openapi
 * /properties/{propertyId}/units/{unitId}/leases:
 *   post:
 *     tags: [Properties]
 *     summary: Create lease for a unit
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: unitId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Created
 */
router.post(
  '/:propertyId/units/:unitId/leases',
  authenticate('access'),
  requireOrgRoleForProperty('propertyId', [OrganizationUserRole.OWNER, OrganizationUserRole.CARETAKER]),
  validate(createLeaseAgreementSchema),
  asyncHandler(PropertyLeaseAgreementController.createLeaseAgreement.bind(PropertyLeaseAgreementController))
);

/**
 * @route GET /properties/:propertyId/leases/rent-roll
 * @desc  Rent roll for a property and month
 * @access Protected
 * @openapi
 * /properties/{propertyId}/leases/rent-roll:
 *   get:
 *     tags: [Properties]
 *     summary: Get rent roll (expected vs collected) for a month
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: month
 *         required: true
 *         schema: { type: string, pattern: "^\\d{4}-\\d{2}$" }
 *         description: Month in YYYY-MM
 *     responses:
 *       200:
 *         description: Rent roll rows
 */
router.get(
  '/:propertyId/leases/rent-roll',
  authenticate('access'),
  requireOrgRoleForProperty('propertyId', [OrganizationUserRole.OWNER, OrganizationUserRole.CARETAKER]),
  asyncHandler(PropertyLeaseAgreementController.getPropertyRentRoll.bind(PropertyLeaseAgreementController))
);

/**
 * @route GET /properties/:propertyId/leases/rent-roll.csv
 * @desc  Export rent roll CSV (actual values)
 * @access Protected
 * @openapi
 * /properties/{propertyId}/leases/rent-roll.csv:
 *   get:
 *     tags: [Properties]
 *     summary: Export rent roll CSV (actual)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: month
 *         required: true
 *         schema: { type: string, pattern: "^\\d{4}-\\d{2}$" }
 *     responses:
 *       200:
 *         description: CSV content
 */
router.get(
  '/:propertyId/leases/rent-roll.csv',
  authenticate('access'),
  requireOrgRoleForProperty('propertyId', [OrganizationUserRole.OWNER, OrganizationUserRole.CARETAKER]),
  asyncHandler(PropertyLeaseAgreementController.exportRentRollCsv.bind(PropertyLeaseAgreementController))
);

/**
 * @route GET /properties/:propertyId/leases/rent-roll-tax.csv
 * @desc  Export rent roll CSV with multiplier (tax reports)
 * @access Protected
 * @openapi
 * /properties/{propertyId}/leases/rent-roll-tax.csv:
 *   get:
 *     tags: [Properties]
 *     summary: Export rent roll CSV (tax report with multiplier)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: month
 *         required: true
 *         schema: { type: string, pattern: "^\\d{4}-\\d{2}$" }
 *       - in: query
 *         name: multiplier
 *         required: false
 *         schema: { type: number, default: 0.4, minimum: 0 }
 *     responses:
 *       200:
 *         description: CSV content
 */
router.get(
  '/:propertyId/leases/rent-roll-tax.csv',
  authenticate('access'),
  requireOrgRoleForProperty('propertyId', [OrganizationUserRole.OWNER, OrganizationUserRole.CARETAKER]),
  asyncHandler(PropertyLeaseAgreementController.exportRentRollTaxCsv.bind(PropertyLeaseAgreementController))
);

/**
 * @route GET /properties/:propertyId/leases/arrears
 * @desc  Arrears aging summary and rows
 * @access Protected
 * @openapi
 * /properties/{propertyId}/leases/arrears:
 *   get:
 *     tags: [Properties]
 *     summary: Get arrears aging as of a date
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: asOf
 *         required: true
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Aging summary and rows
 */
router.get(
  '/:propertyId/leases/arrears',
  authenticate('access'),
  requireOrgRoleForProperty('propertyId', [OrganizationUserRole.OWNER, OrganizationUserRole.CARETAKER]),
  asyncHandler(PropertyLeaseAgreementController.getArrearsAging.bind(PropertyLeaseAgreementController))
);

/**
 * @route GET /properties/:propertyId/leases/arrears.csv
 * @desc  Export arrears CSV (actual values)
 * @access Protected
 * @openapi
 * /properties/{propertyId}/leases/arrears.csv:
 *   get:
 *     tags: [Properties]
 *     summary: Export arrears CSV (actual)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: asOf
 *         required: true
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: CSV content
 */
router.get(
  '/:propertyId/leases/arrears.csv',
  authenticate('access'),
  requireOrgRoleForProperty('propertyId', [OrganizationUserRole.OWNER, OrganizationUserRole.CARETAKER]),
  asyncHandler(PropertyLeaseAgreementController.exportArrearsCsv.bind(PropertyLeaseAgreementController))
);

/**
 * @route GET /properties/:propertyId/leases/arrears-tax.csv
 * @desc  Export arrears CSV with multiplier (tax reports)
 * @access Protected
 * @openapi
 * /properties/{propertyId}/leases/arrears-tax.csv:
 *   get:
 *     tags: [Properties]
 *     summary: Export arrears CSV (tax report with multiplier)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: asOf
 *         required: true
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: multiplier
 *         required: false
 *         schema: { type: number, default: 0.4, minimum: 0 }
 *     responses:
 *       200:
 *         description: CSV content
 */
router.get(
  '/:propertyId/leases/arrears-tax.csv',
  authenticate('access'),
  requireOrgRoleForProperty('propertyId', [OrganizationUserRole.OWNER, OrganizationUserRole.CARETAKER]),
  asyncHandler(PropertyLeaseAgreementController.exportArrearsTaxCsv.bind(PropertyLeaseAgreementController))
);

/**
 * @route GET /leases/{id}/ledger
 * @desc  Per-lease ledger (periods, payments, balances)
 * @access Protected
 * @openapi
 * /leases/{id}/ledger:
 *   get:
 *     tags: [Properties]
 *     summary: Get a lease ledger
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Ledger object
 */
router.get(
  '/leases/:id/ledger',
  authenticate('access'),
  asyncHandler(PropertyLeaseAgreementController.getLeaseLedger.bind(PropertyLeaseAgreementController))
);

/**
 * @route PUT /properties/:propertyId/units/:unitId/leases/:id
 * @desc   Update a lease agreement
 * @access Protected
 * @openapi
 * /properties/{propertyId}/units/{unitId}/leases/{id}:
 *   put:
 *     tags: [Properties]
 *     summary: Update lease for a unit
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: unitId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Updated
 */
router.put(
  '/:propertyId/units/:unitId/leases/:id',
  authenticate('access'),
  requireOrgRoleForProperty('propertyId', [OrganizationUserRole.OWNER, OrganizationUserRole.CARETAKER]),
  validate(updateLeaseAgreementSchema),
  asyncHandler(PropertyLeaseAgreementController.updateLeaseAgreement.bind(PropertyLeaseAgreementController))
);

/**
 * @route PATCH /properties/:propertyId/units/:unitId/leases/:id/extend
 * @desc   Extend a lease (set new end date, optional amount)
 * @access Protected
 * @openapi
 * /properties/{propertyId}/units/{unitId}/leases/{id}/extend:
 *   patch:
 *     tags: [Properties]
 *     summary: Extend a lease
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: unitId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LeaseExtendRequest'
 *     responses:
 *       200:
 *         description: Lease extended
 */
router.patch(
  '/:propertyId/units/:unitId/leases/:id/extend',
  authenticate('access'),
  requireOrgRoleForProperty('propertyId', [OrganizationUserRole.OWNER, OrganizationUserRole.CARETAKER]),
  validate(extendLeaseAgreementSchema),
  asyncHandler(PropertyLeaseAgreementController.extendLease.bind(PropertyLeaseAgreementController))
);

/**
 * @route PATCH /properties/:propertyId/units/:unitId/leases/:id/terminate
 * @desc   Terminate a lease early
 * @access Protected
 * @openapi
 * /properties/{propertyId}/units/{unitId}/leases/{id}/terminate:
 *   patch:
 *     tags: [Properties]
 *     summary: Terminate a lease
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: unitId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LeaseTerminateRequest'
 *     responses:
 *       200:
 *         description: Lease terminated
 */
router.patch(
  '/:propertyId/units/:unitId/leases/:id/terminate',
  authenticate('access'),
  requireOrgRoleForProperty('propertyId', [OrganizationUserRole.OWNER, OrganizationUserRole.CARETAKER]),
  validate(terminateLeaseAgreementSchema),
  asyncHandler(PropertyLeaseAgreementController.terminateLease.bind(PropertyLeaseAgreementController))
);

/**
 * @route GET /properties/:propertyId/units/:unitId/leases/:id
 * @desc   Get a lease by ID
 * @access Protected
 * @openapi
 * /properties/{propertyId}/units/{unitId}/leases/{id}:
  *   get:
  *     tags: [Properties]
  *     summary: Get lease by id
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: unitId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Lease'
 *                 message: { type: string }
 */
router.get(
  '/:propertyId/units/:unitId/leases/:id',
  // authenticate('access'),
  asyncHandler(PropertyLeaseAgreementController.getLeaseById.bind(PropertyLeaseAgreementController))
);

/**
 * @route DELETE /properties/:propertyId/units/:unitId/leases/:id
 * @desc   Delete a lease agreement
 * @access Protected
 * @openapi
 * /properties/{propertyId}/units/{unitId}/leases/{id}:
 *   delete:
 *     tags: [Properties]
 *     summary: Delete lease
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: unitId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Deleted
 */
router.delete(
  '/:propertyId/units/:unitId/leases/:id',
  authenticate('access'),
  requireOrgRoleForProperty('propertyId', [OrganizationUserRole.OWNER, OrganizationUserRole.CARETAKER]),
  asyncHandler(PropertyLeaseAgreementController.deleteLeaseAgreement.bind(PropertyLeaseAgreementController))
);

/**
 * @route GET /properties/:propertyId/units/:unitId/leases
 * @desc   List all leases for a unit
 * @access Protected
 * @openapi
 * /properties/{propertyId}/units/{unitId}/leases:
  *   get:
  *     tags: [Properties]
  *     summary: List leases for a unit
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: unitId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Lease'
 *                 message: { type: string }
*/
router.get(
  '/:propertyId/units/:unitId/leases',
  // authenticate('access'),
  asyncHandler(PropertyLeaseAgreementController.getLeasesByUnit.bind(PropertyLeaseAgreementController))
);

/**
 * @route GET /properties/tenants/:tenantId/leases
 * @desc   List all leases for a tenant
 * @access Protected
 * @openapi
 * /properties/tenants/{tenantId}/leases:
 *   get:
 *     tags: [Properties]
 *     summary: List leases for a tenant
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Lease'
 *                 message: { type: string }
 */
router.get(
  '/tenants/:tenantId/leases',
  // authenticate('access'),
  asyncHandler(PropertyLeaseAgreementController.getLeasesByTenant.bind(PropertyLeaseAgreementController))
);

/** -------------------- Lease Payment Routes -------------------- */

/**
 * @route POST /properties/:propertyId/units/:unitId/leases/:leaseId/payments
 * @desc   Record a payment on a lease
 * @access Protected
 * @openapi
 * /properties/{propertyId}/units/{unitId}/leases/{leaseId}/payments:
 *   post:
 *     tags: [Payments]
 *     summary: Record payment on lease
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: unitId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: leaseId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tenantId: { type: string }
 *               amount: { type: number }
 *               paidAt: { type: string, format: date-time }
 *               typeCode: { type: string }
 *               metadata: { type: object }
 *           examples:
 *             ownerRecord:
 *               summary: Record a rent payment
 *               value:
 *                 tenantId: "a7f6b0e4-12ab-4cde-9f01-23456789abcd"
 *                 amount: 45000
 *                 paidAt: "2025-09-10T11:00:00Z"
 *                 typeCode: "RENT"
 *                 metadata:
 *                   note: "Cash at office"
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             examples:
 *               created:
 *                 value:
 *                   data:
 *                     id: "pay_123"
 *                     amount: 45000
 *                     paidAt: "2025-09-10T11:00:00Z"
 *                     type:
 *                       code: "RENT"
 *                     tenant:
 *                       id: "a7f6b0e4-12ab-4cde-9f01-23456789abcd"
 *                   message: "Payment recorded successfully"
 */
router.post(
  '/:propertyId/units/:unitId/leases/:leaseId/payments',
  authenticate('access'),
  requireOrgRoleForProperty('propertyId', [OrganizationUserRole.OWNER, OrganizationUserRole.CARETAKER]),
  validate(createPaymentSchema),
  asyncHandler(PropertyLeasePaymentController.createPayment.bind(PropertyLeasePaymentController))
);

/**
 * @route POST /leases/{leaseId}/payments/initiate
 * @desc   Tenant-initiated payment (M-Pesa STK) – returns checkout/session
 * @access Protected
 * @openapi
 * /leases/{leaseId}/payments/initiate:
 *   post:
 *     tags: [Payments]
 *     summary: Initiate tenant payment for a lease
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: leaseId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount: { type: number }
 *           examples:
 *             initiate:
 *               value: { amount: 45000 }
 *     responses:
 *       201:
 *         description: Initiated
 */
router.post(
  '/leases/:leaseId/payments/initiate',
  authenticate('access'),
  asyncHandler(PropertyLeasePaymentController.initiateTenantPayment.bind(PropertyLeasePaymentController))
);

/**
 * @route PUT /properties/:propertyId/units/:unitId/leases/:leaseId/payments/:id
 * @desc   Update a lease payment
 * @access Protected
 * @openapi
 * /properties/{propertyId}/units/{unitId}/leases/{leaseId}/payments/{id}:
 *   put:
 *     tags: [Payments]
 *     summary: Update lease payment
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: unitId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: leaseId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Updated
 */
router.put(
  '/:propertyId/units/:unitId/leases/:leaseId/payments/:id',
  authenticate('access'),
  requireOrgRoleForProperty('propertyId', [OrganizationUserRole.OWNER, OrganizationUserRole.CARETAKER]),
  validate(updatePaymentSchema),
  asyncHandler(PropertyLeasePaymentController.updatePayment.bind(PropertyLeasePaymentController))
);

/**
 * @route GET /properties/:propertyId/units/:unitId/leases/:leaseId/payments
 * @desc   List payments for a lease
 * @access Protected
 * @openapi
 * /properties/{propertyId}/units/{unitId}/leases/{leaseId}/payments:
 *   get:
 *     tags: [Payments]
 *     summary: List payments by lease
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: unitId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: leaseId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 */
router.get(
  '/:propertyId/units/:unitId/leases/:leaseId/payments',
  // authenticate('access'),
  asyncHandler(PropertyLeasePaymentController.getPaymentsByLease.bind(PropertyLeasePaymentController))
);

/**
 * @route POST /properties/:propertyId/units/:unitId/leases/:leaseId/payments/remind
 * @desc   Send due payment reminder SMS to tenant if due
 * @access Protected
 */
router.post(
  '/:propertyId/units/:unitId/leases/:leaseId/payments/remind',
  authenticate('access'),
  requireOrgRoleForProperty('propertyId', [OrganizationUserRole.OWNER, OrganizationUserRole.CARETAKER]),
  asyncHandler(PropertyLeasePaymentController.remindDuePayment.bind(PropertyLeasePaymentController))
);

/**
 * @route GET /tenants/:tenantId/payments
 * @desc   List payments for a tenant (self-service)
 * @access Protected
 * @openapi
 * /properties/tenants/{tenantId}/payments:
 *   get:
 *     tags: [Payments]
 *     summary: List payments for the authenticated tenant
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tenantId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             examples:
 *               list:
 *                 value:
 *                   data:
 *                     - id: "pay_1"
 *                       amount: 45000
 *                       paidAt: "2025-09-01T10:00:00Z"
 *                       type: { code: "RENT" }
 *                     - id: "pay_2"
 *                       amount: 5000
 *                       paidAt: "2025-09-05T09:00:00Z"
 *                       type: { code: "LATE_FEE" }
 *                   message: "Payments for tenant retrieved successfully"
 */
router.get(
  '/tenants/:tenantId/payments',
  authenticate('access'),
  asyncHandler(PropertyLeasePaymentController.getPaymentsByTenant.bind(PropertyLeasePaymentController))
);

/**
 * @route GET /properties/:propertyId/units/:unitId/leases/:leaseId/payments/range
 * @desc   List payments in a date range
 * @access Protected
 * @openapi
 * /properties/{propertyId}/units/{unitId}/leases/{leaseId}/payments/range:
 *   get:
 *     tags: [Payments]
 *     summary: List payments in date range by lease
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: unitId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: leaseId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: start
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: end
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 */
router.get(
  '/:propertyId/units/:unitId/leases/:leaseId/payments/range',
  // authenticate('access'),
  validate(getPaymentsInDateRangeSchema),
  asyncHandler(PropertyLeasePaymentController.getPaymentsInDateRange.bind(PropertyLeasePaymentController))
);

/**
 * @route POST /payments/webhooks/mpesa
 * @desc   M-Pesa Daraja webhook receiver
 * @access Public (verify via shared secret / IP allow in infra)
 */
router.post(
  '/payments/webhooks/mpesa',
  asyncHandler(PropertyLeasePaymentController.mpesaWebhook.bind(PropertyLeasePaymentController))
);

/**
 * @openapi
 * /payments/webhooks/mpesa:
 *   post:
 *     tags: [Payments]
 *     summary: LNMO Online (STK) callback (M-Pesa)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           examples:
 *             stkCallback:
 *               value:
 *                 Body:
 *                   stkCallback:
 *                     MerchantRequestID: "29115-34620561-1"
 *                     CheckoutRequestID: "ws_CO_191220191020363925"
 *                     ResultCode: 0
 *                     ResultDesc: "The service request is processed successfully."
 *                     CallbackMetadata:
 *                       Item:
 *                         - Name: Amount
 *                           Value: 10
 *                         - Name: MpesaReceiptNumber
 *                           Value: NLJ7RT61SV
 *                         - Name: TransactionDate
 *                           Value: 20191219102115
 *                         - Name: PhoneNumber
 *                           Value: 254700000000
 *     responses:
 *       200:
 *         description: ok

/**
 * @route POST /payments/webhooks/mpesa/c2b/validate
 * @desc   M-Pesa C2B Validation endpoint (org-specific token in header)
 */
router.post(
  '/payments/webhooks/mpesa/c2b/validate',
  asyncHandler(PropertyLeasePaymentController.mpesaC2BValidate.bind(PropertyLeasePaymentController))
);

/**
 * @openapi
 * /payments/webhooks/mpesa/c2b/validate:
 *   post:
 *     tags: [Payments]
 *     summary: C2B Validation (M-Pesa)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           examples:
 *             c2bValidateSample:
 *               value:
 *                 TransType: "Pay Bill"
 *                 TransID: "RKTQDM7W6S"
 *                 TransTime: "20191122063845"
 *                 TransAmount: "10"
 *                 BusinessShortCode: "600638"
 *                 BillRefNumber: "Test123"
 *                 MSISDN: "254708374149"
 *     responses:
 *       200:
 *         description: Validation decision

/**
 * @route POST /payments/webhooks/mpesa/c2b/confirm
 * @desc   M-Pesa C2B Confirmation endpoint (org-specific token in header)
 */
router.post(
  '/payments/webhooks/mpesa/c2b/confirm',
  asyncHandler(PropertyLeasePaymentController.mpesaC2BConfirm.bind(PropertyLeasePaymentController))
);

/**
 * @openapi
 * /payments/webhooks/mpesa/c2b/confirm:
 *   post:
 *     tags: [Payments]
 *     summary: C2B Confirmation (M-Pesa)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           examples:
 *             c2bConfirmSample:
 *               value:
 *                 TransactionType: "Pay Bill"
 *                 TransID: "RKTQDM7W6S"
 *                 TransTime: "20191122063845"
 *                 TransAmount: "10"
 *                 BusinessShortCode: "600638"
 *                 BillRefNumber: "Test123"
 *                 InvoiceNumber: ""
 *                 OrgAccountBalance: "49197.00"
 *                 ThirdPartyTransID: ""
 *                 MSISDN: "254708374149"
 *                 FirstName: "John"
 *                 MiddleName: ""
 *                 LastName: "Doe"
 *     responses:
 *       200:
 *         description: Received
  */

export default router;

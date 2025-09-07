import Joi from 'joi';

export const uuidSchema = Joi.string()
  .uuid()
  .messages({ 'string.uuid': 'Must be a valid UUID.' });

const name128 = Joi.string().trim().max(128).messages({
  'string.max': 'Must not exceed 128 characters.',
});

const text1024 = Joi.string().trim().max(1024).messages({
  'string.max': 'Must not exceed 1024 characters.',
});

const boolSchema = Joi.boolean();
const posInt = Joi.number().integer().min(1);
const nonNegInt = Joi.number().integer().min(0);

const latSchema = Joi.number().min(-90).max(90).messages({
  'number.base': 'lat must be a number.',
  'number.min': 'lat must be >= -90.',
  'number.max': 'lat must be <= 90.',
});
const lngSchema = Joi.number().min(-180).max(180).messages({
  'number.base': 'lng must be a number.',
  'number.min': 'lng must be >= -180.',
  'number.max': 'lng must be <= 180.',
});

/** Accepts either GeoJSON Point or { lat, lng } */
const geoPointSchema = Joi.alternatives().try(
  Joi.object({
    type: Joi.string().valid('Point').required(),
    coordinates: Joi.array()
      .length(2)
      .items(lngSchema.required(), latSchema.required())
      .required(),
  }).required(),
  Joi.object({
    lat: latSchema.required(),
    lng: lngSchema.required(),
  }).required()
);

/** Minimal GeoJSON Polygon validation */
const geoPolygonSchema = Joi.object({
  type: Joi.string().valid('Polygon').required(),
  coordinates: Joi.array()
    .min(1)
    .items(
      Joi.array()
        .min(4) // a linear ring has at least 4 positions (last equals first)
        .items(
          Joi.array().length(2).items(lngSchema.required(), latSchema.required()).required()
        )
        .required()
    )
    .required(),
}).required();

/** String OR string[] utility */
const strOrStrArray = Joi.alternatives().try(
  Joi.string().trim(),
  Joi.array().items(Joi.string().trim())
);

export const LOCATION_MESSAGES = {
  ERROR: {
    INVALID_INPUT: 'Invalid input.',
    NOT_FOUND: 'Location not found.',
  },
};

export const createLocationSchema = {
  body: Joi.object({
    localAreaName: name128.required().messages({
      'any.required': 'localAreaName is required.',
    }),
    county: name128.required().messages({
      'any.required': 'county is required.',
    }),
    town: name128.optional(),
    street: name128.optional(),
    coverageDetails: text1024.optional(),
    parentId: Joi.alternatives().try(uuidSchema, Joi.valid(null)).optional(),

    centerPoint: geoPointSchema.optional(),
    geofence: geoPolygonSchema.optional(),

    metadata: Joi.object().unknown(true).optional(),

    components: Joi.array()
      .items(
        Joi.object({
          addressComponentId: uuidSchema.required().messages({
            'any.required': 'addressComponentId is required.',
          }),
          label: Joi.alternatives().try(Joi.string().trim().max(256), Joi.valid(null)).optional(),
          sequence: Joi.alternatives().try(Joi.number().integer().min(0), Joi.valid(null)).optional(),
          isPrimary: Joi.alternatives().try(Joi.boolean(), Joi.valid(null)).optional(),
          centerPoint: Joi.alternatives().try(geoPointSchema, Joi.valid(null)).optional(),
          metadata: Joi.alternatives().try(Joi.object().unknown(true), Joi.valid(null)).optional(),
        })
      )
      .optional(),
  }),
};

export const updateLocationSchema = {
  params: Joi.object({
    id: uuidSchema.required().messages({ 'any.required': 'id is required.' }),
  }),
  body: Joi.object({
    localAreaName: name128.optional(),
    county: name128.optional(),
    town: name128.optional(),
    street: name128.optional(),
    coverageDetails: text1024.optional(),
    parentId: Joi.alternatives().try(uuidSchema, Joi.valid(null)).optional(),

    centerPoint: Joi.alternatives().try(geoPointSchema, Joi.valid(null)).optional(),
    geofence: Joi.alternatives().try(geoPolygonSchema, Joi.valid(null)).optional(),

    metadata: Joi.object().unknown(true).optional(),

    clearCenterPoint: boolSchema.optional(),
    clearGeofence: boolSchema.optional(),

    components: Joi.array()
      .items(
        Joi.object({
          addressComponentId: uuidSchema.required(),
          label: Joi.alternatives().try(Joi.string().trim().max(256), Joi.valid(null)).optional(),
          sequence: Joi.alternatives().try(Joi.number().integer().min(0), Joi.valid(null)).optional(),
          isPrimary: Joi.alternatives().try(Joi.boolean(), Joi.valid(null)).optional(),
          centerPoint: Joi.alternatives().try(geoPointSchema, Joi.valid(null)).optional(),
          metadata: Joi.alternatives().try(Joi.object().unknown(true), Joi.valid(null)).optional(),
        })
      )
      .optional(),
  }),
};

export const getLocationByIdSchema = {
  params: Joi.object({
    id: uuidSchema.required().messages({ 'any.required': 'id is required.' }),
  }),
};

export const deleteLocationSchema = getLocationByIdSchema;

export const listLocationsSchema = {
  query: Joi.object({
    search: Joi.string().trim().optional(),
    county: strOrStrArray.optional(),
    town: strOrStrArray.optional(),

    // allow "null" (string) or UUID for parentId; controller already normalizes
    parentId: Joi.alternatives().try(uuidSchema, Joi.string().valid('null')).optional(),

    isRootOnly: boolSchema.optional(),
    hasGeofence: boolSchema.optional(),
    includeDeleted: boolSchema.optional(),

    page: posInt.optional(),
    pageSize: posInt.max(500).optional(),

    sort: Joi.string()
      .valid('name_asc', 'name_desc', 'created_asc', 'created_desc')
      .optional(),
  }),
};

export const moveLocationSchema = {
  params: Joi.object({
    id: uuidSchema.required().messages({ 'any.required': 'id is required.' }),
  }),
  body: Joi.object({
    newParentId: Joi.alternatives().try(uuidSchema, Joi.valid(null)).required().messages({
      'any.required': 'newParentId is required (use null to move to root).',
    }),
  }),
};

export const subtreeSchema = getLocationByIdSchema;
export const ancestorsSchema = getLocationByIdSchema;
export const descendantsSchema = getLocationByIdSchema;
export const rootTreesSchema = { query: Joi.object({}).unknown(false) };

export const nearestSchema = {
  query: Joi.object({
    lat: latSchema.required().messages({ 'any.required': 'lat is required.' }),
    lng: lngSchema.required().messages({ 'any.required': 'lng is required.' }),
    limit: posInt.optional(),
    county: strOrStrArray.optional(),
  }),
};

export const withinRadiusSchema = {
  query: Joi.object({
    lat: latSchema.required(),
    lng: lngSchema.required(),
    radiusMeters: Joi.number().positive().required().messages({
      'any.required': 'radiusMeters is required.',
      'number.positive': 'radiusMeters must be > 0.',
    }),
    limit: posInt.optional(),
    county: strOrStrArray.optional(),
  }),
};

export const containsPointSchema = {
  query: Joi.object({
    lat: latSchema.required(),
    lng: lngSchema.required(),
    limit: posInt.optional(),
  }),
};

export const intersectsPolygonSchema = {
  body: Joi.object({
    polygon: geoPolygonSchema.required().messages({
      'any.required': 'polygon is required.',
    }),
    limit: posInt.optional(),
  }),
};

export const geofenceAreaSchema = getLocationByIdSchema;
export const exportGeoJSONSchema = getLocationByIdSchema;

export const attachAddressComponentsSchema = {
  params: Joi.object({
    id: uuidSchema.required().messages({ 'any.required': 'id is required.' }),
  }),
  body: Joi.object({
    replaceExisting: boolSchema.optional(),
    components: Joi.array()
      .min(1)
      .items(
        Joi.object({
          addressComponentId: uuidSchema.required().messages({
            'any.required': 'addressComponentId is required.',
          }),
          label: Joi.alternatives().try(Joi.string().trim().max(256), Joi.valid(null)).optional(),
          sequence: Joi.alternatives().try(Joi.number().integer().min(0), Joi.valid(null)).optional(),
          isPrimary: Joi.alternatives().try(Joi.boolean(), Joi.valid(null)).optional(),
          centerPoint: Joi.alternatives().try(geoPointSchema, Joi.valid(null)).optional(),
          metadata: Joi.alternatives().try(Joi.object().unknown(true), Joi.valid(null)).optional(),
        })
      )
      .required()
      .messages({
        'array.min': 'At least one component is required.',
        'any.required': 'components array is required.',
      }),
  }),
};

import Joi from 'joi';

/* ---------- Primitives ---------- */
export const uuidSchema = Joi.string()
  .uuid()
  .messages({ 'string.uuid': 'Must be a valid UUID.' });

const labelSchema = Joi.string().trim().max(256).messages({
  'string.max': 'label must not exceed 256 characters.',
});

const seqSchema = Joi.number().integer().min(0).messages({
  'number.base': 'sequence must be a number.',
  'number.integer': 'sequence must be an integer.',
  'number.min': 'sequence must be >= 0.',
});

const boolSchema = Joi.boolean();

const posInt = Joi.number().integer().min(1).messages({
  'number.base': 'Must be a number.',
  'number.min': 'Must be at least 1.',
});

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

/** Accepts GeoJSON Point OR {lat,lng} */
const geoPointSchema = Joi.alternatives().try(
  Joi.object({
    type: Joi.string().valid('Point').required(),
    coordinates: Joi.array()
      .length(2)
      .items(lngSchema.required(), latSchema.required())
      .required(),
  }),
  Joi.object({
    lat: latSchema.required(),
    lng: lngSchema.required(),
  })
);

/** label | null, sequence | null, etc. helpers */
const nullable = <T extends Joi.Schema>(s: T) =>
  Joi.alternatives().try(s, Joi.valid(null));

/* ---------- Schemas (split by target) ---------- */
/** Create link (BODY) */
export const createLinkBodySchema = Joi.object({
  locationId: uuidSchema.required().messages({ 'any.required': 'locationId is required.' }),
  addressComponentId: uuidSchema.required().messages({ 'any.required': 'addressComponentId is required.' }),
  label: nullable(labelSchema).optional(),
  sequence: nullable(seqSchema).optional(),
  isPrimary: nullable(boolSchema).optional(),
  centerPoint: nullable(geoPointSchema).optional(),
  metadata: Joi.object().unknown(true).optional(),
}).prefs({ convert: true });

/** Update link (PARAMS + BODY) */
export const updateLinkParamsSchema = Joi.object({
  id: uuidSchema.required().messages({ 'any.required': 'id is required.' }),
});

export const updateLinkBodySchema = Joi.object({
  locationId: uuidSchema.optional(),
  addressComponentId: uuidSchema.optional(),
  label: nullable(labelSchema).optional(),
  sequence: nullable(seqSchema).optional(),
  isPrimary: nullable(boolSchema).optional(),
  centerPoint: nullable(geoPointSchema).optional(),
  metadata: Joi.object().unknown(true).optional(),
  clearCenterPoint: boolSchema.optional(),
}).prefs({ convert: true });

/** Delete link (PARAMS) */
export const deleteLinkParamsSchema = Joi.object({
  id: uuidSchema.required().messages({ 'any.required': 'id is required.' }),
});

/** Bulk delete links (BODY) */
export const bulkDeleteLinksBodySchema = Joi.object({
  ids: Joi.array().min(1).items(uuidSchema.required()).required().messages({
    'array.min': '"ids" must contain at least one item.',
    'any.required': '"ids" is required.',
  }),
}).prefs({ convert: true });

/** Get single link by ID (PARAMS) */
export const getLinkByIdParamsSchema = Joi.object({
  id: uuidSchema.required().messages({ 'any.required': 'id is required.' }),
});

/** List links for a location (PARAMS) */
export const listByLocationParamsSchema = Joi.object({
  locationId: uuidSchema.required().messages({ 'any.required': 'locationId is required.' }),
});

/** List links for an address component (PARAMS) */
export const listByAddressComponentParamsSchema = Joi.object({
  addressComponentId: uuidSchema.required().messages({ 'any.required': 'addressComponentId is required.' }),
});

/** Get primary link for a location (PARAMS) */
export const getPrimaryForLocationParamsSchema = Joi.object({
  locationId: uuidSchema.required().messages({ 'any.required': 'locationId is required.' }),
});

/** Reorder sequences (PARAMS + BODY) */
export const reorderSequencesParamsSchema = Joi.object({
  locationId: uuidSchema.required().messages({ 'any.required': 'locationId is required.' }),
});

export const reorderSequencesBodySchema = Joi.object({
  orderedLinkIds: Joi.array().min(1).items(uuidSchema.required()).required().messages({
    'array.min': '"orderedLinkIds" must contain at least one id.',
    'any.required': '"orderedLinkIds" is required.',
  }),
}).prefs({ convert: true });

/** Upsert single link (BODY) */
export const upsertLinkBodySchema = Joi.object({
  locationId: uuidSchema.required().messages({ 'any.required': 'locationId is required.' }),
  addressComponentId: uuidSchema.required().messages({ 'any.required': 'addressComponentId is required.' }),
  label: nullable(labelSchema).optional(),
  sequence: nullable(seqSchema).optional(),
  isPrimary: nullable(boolSchema).optional(),
  centerPoint: nullable(geoPointSchema).optional(),
  metadata: Joi.object().unknown(true).optional(),
}).prefs({ convert: true });

/** Bulk upsert links (BODY) */
export const bulkUpsertLinksBodySchema = Joi.object({
  rows: Joi.array()
    .min(1)
    .items(
      Joi.object({
        locationId: uuidSchema.required(),
        addressComponentId: uuidSchema.required(),
        label: nullable(labelSchema).optional(),
        sequence: nullable(seqSchema).optional(),
        isPrimary: nullable(boolSchema).optional(),
        centerPoint: nullable(geoPointSchema).optional(),
        metadata: Joi.object().unknown(true).optional(),
      })
    )
    .required()
    .messages({
      'array.min': '"rows" must contain at least one item.',
      'any.required': '"rows" is required.',
    }),
}).prefs({ convert: true });

/** Clear geometry (PARAMS) */
export const clearCenterPointParamsSchema = Joi.object({
  id: uuidSchema.required().messages({ 'any.required': 'id is required.' }),
});

/** Spatial /near (QUERY) */
export const findComponentsNearPointQuerySchema = Joi.object({
  lat: latSchema.required().messages({ 'any.required': 'lat is required.' }),
  lng: lngSchema.required().messages({ 'any.required': 'lng is required.' }),
  distanceMeters: Joi.number().positive().required().messages({
    'any.required': 'distanceMeters is required.',
    'number.positive': 'distanceMeters must be > 0.',
  }),
  limit: posInt.optional(),
}).prefs({ convert: true });

/* ---------- Composite ValidSchema exports (for validate(...)) ---------- */
export const createLinkSchema = { body: createLinkBodySchema };
export const updateLinkSchema = { params: updateLinkParamsSchema, body: updateLinkBodySchema };
export const deleteLinkSchema = { params: deleteLinkParamsSchema };
export const bulkDeleteLinksSchema = { body: bulkDeleteLinksBodySchema };
export const getLinkByIdSchema = { params: getLinkByIdParamsSchema };
export const listByLocationSchema = { params: listByLocationParamsSchema };
export const listByAddressComponentSchema = { params: listByAddressComponentParamsSchema };
export const getPrimaryForLocationSchema = { params: getPrimaryForLocationParamsSchema };
export const reorderSequencesSchema = { params: reorderSequencesParamsSchema, body: reorderSequencesBodySchema };
export const upsertLinkSchema = { body: upsertLinkBodySchema };
export const bulkUpsertLinksSchema = { body: bulkUpsertLinksBodySchema };
export const clearCenterPointSchema = { params: clearCenterPointParamsSchema };
export const findComponentsNearPointSchema = { query: findComponentsNearPointQuerySchema };

import Joi from 'joi';

export const uuidSchema = Joi.string()
  .uuid()
  .messages({ 'string.uuid': 'Must be a valid UUID.' });

const name64 = Joi.string().trim().max(64).messages({
  'string.max': 'Must not exceed 64 characters.',
});

const value256 = Joi.string().trim().max(256).messages({
  'string.max': 'Must not exceed 256 characters.',
});

const posInt = Joi.number().integer().min(1).messages({
  'number.base': 'Must be a number.',
  'number.min': 'Must be at least 1.',
});
const limitInt = posInt.max(500).messages({
  'number.max': 'Must not exceed 500.',
});

/** string or string[] helper */
const strOrStrArray = Joi.alternatives().try(
  Joi.string().trim(),
  Joi.array().items(Joi.string().trim())
);

/* ========== Schemas ========== */

/** Create */
export const createAddressComponentSchema = {
  body: Joi.object({
    type: name64.required().messages({ 'any.required': '"type" is required.' }),
    value: value256.required().messages({ 'any.required': '"value" is required.' }),
    parentId: Joi.alternatives().try(uuidSchema, Joi.valid(null)).optional(),
    metadata: Joi.object().unknown(true).optional(),
  }),
};

/** Update */
export const updateAddressComponentSchema = {
  params: Joi.object({
    id: uuidSchema.required().messages({ 'any.required': 'id is required.' }),
  }),
  body: Joi.object({
    type: name64.optional(),
    value: value256.optional(),
    parentId: Joi.alternatives().try(uuidSchema, Joi.valid(null)).optional(),
    metadata: Joi.object().unknown(true).optional(),
  }),
};

/** Get by ID */
export const getAddressComponentByIdSchema = {
  params: Joi.object({
    id: uuidSchema.required().messages({ 'any.required': 'id is required.' }),
  }),
};

/** Get by (type, value) via query */
export const getByTypeAndValueSchema = {
  query: Joi.object({
    type: name64.required().messages({ 'any.required': '"type" is required.' }),
    value: value256.required().messages({ 'any.required': '"value" is required.' }),
  }),
};

/** List by types */
export const listByTypesSchema = {
  query: Joi.object({
    types: Joi.array()
      .min(1)
      .items(name64.required())
      .required()
      .messages({
        'array.min': '"types" must contain at least one item.',
        'any.required': '"types" is required.',
      }),
  }),
};

/** Get components for a location */
export const getForLocationSchema = {
  params: Joi.object({
    locationId: uuidSchema.required().messages({ 'any.required': 'locationId is required.' }),
  }),
};

/** Search + pagination */
export const searchPaginatedSchema = {
  query: Joi.object({
    q: Joi.string().trim().optional(),
    type: strOrStrArray.optional(),
    // allow 'null' string for convenience (controller normalizes)
    parentId: Joi.alternatives().try(uuidSchema, Joi.string().valid('null')).optional(),
    page: posInt.optional(),
    limit: limitInt.optional(),
  }),
};

/** Delete */
export const deleteAddressComponentSchema = {
  params: Joi.object({
    id: uuidSchema.required().messages({ 'any.required': 'id is required.' }),
  }),
};

/** Bulk delete */
export const bulkDeleteAddressComponentsSchema = {
  body: Joi.object({
    ids: Joi.array()
      .min(1)
      .items(uuidSchema.required())
      .required()
      .messages({
        'array.min': '"ids" must contain at least one item.',
        'any.required': '"ids" is required.',
      }),
  }),
};

/** Move (change parent) */
export const moveAddressComponentSchema = {
  params: Joi.object({
    id: uuidSchema.required().messages({ 'any.required': 'id is required.' }),
  }),
  body: Joi.object({
    newParentId: Joi.alternatives().try(uuidSchema, Joi.valid(null)).required().messages({
      'any.required': 'newParentId is required (use null for root).',
    }),
  }),
};

/** Hierarchy reads */
export const getChildrenSchema = getAddressComponentByIdSchema;
export const getAncestorsSchema = getAddressComponentByIdSchema;
export const getDescendantsSchema = getAddressComponentByIdSchema;

/** Upsert single by (type, value, parent) */
export const upsertByTypeValueParentSchema = {
  body: Joi.object({
    type: name64.required().messages({ 'any.required': '"type" is required.' }),
    value: value256.required().messages({ 'any.required': '"value" is required.' }),
    parentId: Joi.alternatives().try(uuidSchema, Joi.valid(null)).optional(),
    metadata: Joi.object().unknown(true).optional(),
  }),
};

/** Bulk upsert */
export const bulkUpsertAddressComponentsSchema = {
  body: Joi.object({
    rows: Joi.array()
      .min(1)
      .items(
        Joi.object({
          type: name64.required().messages({ 'any.required': '"type" is required.' }),
          value: value256.required().messages({ 'any.required': '"value" is required.' }),
          parentId: Joi.alternatives().try(uuidSchema, Joi.valid(null)).optional(),
          metadata: Joi.object().unknown(true).optional(),
        })
      )
      .required()
      .messages({
        'array.min': '"rows" must contain at least one item.',
        'any.required': '"rows" is required.',
      }),
  }),
};

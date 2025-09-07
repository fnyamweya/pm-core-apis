import Joi from 'joi';

// Common reusable validation rules
const idSchema = Joi.string().max(50).messages({
  'string.max': 'ID must not exceed 50 characters.',
});
const nameSchema = Joi.string().max(100).messages({
  'string.max': 'Name must not exceed 100 characters.',
});
const descriptionSchema = Joi.string().max(500).messages({
  'string.max': 'Description must not exceed 500 characters.',
});
const isActiveSchema = Joi.boolean().messages({
  'boolean.base': 'IsActive must be a boolean value.',
});
const configSchema = Joi.object().messages({
  'object.base': 'Config must be a valid JSON object.',
});
const metadataSchema = Joi.object().messages({
  'object.base': 'Metadata must be a valid JSON object.',
});

// Create Organization Schema
export const createOrganizationSchema = {
  body: Joi.object().keys({
    name: nameSchema.required().messages({
      'any.required': 'Name is required.',
    }),
    description: descriptionSchema.optional(),
    isActive: isActiveSchema.default(true),
    typeId: idSchema.optional(),
    config: configSchema.optional(),
    metadata: metadataSchema.optional(),
  }),
};

// Update Organization Schema
export const updateOrganizationSchema = {
  params: Joi.object().keys({
    id: idSchema.required().messages({
      'any.required': 'Organization ID is required.',
    }),
  }),
  body: Joi.object().keys({
    name: nameSchema,
    description: descriptionSchema,
    isActive: isActiveSchema,
    config: configSchema,
    metadata: metadataSchema,
  }),
};

// Get Organization by ID Schema
export const getOrganizationByIdSchema = {
  params: Joi.object().keys({
    id: idSchema.required().messages({
      'any.required': 'Organization ID is required.',
    }),
  }),
};

// Delete Organization Schema
export const deleteOrganizationSchema = {
  params: Joi.object().keys({
    id: idSchema.required().messages({
      'any.required': 'Organization ID is required.',
    }),
  }),
};

// Soft Delete Organization Schema
export const softDeleteOrganizationSchema = {
  params: Joi.object().keys({
    id: idSchema.required().messages({
      'any.required': 'Organization ID is required.',
    }),
  }),
};

// Restore Organization Schema
export const restoreOrganizationSchema = {
  params: Joi.object().keys({
    id: idSchema.required().messages({
      'any.required': 'Organization ID is required.',
    }),
  }),
};

// Get Organization with Relations Schema
export const getOrganizationWithRelationsSchema = {
  params: Joi.object().keys({
    id: idSchema.required().messages({
      'any.required': 'Organization ID is required.',
    }),
  }),
};

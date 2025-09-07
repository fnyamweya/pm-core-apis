import Joi from 'joi';

// Common reusable validation rules
const idSchema = Joi.string().max(100).messages({
  'string.max': 'ID must not exceed 100 characters.',
});
const nameSchema = Joi.string().max(50).messages({
  'string.max': 'Name must not exceed 50 characters.',
});
const descriptionSchema = Joi.string().max(500).messages({
  'string.max': 'Description must not exceed 500 characters.',
});
const isActiveSchema = Joi.boolean().messages({
  'boolean.base': 'IsActive must be a boolean value.',
});

// Create OrganizationType Schema
export const createOrganizationTypeSchema = {
  body: Joi.object().keys({
    name: nameSchema.required().messages({
      'any.required': 'Name is required.',
    }),
    description: descriptionSchema.optional(),
    isActive: isActiveSchema.default(true),
  }),
};

// Update OrganizationType Schema
export const updateOrganizationTypeSchema = {
  params: Joi.object().keys({
    id: idSchema.required().messages({
      'any.required': 'Organization Type ID is required.',
    }),
  }),
  body: Joi.object().keys({
    name: nameSchema,
    description: descriptionSchema,
    isActive: isActiveSchema,
  }),
};

// Get OrganizationType by ID Schema
export const getOrganizationTypeByIdSchema = {
  params: Joi.object().keys({
    id: idSchema.required().messages({
      'any.required': 'Organization Type ID is required.',
    }),
  }),
};

// Get OrganizationType by Name Schema
export const getOrganizationTypeByNameSchema = {
  query: Joi.object().keys({
    name: nameSchema.required().messages({
      'any.required': 'Name is required.',
    }),
  }),
};

// Delete OrganizationType Schema
export const deleteOrganizationTypeSchema = {
  params: Joi.object().keys({
    id: idSchema.required().messages({
      'any.required': 'Organization Type ID is required.',
    }),
  }),
};

import Joi from 'joi';

// Common validation rules
const nameSchema = Joi.string().max(128).required().messages({
  'string.base': 'Name must be a string.',
  'string.max': 'Name must not exceed 128 characters.',
  'any.required': 'Name is required.',
});

const descriptionSchema = Joi.string().max(256).optional().messages({
  'string.base': 'Description must be a string.',
  'string.max': 'Description must not exceed 256 characters.',
});

// Validation schemas
export const createRoleSchema = {
  body: Joi.object().keys({
    name: nameSchema,
    description: descriptionSchema,
  }),
};

export const updateRoleSchema = {
  params: Joi.object().keys({
    roleId: Joi.string().uuid().required().messages({
      'string.base': 'Role ID must be a string.',
      'string.uuid': 'Role ID must be a valid UUID.',
      'any.required': 'Role ID is required.',
    }),
  }),
  body: Joi.object().keys({
    name: nameSchema.optional(),
    description: descriptionSchema.optional(),
    isActive: Joi.boolean().optional().messages({
      'boolean.base': 'isActive must be a boolean.',
    }),
  }),
};

export const getRoleSchema = {
  params: Joi.object().keys({
    roleId: Joi.string().uuid().required().messages({
      'string.base': 'Role ID must be a string.',
      'string.uuid': 'Role ID must be a valid UUID.',
      'any.required': 'Role ID is required.',
    }),
  }),
};

export const deleteRoleSchema = {
  params: Joi.object().keys({
    roleId: Joi.string().uuid().required().messages({
      'string.base': 'Role ID must be a string.',
      'string.uuid': 'Role ID must be a valid UUID.',
      'any.required': 'Role ID is required.',
    }),
  }),
};

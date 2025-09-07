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

const categorySchema = Joi.string().max(128).optional().messages({
  'string.base': 'Category must be a string.',
  'string.max': 'Category must not exceed 128 characters.',
});

// Validation schemas
export const createPermissionSchema = {
  body: Joi.object().keys({
    name: nameSchema,
    description: descriptionSchema,
    category: categorySchema,
  }),
};

export const updatePermissionSchema = {
  params: Joi.object().keys({
    permissionId: Joi.string().uuid().required().messages({
      'string.base': 'Permission ID must be a string.',
      'string.uuid': 'Permission ID must be a valid UUID.',
      'any.required': 'Permission ID is required.',
    }),
  }),
  body: Joi.object().keys({
    name: nameSchema.optional(),
    description: descriptionSchema.optional(),
    category: categorySchema.optional(),
    isActive: Joi.boolean().optional().messages({
      'boolean.base': 'isActive must be a boolean.',
    }),
  }),
};

export const getPermissionSchema = {
  params: Joi.object().keys({
    permissionId: Joi.string().uuid().required().messages({
      'string.base': 'Permission ID must be a string.',
      'string.uuid': 'Permission ID must be a valid UUID.',
      'any.required': 'Permission ID is required.',
    }),
  }),
};

export const deletePermissionSchema = {
  params: Joi.object().keys({
    permissionId: Joi.string().uuid().required().messages({
      'string.base': 'Permission ID must be a string.',
      'string.uuid': 'Permission ID must be a valid UUID.',
      'any.required': 'Permission ID is required.',
    }),
  }),
};

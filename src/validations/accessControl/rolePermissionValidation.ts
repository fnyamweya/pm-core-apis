import Joi from 'joi';

// Common validation rules
const idSchema = Joi.string().uuid().required().messages({
  'string.base': 'ID must be a string.',
  'string.uuid': 'ID must be a valid UUID.',
  'any.required': 'ID is required.',
});

// Validation schemas
export const createRolePermissionSchema = {
  body: Joi.object().keys({
    roleId: idSchema,
    permissionId: idSchema,
  }),
};

export const getRolePermissionSchema = {
  params: Joi.object().keys({
    roleId: idSchema,
    permissionId: idSchema,
  }),
};

export const deleteRolePermissionSchema = {
  params: Joi.object().keys({
    roleId: idSchema,
    permissionId: idSchema,
  }),
};

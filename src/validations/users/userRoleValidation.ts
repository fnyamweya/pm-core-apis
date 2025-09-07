import Joi from 'joi';

export const assignRoleSchema = {
  params: Joi.object().keys({
    userId: Joi.string().uuid().required().messages({
      'string.base': 'userId must be a string.',
      'string.uuid': 'userId must be a valid UUID.',
      'any.required': 'userId is required.',
    }),
  }),
  body: Joi.object().keys({
    roleId: Joi.string().required().messages({
      'string.base': 'roleId must be a string.',
      'any.required': 'roleId is required.',
    }),
    assignedBy: Joi.string().optional().messages({
      'string.base': 'assignedBy must be a string.',
    }),
    expiresAt: Joi.date().optional().messages({
      'date.base': 'expiresAt must be a date.',
    }),
    notes: Joi.string().optional().messages({
      'string.base': 'notes must be a string.',
    }),
  }),
};

export const removeRoleSchema = {
  params: Joi.object().keys({
    userId: Joi.string().uuid().required().messages({
      'string.base': 'userId must be a string.',
      'string.uuid': 'userId must be a valid UUID.',
      'any.required': 'userId is required.',
    }),
    roleId: Joi.string().required().messages({
      'string.base': 'roleId must be a string.',
      'any.required': 'roleId is required.',
    }),
  }),
};

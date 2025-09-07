import Joi from 'joi';
import { ClientAppStatus } from '../../constants/clientApps/clientAppConstants';

// Common reusable validation rules
const nameSchema = Joi.string().max(128).messages({
  'string.max': 'Name must not exceed 128 characters.',
});
const appIdSchema = Joi.string().max(50).messages({
  'string.max': 'App ID must not exceed 50 characters.',
});
const appSecretSchema = Joi.string().max(255).messages({
  'string.max': 'App Secret must not exceed 255 characters.',
});
const statusSchema = Joi.string()
  .valid(...Object.values(ClientAppStatus))
  .messages({
    'any.only': `Status must be one of ${Object.values(ClientAppStatus).join(', ')}.`,
  });

// Create Client Application Schema
export const createClientAppSchema = {
  body: Joi.object().keys({
    name: nameSchema.required().messages({
      'any.required': 'Name is required.',
    }),
    status: statusSchema.default(ClientAppStatus.PENDING),
  }),
};

// Update Client Application Schema
export const updateClientAppSchema = {
  params: Joi.object().keys({
    appId: appIdSchema.required().messages({
      'any.required': 'App ID is required.',
    }),
  }),
  body: Joi.object().keys({
    name: nameSchema,
    status: statusSchema,
  }),
};

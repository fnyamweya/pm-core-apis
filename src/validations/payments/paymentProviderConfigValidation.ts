import Joi from 'joi';

export const createPaymentProviderConfigSchema = {
  params: Joi.object().keys({
    providerCode: Joi.string().max(128).required().messages({
      'any.required':
        'The provider code is required. Please provide a valid provider code.',
      'string.empty': 'The provider code cannot be empty.',
      'string.max': 'The provider code must be at most 128 characters long.',
    }),
  }),
  body: Joi.object().keys({
    key: Joi.string().max(128).required().messages({
      'any.required': 'The key is required. Please provide a valid key.',
      'string.empty': 'The key cannot be empty.',
      'string.max': 'The key must be at most 128 characters long.',
    }),
    value: Joi.any().required().messages({
      'any.required': 'The value is required. Please provide a valid value.',
    }),
    metadata: Joi.object().optional(),
  }),
};

export const updatePaymentProviderConfigSchema = {
  params: Joi.object().keys({
    providerCode: Joi.string().max(128).required().messages({
      'any.required':
        'The provider code is required. Please provide a valid provider code.',
      'string.empty': 'The provider code cannot be empty.',
      'string.max': 'The provider code must be at most 128 characters long.',
    }),
    key: Joi.string().max(128).required().messages({
      'any.required': 'The key is required. Please provide a valid key.',
      'string.empty': 'The key cannot be empty.',
      'string.max': 'The key must be at most 128 characters long.',
    }),
  }),
  body: Joi.object().keys({
    value: Joi.any().required().messages({
      'any.required': 'The value is required. Please provide a valid value.',
    }),
    metadata: Joi.object().optional(),
  }),
};

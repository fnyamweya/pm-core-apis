import Joi from 'joi';

export const createPaymentProviderSchema = {
  body: Joi.object().keys({
    paymentProviderCode: Joi.string().max(128).required().messages({
      'any.required':
        'The payment provider code is required. Please provide a valid payment provider code.',
      'string.empty': 'The payment provider code cannot be empty.',
      'string.max':
        'The payment provider code must be at most 128 characters long.',
    }),
    name: Joi.string().max(128).required().messages({
      'any.required': 'The name is required. Please provide a valid name.',
      'string.empty': 'The name cannot be empty.',
      'string.max': 'The name must be at most 128 characters long.',
    }),
    metadata: Joi.object().optional(),
  }),
};

export const updatePaymentProviderSchema = {
  params: Joi.object().keys({
    code: Joi.string().max(128).required().messages({
      'any.required': 'The code is required. Please provide a valid code.',
      'string.empty': 'The code cannot be empty.',
      'string.max': 'The code must be at most 128 characters long.',
    }),
  }),
  body: Joi.object().keys({
    name: Joi.string().max(128).optional().messages({
      'string.empty': 'The name cannot be empty.',
      'string.max': 'The name must be at most 128 characters long.',
    }),
    metadata: Joi.object().optional(),
  }),
};

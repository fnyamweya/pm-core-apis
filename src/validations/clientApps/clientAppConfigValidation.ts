import Joi from 'joi';

// Common reusable validation rules
const redirectUrisSchema = Joi.array().items(Joi.string().uri()).messages({
  'array.base': 'Redirect URIs must be an array.',
  'string.uri': 'Each Redirect URI must be a valid URI.',
});

const grantTypesSchema = Joi.array().items(Joi.string()).messages({
  'array.base': 'Grant Types must be an array of strings.',
});

const scopesSchema = Joi.array().items(Joi.string()).messages({
  'array.base': 'Scopes must be an array of strings.',
});

const expirySchema = Joi.number().min(0).messages({
  'number.min': 'Expiry must be a positive number.',
});

const booleanSchema = Joi.boolean().messages({
  'boolean.base': 'This field must be a boolean value.',
});

const tokenAlgorithmSchema = Joi.string()
  .valid('HS256', 'RS256', 'ES256') // Extend with other valid algorithms if needed
  .messages({
    'any.only': 'Token Algorithm must be one of HS256, RS256, or ES256.',
    'string.base': 'Token Algorithm must be a string.',
  });

const stringOptionalSchema = Joi.string().allow(null).messages({
  'string.base': 'This field must be a string.',
});

const metadataSchema = Joi.object().pattern(Joi.string(), Joi.any()).messages({
  'object.base': 'Metadata must be an object.',
});

// Validation schema for `req.body`
export const createApplicationConfigSchema = {
  params: Joi.object().keys({
    appId: Joi.string().required().messages({
      'any.required': 'Application ID is required.',
      'string.base': 'Application ID must be a string.',
    }),
  }),
  body: Joi.object().keys({
    redirectUris: redirectUrisSchema.required().messages({
      'any.required': 'Redirect URIs are required.',
    }),
    grantTypes: grantTypesSchema.required().messages({
      'any.required': 'Grant Types are required.',
    }),
    scopes: scopesSchema.required().messages({
      'any.required': 'Scopes are required.',
    }),
    accessTokenExpiry: expirySchema.required().messages({
      'any.required': 'Access Token Expiry is required.',
    }),
    refreshTokenExpiry: expirySchema.required().messages({
      'any.required': 'Refresh Token Expiry is required.',
    }),
    pkceRequired: booleanSchema.optional(),
    tokenAlgorithm: tokenAlgorithmSchema.optional(),
    tokenIssuer: stringOptionalSchema.when('tokenAlgorithm', {
      is: Joi.valid('RS256', 'ES256'),
      then: Joi.required().messages({
        'any.required':
          'Token Issuer is required when Token Algorithm is RS256 or ES256.',
      }),
    }),
    tokenAudience: stringOptionalSchema.optional(),
    metadata: metadataSchema.optional(),
  }),
};

// Update Application Config Schema
export const updateApplicationConfigSchema = {
  params: Joi.object().keys({
    appId: Joi.string().required().messages({
      'any.required': 'App ID is required.',
    }),
  }),
  body: Joi.object().keys({
    redirectUris: redirectUrisSchema,
    grantTypes: grantTypesSchema,
    scopes: scopesSchema,
    accessTokenExpiry: expirySchema,
    refreshTokenExpiry: expirySchema,
    pkceRequired: booleanSchema,
    tokenAlgorithm: tokenAlgorithmSchema,
    tokenIssuer: stringOptionalSchema.when('tokenAlgorithm', {
      is: Joi.valid('RS256', 'ES256'),
      then: Joi.required().messages({
        'any.required':
          'Token Issuer is required when Token Algorithm is RS256 or ES256.',
      }),
    }),
    tokenAudience: stringOptionalSchema,
    metadata: metadataSchema,
  }),
};

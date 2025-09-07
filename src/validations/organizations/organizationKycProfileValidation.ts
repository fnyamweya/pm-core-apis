import Joi from 'joi';

// Common reusable validation rules
const idSchema = Joi.string().uuid().messages({
  'string.uuid': 'ID must be a valid UUID.',
});
const organizationIdSchema = Joi.string().max(50).messages({
  'string.max': 'Organization ID must not exceed 50 characters.',
});
const kycProfileIdSchema = Joi.string().uuid().messages({
  'string.uuid': 'KYC Profile ID must be a valid UUID.',
});
const kycAttributeSchema = Joi.object().keys({
  id: idSchema.optional(),
  key: Joi.string().required().messages({
    'any.required': 'Key is required.',
  }),
  value: Joi.string().required().messages({
    'any.required': 'Value is required.',
  }),
});

// Create Organization KYC Profile Schema
export const createOrganizationKycProfileSchema = {
  body: Joi.object().keys({
    organization: organizationIdSchema.required().messages({
      'any.required': 'Organization ID is required.',
    }),
    kycAttributes: Joi.array().items(kycAttributeSchema).optional(),
  }),
};

// Update Organization KYC Profile Schema
export const updateOrganizationKycProfileSchema = {
  params: Joi.object().keys({
    id: idSchema.required().messages({
      'any.required': 'Organization KYC Profile ID is required.',
    }),
  }),
  body: Joi.object().keys({
    organization: organizationIdSchema.optional(),
    kycAttributes: Joi.array().items(kycAttributeSchema).optional(),
  }),
};

// Get Organization KYC Profile by ID Schema
export const getOrganizationKycProfileByIdSchema = {
  params: Joi.object().keys({
    id: idSchema.required().messages({
      'any.required': 'Organization ID is required.',
    }),
    kycProfileId: kycProfileIdSchema.required().messages({
      'any.required': 'KYC Profile ID is required.',
    }),
  }),
};

// Get Organization KYC Profiles by Organization ID Schema
export const getOrganizationKycProfilesByOrganizationIdSchema = {
  params: Joi.object().keys({
    organizationId: organizationIdSchema.required().messages({
      'any.required': 'Organization ID is required.',
    }),
  }),
};

// Delete Organization KYC Profile Schema
export const deleteOrganizationKycProfileSchema = {
  params: Joi.object().keys({
    id: idSchema.required().messages({
      'any.required': 'Organization KYC Profile ID is required.',
    }),
  }),
};

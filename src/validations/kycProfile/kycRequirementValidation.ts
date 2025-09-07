import Joi from 'joi';
import { KycDataType } from '../../entities/kycProfile/kycRequirementEntity';

// Common reusable validation rules
const nameSchema = Joi.string().max(100).required().messages({
  'string.base': 'Name must be a string.',
  'string.max': 'Name must not exceed 100 characters.',
  'any.required': 'Name is required.',
});

const descriptionSchema = Joi.string().max(500).optional().messages({
  'string.base': 'Description must be a string.',
  'string.max': 'Description must not exceed 500 characters.',
});

const dataTypeSchema = Joi.string()
  .valid(...Object.values(KycDataType))
  .required()
  .messages({
    'any.required': 'Data type is required.',
    'any.only':
      'Data type must be one of string, number, boolean, date, or json.',
  });

const roleIdSchema = Joi.string().max(50).optional().messages({
  'string.max': 'Role ID must be at most 50 characters long.',
});

const organizationTypeIdSchema = Joi.string().max(50).optional().messages({
  'string.max': 'Organization Type ID must be at most 50 characters long.',
});

const requiredSchema = Joi.boolean().optional().messages({
  'boolean.base': 'Required must be a boolean.',
});

// Validation schemas
export const createKycRequirementSchema = {
  body: Joi.object().keys({
    name: nameSchema,
    description: descriptionSchema,
    dataType: dataTypeSchema,
    isRequired: requiredSchema.default(true),
    roleId: roleIdSchema,
    organizationTypeId: organizationTypeIdSchema,
  }),
};

export const updateKycRequirementSchema = {
  params: Joi.object().keys({
    id: Joi.string().uuid().required().messages({
      'string.uuid': 'Requirement ID must be a valid UUID.',
      'any.required': 'Requirement ID is required.',
    }),
  }),
  body: Joi.object().keys({
    name: nameSchema.optional(),
    description: descriptionSchema,
    dataType: dataTypeSchema.optional(),
    isRequired: requiredSchema,
    roleId: roleIdSchema,
    organizationTypeId: organizationTypeIdSchema,
  }),
};

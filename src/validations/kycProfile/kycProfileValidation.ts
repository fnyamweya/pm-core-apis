import Joi from 'joi';
import {
  KycProfileStatus,
  KycProfileType,
} from '../../entities/kycProfile/kycProfileEntity';
import { KycRequirement } from '../../entities/kycProfile/kycRequirementEntity';
import { Organization } from '../../entities/organizations/organizationEntity';
import { UserEntity } from '../../entities/users/userEntity';

// Common reusable validation rules
const typeSchema = Joi.string()
  .valid(...Object.values(KycProfileType))
  .required()
  .messages({
    'any.required': 'Type is required.',
    'any.only': 'Type must be either USER or ORGANIZATION.',
  });

const userIdSchema = Joi.object<UserEntity>().optional().messages({
  'object.base': 'User must be a valid object.',
});

const organizationIdSchema = Joi.object<Organization>().optional().messages({
  'object.base': 'Organization must be a valid object.',
});

const requirementSchema = Joi.object<KycRequirement>().required().messages({
  'object.base': 'Requirement must be a valid object.',
  'any.required': 'Requirement is required.',
});

const valueSchema = Joi.alternatives()
  .try(Joi.string(), Joi.number(), Joi.boolean(), Joi.object())
  .optional()
  .messages({
    'alternatives.types':
      'Value must be a string, number, boolean, or JSON object.',
  });

const statusSchema = Joi.string()
  .valid(...Object.values(KycProfileStatus))
  .default(KycProfileStatus.PENDING)
  .messages({
    'any.only': 'Status must be one of PENDING, APPROVED, or REJECTED.',
  });

const notesSchema = Joi.string().max(500).optional().messages({
  'string.base': 'Notes must be a string.',
  'string.max': 'Notes must not exceed 500 characters.',
});

// Validation schemas
export const createKycProfileSchema = {
  body: Joi.object().keys({
    type: typeSchema,
    requirement: requirementSchema,
    value: valueSchema,
    status: statusSchema,
    user: userIdSchema.when('type', {
      is: KycProfileType.USER,
      then: Joi.required().messages({
        'any.required': 'User is required when type is USER.',
      }),
    }),
    organization: organizationIdSchema.when('type', {
      is: KycProfileType.ORGANIZATION,
      then: Joi.required().messages({
        'any.required': 'Organization is required when type is ORGANIZATION.',
      }),
    }),
    notes: notesSchema,
  }),
};

export const updateKycProfileSchema = {
  params: Joi.object().keys({
    id: Joi.string().uuid().required().messages({
      'string.uuid': 'Profile ID must be a valid UUID.',
      'any.required': 'Profile ID is required.',
    }),
  }),
  body: Joi.object().keys({
    type: typeSchema.optional(),
    requirement: requirementSchema.optional(),
    value: valueSchema,
    status: statusSchema,
    user: userIdSchema.optional(),
    organization: organizationIdSchema.optional(),
    notes: notesSchema,
  }),
};

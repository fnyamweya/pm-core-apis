import Joi from 'joi';
import { UserStatus } from '../../constants/users';
import { formatPhoneNumber } from '../../utils/phoneNumber';

// Custom validation for phone numbers
const phoneSchema = Joi.string()
  .custom((value, helpers) => {
    const formattedPhone = formatPhoneNumber(value);
    if (!formattedPhone) {
      return helpers.error('string.invalid', {
        message: 'Invalid phone number format.',
      });
    }
    return formattedPhone;
  })
  .messages({
    'string.invalid': 'Phone number must be valid and include a valid prefix.',
  });

// Common reusable validation rules
const nameSchema = Joi.string().max(128).messages({
  'string.max': 'Name must not exceed 128 characters.',
});
const emailSchema = Joi.string().email().max(128).messages({
  'string.email': 'Email must be a valid email address.',
  'string.max': 'Email must not exceed 128 characters.',
});
const userIdSchema = Joi.string()
  .uuid()
  .messages({ 'string.uuid': 'User ID must be a valid UUID.' });
const statusSchema = Joi.string()
  .valid(...Object.values(UserStatus))
  .messages({
    'any.only': `Status must be one of ${Object.values(UserStatus).join(', ')}.`,
  });
const credentialSchema = Joi.string().min(6).messages({
  'string.min': 'Credential must be at least 6 characters.',
});

const credentialTypeSchema = Joi.string().valid('PASSWORD', 'PIN').messages({
  'any.only': 'Credential type must be either PASSWORD or PIN.',
});

const algorithmSchema = Joi.string().valid('BCRYPT', 'ARGON2').messages({
  'any.only': 'Algorithm must be either BCRYPT or ARGON2.',
});

// Register User Schema
export const registerUserSchema = {
  body: Joi.object().keys({
    firstName: nameSchema.required().messages({
      'any.required': 'First name is required.',
    }),
    lastName: nameSchema.required().messages({
      'any.required': 'Last name is required.',
    }),
    email: emailSchema.required().messages({
      'any.required': 'Email is required.',
    }),
    phone: phoneSchema.required().messages({
      'any.required': 'Phone number is required.',
    }),
    status: statusSchema.default(UserStatus.PENDING_VERIFICATION),
    credential: credentialSchema.optional(),
    credentialType: credentialTypeSchema.optional(),
    algorithm: algorithmSchema.optional(),
  }),
};

// Create User Schema
export const createUserSchema = {
  body: Joi.object().keys({
    firstName: nameSchema.required().messages({
      'any.required': 'First name is required.',
    }),
    lastName: nameSchema.required().messages({
      'any.required': 'Last name is required.',
    }),
    email: emailSchema.required().messages({
      'any.required': 'Email is required.',
    }),
    phone: phoneSchema.required().messages({
      'any.required': 'Phone number is required.',
    }),
    status: statusSchema.default(UserStatus.PENDING_VERIFICATION),
    credential: credentialSchema.required().messages({
      'any.required': 'Credential is required.'
    }),
    credentialType: credentialTypeSchema.optional(),
    algorithm: algorithmSchema.optional(),
  }),
};

// Update User Schema
export const updateUserSchema = {
  params: Joi.object().keys({
    userId: userIdSchema.required().messages({
      'any.required': 'User ID is required.',
    }),
  }),
  body: Joi.object().keys({
    firstName: nameSchema,
    lastName: nameSchema,
    email: emailSchema,
    phone: phoneSchema,
    status: statusSchema,
  }),
};

// Verify User Schema
export const verifyUserSchema = {
  params: Joi.object().keys({
    userId: userIdSchema.required().messages({
      'any.required': 'User ID is required.',
    }),
  }),
  body: Joi.object().keys({
    code: Joi.string().length(6).required().messages({
      'string.length': 'Verification code must be exactly 6 characters.',
      'any.required': 'Verification code is required.',
    }),
  }),
};

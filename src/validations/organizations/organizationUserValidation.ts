import Joi from 'joi';
import { OrganizationUserRole } from '../../entities/organizations/organizationUserEntity';

const uuid = Joi.string().uuid({ version: 'uuidv4' }).messages({
  'string.guid': 'Must be a valid UUID',
});

const rolesArray = Joi.array()
  .items(Joi.string().valid(...Object.values(OrganizationUserRole)))
  .min(1)
  .messages({ 'any.only': 'Invalid role provided' });

export const addUserToOrgWithRolesSchema = {
  params: Joi.object({
    organizationId: uuid.required(),
  }),
  body: Joi.object({
    userId: uuid.required(),
    roles: rolesArray.optional(),
    status: Joi.string().max(64).optional(),
  }),
};

export const getMembershipSchema = {
  params: Joi.object({
    organizationId: uuid.required(),
    userId: uuid.required(),
  }),
};

export const updateStatusSchema = {
  params: Joi.object({
    organizationId: uuid.required(),
    userId: uuid.required(),
  }),
  body: Joi.object({
    status: Joi.string().max(64).required(),
  }),
};

export const replaceRolesSchema = {
  params: Joi.object({
    organizationId: uuid.required(),
    userId: uuid.required(),
  }),
  body: Joi.object({
    roles: rolesArray.required(),
  }),
};

export const removeRolesSchema = {
  params: Joi.object({
    organizationId: uuid.required(),
    userId: uuid.required(),
  }),
  body: Joi.object({
    roles: rolesArray.required(),
  }),
};

export const orgUserIdSchema = {
  params: Joi.object({
    id: uuid.required(),
  }),
};


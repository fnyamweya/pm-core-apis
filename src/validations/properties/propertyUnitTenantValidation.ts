import Joi from 'joi';
import { UnitTenantStatus } from '../../entities/properties/propertyUnitTenantEntity';

const uuid = Joi.string().uuid({ version: 'uuidv4' }).messages({ 'string.guid': 'Must be a valid UUID' });

export const createTenantSchema = {
  params: Joi.object({
    propertyId: uuid.required(),
    unitId: uuid.required(),
  }),
  body: Joi.object({
    userId: uuid.required(),
    status: Joi.string()
      .valid(...Object.values(UnitTenantStatus))
      .required(),
    kyc: Joi.object().optional(),
  }),
};

export const createTenantWithUserSchema = {
  params: Joi.object({
    propertyId: uuid.required(),
    unitId: uuid.required(),
  }),
  body: Joi.object({
    user: Joi.object({
      firstName: Joi.string().min(1).required(),
      lastName: Joi.string().allow('', null),
      email: Joi.string().email().optional(),
      phone: Joi.string().min(7).required(),
    }).required(),
    password: Joi.string().min(6).optional(),
    credentialExpiry: Joi.date().optional(),
  }),
};

export const updateTenantSchema = {
  params: Joi.object({
    propertyId: uuid.required(),
    unitId: uuid.required(),
    id: uuid.required(),
  }),
  body: Joi.object({
    status: Joi.string().valid(...Object.values(UnitTenantStatus)).optional(),
    kyc: Joi.object().optional(),
  }),
};

export const getTenantsByStatusSchema = {
  params: Joi.object({
    propertyId: uuid.required(),
    status: Joi.string().valid(...Object.values(UnitTenantStatus)).required(),
  }),
};

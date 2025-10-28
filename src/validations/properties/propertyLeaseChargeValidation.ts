import Joi from 'joi';
import { LeaseChargeFrequency } from '../../entities/properties/propertyLeaseChargeEntity';

const uuid = Joi.string().uuid({ version: 'uuidv4' }).messages({ 'string.guid': 'Must be a valid UUID' });

const frequencies = Object.values(LeaseChargeFrequency);

export const createLeaseChargeSchema = {
  params: Joi.object({ propertyId: uuid.required(), unitId: uuid.required(), leaseId: uuid.required() }),
  body: Joi.object({
    leaseId: uuid.optional(), // will be overridden from params
    chargeType: Joi.string().max(64).required(),
    label: Joi.string().max(128).optional(),
    amount: Joi.number().positive().required(),
    frequency: Joi.string().valid(...frequencies).required(),
    isActive: Joi.boolean().optional(),
  })
};

export const updateLeaseChargeSchema = {
  params: Joi.object({ propertyId: uuid.required(), unitId: uuid.required(), leaseId: uuid.required(), chargeId: uuid.required() }),
  body: Joi.object({
    chargeType: Joi.string().max(64).optional(),
    label: Joi.string().max(128).optional(),
    amount: Joi.number().positive().optional(),
    frequency: Joi.string().valid(...frequencies).optional(),
    isActive: Joi.boolean().optional(),
  })
};

export const getTenantDueChargesSchema = {
  params: Joi.object({ tenantId: uuid.required() }),
  query: Joi.object({
    from: Joi.date().optional(),
    to: Joi.date().optional(),
    asOf: Joi.date().optional(), // alias for to
    leaseId: uuid.optional(),
    chargeType: Joi.string().optional(),
  }).with('from', 'to'),
};

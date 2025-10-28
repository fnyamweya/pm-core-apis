import Joi from 'joi';

const uuid = Joi.string().uuid({ version: 'uuidv4' }).messages({ 'string.guid': 'Must be a valid UUID' });

export const generatePaymentCyclesSchema = {
  params: Joi.object({
    leaseId: uuid.required(),
  }),
  body: Joi.object({
    asOf: Joi.date().optional(),
    horizon: Joi.number().integer().min(0).max(12).optional(),
  }).default({}),
};

export const listLeaseDueCyclesSchema = {
  params: Joi.object({ leaseId: uuid.required() }),
  query: Joi.object({
    asOf: Joi.date().optional(),
  }).default({}),
};

export const listTenantDueCyclesSchema = {
  params: Joi.object({ tenantId: uuid.required() }),
  query: Joi.object({
    asOf: Joi.date().optional(),
  }).default({}),
};

export const applyCyclePaymentSchema = {
  params: Joi.object({ cycleId: uuid.required() }),
  body: Joi.object({
    amount: Joi.number().positive().required(),
    paidAt: Joi.date().required(),
  }),
};

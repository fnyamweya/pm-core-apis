import Joi from 'joi';

const uuid = Joi.string().uuid({ version: 'uuidv4' }).messages({ 'string.guid': 'Must be a valid UUID' });

export const createPaymentSchema = {
  params: Joi.object({ propertyId: uuid.required(), unitId: uuid.required(), leaseId: uuid.required() }),
  body: Joi.object({
    tenantId: uuid.required(),
    amount: Joi.number().positive().required(),
    paidAt: Joi.date().required(),
    typeCode: Joi.string().max(64).required(),
    metadata: Joi.object().optional(),
  }),
};

export const updatePaymentSchema = {
  params: Joi.object({ propertyId: uuid.required(), unitId: uuid.required(), leaseId: uuid.required(), id: uuid.required() }),
  body: Joi.object({
    amount: Joi.number().positive().optional(),
    paidAt: Joi.date().optional(),
    metadata: Joi.object().optional(),
  }),
};

export const getPaymentsInDateRangeSchema = {
  params: Joi.object({ propertyId: uuid.required(), unitId: uuid.required(), leaseId: uuid.required() }),
  query: Joi.object({
    start: Joi.date().required(),
    end: Joi.date().required(),
  }),
};

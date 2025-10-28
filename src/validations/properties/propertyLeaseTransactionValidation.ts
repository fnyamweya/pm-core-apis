import Joi from 'joi';

const uuid = Joi.string().uuid({ version: 'uuidv4' }).messages({ 'string.guid': 'Must be a valid UUID' });

export const createLeaseTransactionSchema = {
  params: Joi.object({ propertyId: uuid.required(), unitId: uuid.required(), leaseId: uuid.required() }),
  body: Joi.object({
    tenantId: uuid.required(),
    amount: Joi.number().positive().required(),
    paidAt: Joi.date().optional(),
    typeCode: Joi.string().max(64).required(),
    currency: Joi.string().length(3).optional(),
    paymentMethodCode: Joi.string().optional(),
    allocations: Joi.array().items(
      Joi.object({
        chargeId: uuid.required(),
        amount: Joi.number().positive().required(),
        appliesToDate: Joi.date().optional(),
      })
    ).optional(),
    metadata: Joi.object().optional(),
  }),
};

export const updateLeaseTransactionSchema = {
  params: Joi.object({ propertyId: uuid.required(), unitId: uuid.required(), leaseId: uuid.required(), id: uuid.required() }),
  body: Joi.object({
    paidAt: Joi.date().optional(),
    metadata: Joi.object().optional(),
  }),
};


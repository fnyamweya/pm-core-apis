import Joi from 'joi';
import { LeaseStatus, LeaseType, LeaseChargeType, PaymentFrequency } from '../../entities/properties/propertyLeaseAgreementEntity';

const CHARGE_FREQUENCIES = [
  'one-off',
  'daily',
  'weekly',
  'bi-weekly',
  'monthly',
  'bi-yearly',
  'yearly',
] as const;

const PREDEFINED_CHARGES = [
  'rent',
  'garbage',
  'rentDeposit',
  'waterDeposit',
  'electricityDeposit',
  'custom',
] as const;

const chargeItemSchema = Joi.object({
  chargeType: Joi.string().valid(...PREDEFINED_CHARGES).allow(Joi.string()).required(),
  label: Joi.string().max(128).optional(),
  amount: Joi.number().positive().required(),
  frequency: Joi.string().valid(...CHARGE_FREQUENCIES).required(),
  dueOn: Joi.date().optional(), // for one-off
});

const uuid = Joi.string().uuid({ version: 'uuidv4' }).messages({ 'string.guid': 'Must be a valid UUID' });

export const createLeaseAgreementSchema = {
  params: Joi.object({ propertyId: uuid.required(), unitId: uuid.required() }),
  body: Joi.object({
    unitId: uuid.required(),
    tenantId: uuid.required(),
    landlordId: uuid.optional(),
    organizationId: uuid.required(),
    startDate: Joi.date().required(),
    endDate: Joi.date().required(),
    leaseType: Joi.string().valid(...Object.values(LeaseType)).optional(),
    chargeType: Joi.string().valid(...Object.values(LeaseChargeType)).optional(),
    paymentFrequency: Joi.string().valid(...Object.values(PaymentFrequency)).optional(),
    firstPaymentDate: Joi.date().optional().allow(null),
    status: Joi.string().valid(...Object.values(LeaseStatus)).optional(),
    esignatures: Joi.array().items(Joi.object()).optional(),
    signedDocumentUrl: Joi.string().uri().optional(),
    contractHash: Joi.string().optional(),
    terms: Joi.object().optional(),
    metadata: Joi.object().optional(),
    charges: Joi.array().items(chargeItemSchema).optional(),
  }),
};

export const updateLeaseAgreementSchema = {
  params: Joi.object({ propertyId: uuid.required(), unitId: uuid.required(), id: uuid.required() }),
  body: Joi.object({
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional(),
    amount: Joi.number().positive().optional(),
    leaseType: Joi.string().valid(...Object.values(LeaseType)).optional(),
    chargeType: Joi.string().valid(...Object.values(LeaseChargeType)).optional(),
    paymentFrequency: Joi.string().valid(...Object.values(PaymentFrequency)).optional(),
    firstPaymentDate: Joi.date().optional().allow(null),
    status: Joi.string().valid(...Object.values(LeaseStatus)).optional(),
    esignatures: Joi.array().items(Joi.object()).optional(),
    signedDocumentUrl: Joi.string().uri().optional(),
    contractHash: Joi.string().optional(),
    terms: Joi.object().optional(),
    metadata: Joi.object().optional(),
    charges: Joi.array().items(chargeItemSchema).optional(),
  }),
};

export const extendLeaseAgreementSchema = {
  params: Joi.object({ propertyId: uuid.required(), unitId: uuid.required(), id: uuid.required() }),
  body: Joi.object({
    newEndDate: Joi.date().required(),
    amount: Joi.number().positive().optional(),
  }),
};

export const terminateLeaseAgreementSchema = {
  params: Joi.object({ propertyId: uuid.required(), unitId: uuid.required(), id: uuid.required() }),
  body: Joi.object({
    terminationDate: Joi.date().required(),
    reason: Joi.string().max(256).optional(),
  }),
};

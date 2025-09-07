import Joi from 'joi';
import { MaintenancePriority, MaintenanceStatus } from '../../entities/properties/propertyRequestEntity';

const uuid = Joi.string().uuid({ version: 'uuidv4' }).messages({ 'string.guid': 'Must be a valid UUID' });

export const createRequestSchema = {
  params: Joi.object({
    propertyId: uuid.required(),
  }),
  body: Joi.object({
    unitId: uuid.optional(),
    requesterId: uuid.required(),
    assigneeId: uuid.optional(),
    title: Joi.string().max(128).required(),
    description: Joi.string().required(),
    priority: Joi.string().valid(...Object.values(MaintenancePriority)).optional(),
    status: Joi.string().valid(...Object.values(MaintenanceStatus)).optional(),
    attachments: Joi.array().items(Joi.string().uri()).optional(),
    metadata: Joi.object().optional(),
  }),
};

export const updateRequestSchema = {
  params: Joi.object({
    propertyId: uuid.required(),
    id: uuid.required(),
  }),
  body: Joi.object({
    assigneeId: uuid.allow(null).optional(),
    status: Joi.string().valid(...Object.values(MaintenanceStatus)).optional(),
    priority: Joi.string().valid(...Object.values(MaintenancePriority)).optional(),
    description: Joi.string().optional(),
  }),
};

export const getRequestsByStatusSchema = {
  params: Joi.object({
    propertyId: uuid.required(),
    status: Joi.string().valid(...Object.values(MaintenanceStatus)).required(),
  }),
};

export const getRecentRequestsSchema = {
  params: Joi.object({ propertyId: uuid.required() }),
  query: Joi.object({
    days: Joi.number().integer().min(0).default(7),
  }),
};


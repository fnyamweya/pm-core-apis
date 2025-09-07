import Joi from 'joi';

const uuid = Joi.string().uuid({ version: 'uuidv4' }).messages({ 'string.guid': 'Must be a valid UUID' });

export const createUnitSchema = {
  params: Joi.object({
    propertyId: uuid.required(),
  }),
  body: Joi.object({
    unitNumber: Joi.string().max(32).required(),
    name: Joi.string().max(64).optional(),
    floor: Joi.string().max(32).optional(),
    area: Joi.number().positive().optional(),
    description: Joi.string().optional(),
    isListed: Joi.boolean().optional(),
    amenities: Joi.array().items(Joi.string()).optional(),
    metadata: Joi.object({
      bedrooms: Joi.number().min(0).optional(),
      bathrooms: Joi.number().min(0).optional(),
      features: Joi.array().items(Joi.string()).optional(),
      floorPlan: Joi.string().allow(null, '').optional(),
      furnishing: Joi.string().valid('unfurnished', 'semi-furnished', 'furnished').optional(),
      utilities: Joi.object({
        waterIncluded: Joi.boolean().optional(),
        electricityIncluded: Joi.boolean().optional(),
        internetIncluded: Joi.boolean().optional(),
      }).optional(),
      sizeUnit: Joi.string().valid('sqm', 'sqft').optional(),
      parkingSpaces: Joi.number().min(0).optional(),
      rent: Joi.number().min(0).allow(null).optional(),
      deposit: Joi.number().min(0).allow(null).optional(),
      view: Joi.string().allow(null, '').optional(),
      orientation: Joi.string().allow(null, '').optional(),
      appliances: Joi.array().items(Joi.string()).optional(),
      images: Joi.array().items(Joi.string().uri()).optional(),
      notes: Joi.string().allow(null, '').optional(),
    })
      // Allow UI to send additional ad-hoc fields without validation errors
      .unknown(true)
      .optional(),
    status: Joi.string().valid('vacant', 'occupied', 'reserved', 'maintenance', 'unavailable').optional(),
  }),
};

export const updateUnitSchema = {
  params: Joi.object({
    propertyId: uuid.required(),
    id: uuid.required(),
  }),
  body: Joi.object({
    unitNumber: Joi.string().max(32).optional(),
    name: Joi.string().max(64).optional(),
    floor: Joi.string().max(32).optional(),
    area: Joi.number().positive().optional(),
    description: Joi.string().optional(),
    isListed: Joi.boolean().optional(),
    amenities: Joi.array().items(Joi.string()).optional(),
    metadata: Joi.object({
      bedrooms: Joi.number().min(0).optional(),
      bathrooms: Joi.number().min(0).optional(),
      features: Joi.array().items(Joi.string()).optional(),
      floorPlan: Joi.string().allow(null, '').optional(),
      furnishing: Joi.string().valid('unfurnished', 'semi-furnished', 'furnished').optional(),
      utilities: Joi.object({
        waterIncluded: Joi.boolean().optional(),
        electricityIncluded: Joi.boolean().optional(),
        internetIncluded: Joi.boolean().optional(),
      }).optional(),
      sizeUnit: Joi.string().valid('sqm', 'sqft').optional(),
      parkingSpaces: Joi.number().min(0).optional(),
      rent: Joi.number().min(0).allow(null).optional(),
      deposit: Joi.number().min(0).allow(null).optional(),
      view: Joi.string().allow(null, '').optional(),
      orientation: Joi.string().allow(null, '').optional(),
      appliances: Joi.array().items(Joi.string()).optional(),
      images: Joi.array().items(Joi.string().uri()).optional(),
      notes: Joi.string().allow(null, '').optional(),
    })
      // Allow UI to send additional ad-hoc fields without validation errors
      .unknown(true)
      .optional(),
    tenantId: uuid.allow(null).optional(),
    status: Joi.string().valid('vacant', 'occupied', 'reserved', 'maintenance', 'unavailable').optional(),
  }),
};

export const listUnitsSchema = {
  params: Joi.object({ propertyId: uuid.required() }),
  query: Joi.object({
    page: Joi.number().integer().positive().optional(),
    limit: Joi.number().integer().positive().optional(),
    orderBy: Joi.string().valid('unitNumber', 'name', 'createdAt').optional(),
    orderDir: Joi.string().valid('ASC', 'DESC').optional(),
    search: Joi.string().optional(),
    onlyListed: Joi.boolean().optional(),
    onlyAvailable: Joi.boolean().optional(),
    onlyOccupied: Joi.boolean().optional(),
    includeLeases: Joi.boolean().optional(),
    includeRequests: Joi.boolean().optional(),
  }),
};

export const searchUnitsSchema = {
  params: Joi.object({ propertyId: uuid.required() }),
  query: Joi.object({
    query: Joi.string().min(1).required(),
    limit: Joi.number().integer().positive().optional(),
  }),
};

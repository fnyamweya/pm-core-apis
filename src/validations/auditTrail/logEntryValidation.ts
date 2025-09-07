import * as Joi from 'joi';
import { AuditLogEntry } from '../../types/auditTrail/auditTrailTypes';

export function validateLogEntry(entry: AuditLogEntry): void {
  const schema = Joi.object({
    action: Joi.string().trim().required(),
    status: Joi.string().valid('success', 'failure').required(),
    severity: Joi.string()
      .valid('low', 'medium', 'high', 'critical')
      .required(),
    timestamp: Joi.string().isoDate().required(),
    environment: Joi.string().required(),
    // ... include other fields as needed ...
  });

  const { error } = schema.validate(entry);
  if (error) {
    throw new Error(`Validation error: ${error.message}`);
  }
}

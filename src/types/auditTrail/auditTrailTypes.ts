import { AuditActions } from '../../constants/auditTrail/auditActions';

export type AuditAction =
  (typeof AuditActions)[keyof typeof AuditActions][keyof (typeof AuditActions)[keyof typeof AuditActions]];

export interface AuditTrailChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

// Base interface for all audit details
export interface BaseAuditDetails extends Record<string, unknown> {
  // Common properties for all audit details can go here
}

// Interface for request-specific audit details
export interface RequestAuditDetails extends BaseAuditDetails {
  duration?: number;
  method: string;
  route?: string;
  requestBody?: Record<string, unknown>;
  responseBody?: Record<string, unknown>;
  headers?: Record<string, string>;
}

export interface CRUDAuditLogParams {
  action: AuditAction;
  userId: string;
  resource: string;
  resourceId: string;
  changes?: AuditTrailChange[];
  newRecord?: Record<string, unknown>;
  deletedRecord?: Record<string, unknown>;
  status?: 'success' | 'failure';
  severity?: 'low' | 'medium' | 'high' | 'critical';
  correlationId?: string;
}

// Interface for CRUD operation audit details
export interface CRUDAuditDetails extends BaseAuditDetails {
  changes?: AuditTrailChange[];
  newRecord?: Record<string, unknown>;
  deletedRecord?: Record<string, unknown>;
}

export interface SearchOptions {
  from?: number;
  size?: number;
  startDate?: string;
  endDate?: string;
  userId?: string;
  action?: AuditAction;
  resource?: string;
  resourceId?: string;
  status?: 'success' | 'failure';
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface SearchResult {
  total: number;
  hits: AuditLogEntry[];
}

export interface AuditLogEntry {
  userId: string;
  action: AuditAction;
  resource?: string;
  resourceId?: string;
  status: 'success' | 'failure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details?: BaseAuditDetails; // This allows both RequestAuditDetails and CRUDAuditDetails
  correlationId?: string;
  timestamp: string;
  environment: string;
}

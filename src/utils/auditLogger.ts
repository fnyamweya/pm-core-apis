import { Client } from '@elastic/elasticsearch';
import { AuditActions } from '../constants/auditTrail/auditActions';
import {
  AuditLogEntry,
  AuditTrailError,
  AuditTrailService,
} from '../services/auditTrail/auditTrailService';
import {
  AuditAction,
  CRUDAuditDetails,
  RequestAuditDetails,
} from '../types/auditTrail/auditTrailTypes';
import { logger } from './logger';

interface ExtendedAuditTrailService extends AuditTrailService {
  getIndex(): string;
  getClient(): Client;
}

export class AuditLogger {
  private static getService(): ExtendedAuditTrailService {
    const app = require('../app').default;
    const service = app.locals.auditTrailService;

    if (!service) {
      throw new AuditTrailError('AuditTrailService not initialized');
    }

    return service as ExtendedAuditTrailService;
  }

  static async logRequest({
    userId,
    method,
    route,
    status,
    severity,
    correlationId,
    details,
    duration,
    resourceId,
  }: {
    userId: string;
    method: string;
    route: string;
    status: 'success' | 'failure';
    severity: 'low' | 'medium' | 'high' | 'critical';
    correlationId?: string;
    details?: Partial<RequestAuditDetails>;
    duration?: number;
    resourceId?: string;
  }) {
    try {
      const auditTrailService = this.getService();

      const requestDetails: RequestAuditDetails = {
        ...details,
        duration,
        method,
        route,
      };

      // Extract the action from AuditActions to ensure type safety
      const action: AuditAction = (
        method === 'POST'
          ? AuditActions.General.CREATE
          : AuditActions.General.UPDATE
      ) as AuditAction;

      const auditEntry: Omit<AuditLogEntry, 'timestamp' | 'environment'> = {
        userId,
        action,
        resource: route,
        resourceId,
        status,
        severity,
        correlationId,
        details: requestDetails,
      };

      await auditTrailService.recordAuditLog(auditEntry);
    } catch (error) {
      logger.error(
        error instanceof AuditTrailError
          ? 'Audit trail error while logging request:'
          : 'Unexpected error while logging request:',
        { error }
      );
    }
  }

  static async logCRUD({
    userId,
    action: actionKey,
    status,
    severity,
    targetId,
    details,
    correlationId,
  }: {
    userId: string;
    action: keyof typeof AuditActions.General;
    status: 'success' | 'failure';
    severity: 'low' | 'medium' | 'high' | 'critical';
    targetId?: string;
    details?: CRUDAuditDetails;
    correlationId?: string;
  }) {
    try {
      const auditTrailService = this.getService();

      // Safely extract the action and ensure it matches AuditAction type
      const action = AuditActions.General[actionKey] as AuditAction;

      const auditEntry: Omit<AuditLogEntry, 'timestamp' | 'environment'> = {
        userId,
        action,
        resourceId: targetId,
        status,
        severity,
        details: details || {},
        correlationId,
      };

      await auditTrailService.recordAuditLog(auditEntry);
    } catch (error) {
      logger.error(
        error instanceof AuditTrailError
          ? `Audit trail error while logging ${actionKey} action:`
          : `Unexpected error while logging ${actionKey} action:`,
        { error }
      );
    }
  }

  static async logBatch(
    logs: Array<Omit<AuditLogEntry, 'timestamp' | 'environment'>>
  ) {
    try {
      const auditTrailService = this.getService();

      for (const log of logs) {
        await auditTrailService.recordAuditLog(log);
      }
    } catch (error) {
      logger.error(
        error instanceof AuditTrailError
          ? 'Audit trail error while logging batch actions:'
          : 'Unexpected error while logging batch actions:',
        { error }
      );
    }
  }

  static async logBatchBulk(
    logs: Array<Omit<AuditLogEntry, 'timestamp' | 'environment'>>
  ) {
    try {
      const auditTrailService = this.getService();
      const environment = process.env.NODE_ENV || 'development';
      const timestamp = new Date().toISOString();

      const bulkBody = logs.flatMap((log) => [
        { index: { _index: auditTrailService.getIndex() } },
        { ...log, timestamp, environment },
      ]);

      logger.debug('Preparing bulk audit log request', {
        logCount: logs.length,
        firstLog: logs[0],
      });

      const response = await auditTrailService.getClient().bulk({
        body: bulkBody,
        refresh: 'wait_for',
      });

      if (response.errors) {
        const failedItems = response.items?.filter((item) => item.index?.error);
        throw new AuditTrailError('Bulk audit log operation had errors', {
          failedItems,
          errorCount: failedItems?.length,
        });
      }

      logger.debug('Bulk audit log request completed', {
        took: response.took,
        items: response.items?.length,
      });
    } catch (error) {
      logger.error(
        error instanceof AuditTrailError
          ? 'Audit trail error while bulk logging:'
          : 'Unexpected error while bulk logging:',
        { error }
      );
    }
  }
}

import { Client } from '@elastic/elasticsearch';
import { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { AuditAction } from '../../constants/auditTrail/auditActions';
import { INDEX_SETTINGS } from '../../constants/auditTrail/indexSettings';
import {
  AuditLogEntry,
  CRUDAuditDetails,
  CRUDAuditLogParams,
  SearchOptions,
  SearchResult,
} from '../../types/auditTrail/auditTrailTypes';
import { logger } from '../../utils/logger';

/**
 * Custom error class for AuditTrail-related errors
 */
export class AuditTrailError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'AuditTrailError';
  }
}

/**
 * Service for managing audit trails in Elasticsearch.
 */
export class AuditTrailService {
  private readonly index: string;
  private readonly indexPattern: string;
  private readonly retentionDays: number;
  private readonly client: Client;
  private initialized = false;

  constructor(
    client: Client,
    options: {
      index?: string;
      retentionDays?: number;
    } = {}
  ) {
    if (!client) {
      throw new AuditTrailError('Elasticsearch client is required');
    }

    const env = process.env.NODE_ENV || 'development';
    this.client = client;
    this.index = `${env}-${options.index}`;
    this.indexPattern = `${this.index}-*`;
    this.retentionDays = options.retentionDays || 90;
  }

  /**
   * Initialize the audit trail service by creating index templates and ILM policies.
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.verifyConnection();
      await this.createIndexTemplate();
      await this.setupRetentionPolicy();
      await this.createCurrentIndex();
      this.initialized = true;
      logger.info('AuditTrailService initialized successfully.');
    } catch (error) {
      logger.error('Failed to initialize AuditTrailService', error);
      throw new AuditTrailError(
        'Failed to initialize AuditTrailService',
        error
      );
    }
  }

  /**
   * Verify the Elasticsearch connection is working
   */
  private async verifyConnection(): Promise<void> {
    try {
      const health = await this.client.cluster.health();
      logger.info(`Elasticsearch cluster status: ${health.status}`);
      if (health.status === 'red') {
        throw new AuditTrailError('Elasticsearch cluster is in red status');
      }
    } catch (error) {
      throw new AuditTrailError(
        'Failed to verify Elasticsearch connection',
        error
      );
    }
  }

  /**
   * Create the Elasticsearch index template for audit logs.
   */
  private async createIndexTemplate(): Promise<void> {
    const templateName = `${this.index}-template`;

    try {
      await this.client.indices.putTemplate({
        name: templateName,
        body: {
          index_patterns: [this.indexPattern],
          ...INDEX_SETTINGS,
        },
      });
    } catch (error) {
      throw new AuditTrailError('Failed to create index template', error);
    }
  }

  /**
   * Set up the Index Lifecycle Management (ILM) policy for audit logs.
   */
  private async setupRetentionPolicy(): Promise<void> {
    const policyName = `${this.index}-retention`;

    try {
      await this.client.ilm.putLifecycle({
        name: policyName,
        body: {
          policy: {
            phases: {
              hot: {
                actions: {
                  rollover: {
                    max_age: '1d',
                    max_size: '50gb',
                  },
                },
              },
              delete: {
                min_age: `${this.retentionDays}d`,
                actions: {
                  delete: {},
                },
              },
            },
          },
        },
      });
    } catch (error) {
      throw new AuditTrailError('Failed to setup retention policy', error);
    }
  }

  /**
   * Create the current daily index for audit logs.
   */
  private async createCurrentIndex(): Promise<void> {
    const currentDate = new Date().toISOString().split('T')[0];
    const currentIndex = `${this.index}-${currentDate}`;

    try {
      const exists = await this.client.indices.exists({ index: currentIndex });
      if (!exists) {
        await this.client.indices.create({
          index: currentIndex,
          body: {
            aliases: {
              [this.index]: {
                is_write_index: true,
              },
            },
            settings: INDEX_SETTINGS.settings,
            mappings: INDEX_SETTINGS.mappings,
          },
        });
      }
    } catch (error) {
      throw new AuditTrailError('Failed to create current index', error);
    }
  }

  /**
   * Record an audit log in Elasticsearch.
   */
  public async recordAuditLog(
    logEntry: Omit<AuditLogEntry, 'timestamp' | 'environment'>
  ): Promise<void> {
    await this.initialize();

    const entry: AuditLogEntry = {
      ...logEntry,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    };

    try {
      const response = await this.client.index({
        index: this.index,
        body: entry,
        refresh: 'wait_for',
      });
      logger.debug('Audit log recorded successfully', {
        entry,
        documentId: response._id,
      });
    } catch (error) {
      logger.error('Failed to record audit log', { error, logEntry });
      throw new AuditTrailError('Failed to record audit log', error);
    }
  }

  /**
   * Record a CRUD operation audit log.
   * @param params The parameters for the CRUD audit log
   */
  public async recordCRUDAuditLog({
    action,
    userId,
    resource,
    resourceId,
    changes,
    newRecord,
    deletedRecord,
    status = 'success',
    severity = 'medium',
    correlationId,
  }: CRUDAuditLogParams): Promise<void> {
    const details: CRUDAuditDetails = {
      ...(changes && { changes }),
      ...(newRecord && { newRecord }),
      ...(deletedRecord && { deletedRecord }),
    };

    await this.recordAuditLog({
      userId,
      action,
      resource,
      resourceId,
      status,
      severity,
      correlationId,
      details,
    });
  }

  /**
   * Search audit logs based on query options.
   */
  public async searchAuditLogs(options: SearchOptions): Promise<SearchResult> {
    await this.initialize();

    const query = this.buildSearchQuery(options);

    try {
      const response: SearchResponse<AuditLogEntry> = await this.client.search({
        index: this.indexPattern,
        body: query,
      });

      const total =
        typeof response.hits.total === 'number'
          ? response.hits.total
          : response.hits.total?.value || 0;

      return {
        total,
        hits: response.hits.hits.map((hit) => hit._source as AuditLogEntry),
      };
    } catch (error) {
      throw new AuditTrailError('Failed to search audit logs', error);
    }
  }

  /**
   * Build Elasticsearch query from search options.
   */
  private buildSearchQuery(options: SearchOptions): Record<string, unknown> {
    const must: Record<string, unknown>[] = [];
    const range: Record<string, unknown> = {};

    if (options.startDate || options.endDate) {
      range.timestamp = {
        ...(options.startDate && { gte: options.startDate }),
        ...(options.endDate && { lte: options.endDate }),
      };
    }

    if (Object.keys(range).length) {
      must.push({ range: { timestamp: range } });
    }

    for (const [key, value] of Object.entries(options)) {
      if (value && key !== 'startDate' && key !== 'endDate') {
        must.push({ match: { [key]: value } });
      }
    }

    return {
      query: {
        bool: {
          must,
        },
      },
      from: options.from || 0,
      size: options.size || 10,
    };
  }

  /**
   * Clean up old indices based on the retention policy.
   */
  public async cleanup(): Promise<void> {
    await this.initialize();

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

      const indices = await this.client.cat.indices({
        format: 'json',
        index: this.indexPattern,
      });

      for (const indexInfo of indices) {
        const indexName = indexInfo.index;
        if (indexName) {
          const indexDate = indexName.split('-').pop();
          if (indexDate) {
            const parsedDate = new Date(indexDate);
            if (parsedDate < cutoffDate) {
              try {
                await this.client.indices.delete({ index: indexName });
                logger.info(`Deleted old audit log index: ${indexName}`);
              } catch (deleteError) {
                logger.warn(
                  `Failed to delete index: ${indexName}`,
                  deleteError
                );
              }
            }
          }
        }
      }
    } catch (error) {
      throw new AuditTrailError('Failed to clean up old audit logs', error);
    }
  }
}

// Create and export a factory function
let auditTrailService: AuditTrailService | null = null;

export const createAuditTrailService = (
  client: Client,
  options?: {
    index?: string;
    retentionDays?: number;
  }
): AuditTrailService => {
  if (!auditTrailService) {
    auditTrailService = new AuditTrailService(client, options);
  }
  return auditTrailService;
};

export {
  AuditAction,
  type AuditLogEntry,
  type SearchOptions,
  type SearchResult,
};

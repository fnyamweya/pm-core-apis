import {
  IndicesIndexSettings,
  MappingTypeMapping,
} from '@elastic/elasticsearch/lib/api/types';

/**
 * Index settings and mappings for the audit trail service.
 */
export const INDEX_SETTINGS: {
  settings: IndicesIndexSettings;
  mappings: MappingTypeMapping;
} = {
  settings: {
    index: {
      number_of_shards: 3,
      number_of_replicas: 1,
      refresh_interval: '1s',
    },
    analysis: {
      analyzer: {
        keyword_analyzer: {
          type: 'custom',
          tokenizer: 'keyword',
          filter: ['lowercase'],
        },
      },
    },
  },
  mappings: {
    properties: {
      timestamp: { type: 'date' },
      userId: { type: 'keyword' },
      action: { type: 'keyword' },
      status: { type: 'keyword' },
      environment: { type: 'keyword' },
      severity: { type: 'keyword' },
      clientIp: { type: 'ip' },
      userAgent: { type: 'keyword' },
      resourceId: { type: 'keyword' },
      correlationId: { type: 'keyword' },
      duration: { type: 'long' },
      details: { type: 'object', enabled: true },
    },
  },
};

/**
 * ILM policy generator for managing index lifecycle.
 * @param retentionDays Number of days to retain audit log indices before deletion.
 * @param maxDocs Maximum number of documents in an index before triggering a rollover.
 * @returns An ILM policy configuration for the index lifecycle management.
 */
export const ILM_POLICY = (retentionDays: number, maxDocs: number) => ({
  policy: {
    phases: {
      hot: {
        actions: {
          rollover: {
            max_size: '50gb',
            max_age: '1d',
            max_docs: maxDocs,
          },
          set_priority: {
            priority: 100,
          },
        },
      },
      warm: {
        min_age: '2d',
        actions: {
          forcemerge: {
            max_num_segments: 1,
          },
          shrink: {
            number_of_shards: 1,
          },
          set_priority: {
            priority: 50,
          },
        },
      },
      cold: {
        min_age: '7d',
        actions: {
          set_priority: {
            priority: 0,
          },
        },
      },
      delete: {
        min_age: `${retentionDays}d`,
        actions: {
          delete: {},
        },
      },
    },
  },
});

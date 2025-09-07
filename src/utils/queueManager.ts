import { Job, Queue, QueueOptions, Worker } from 'bullmq';
import { redisManager } from '../config/redis';
import { logger } from '../utils/logger';

// Define the QueueManager interface
interface QueueManagerConfig {
  queueName: string;
  concurrency?: number;
  queueOptions?: QueueOptions;
}

// Custom error for QueueManager issues
class QueueManagerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QueueManagerError';
  }
}

// Singleton QueueManager class
class QueueManager {
  private static instance: QueueManager;
  private queues: Map<string, Queue>;
  private workers: Map<string, Worker>;

  // Private constructor to ensure it cannot be instantiated directly
  private constructor() {
    this.queues = new Map();
    this.workers = new Map();
  }

  // Singleton instance getter
  public static getInstance(): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager();
    }
    return QueueManager.instance;
  }

  // Create or get a queue
  public createQueue(config: QueueManagerConfig): Queue {
    const { queueName, queueOptions } = config;

    if (this.queues.has(queueName)) {
      return this.queues.get(queueName)!;
    }

    const queue = new Queue(queueName, {
      connection: redisManager.getClient(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      },
      ...queueOptions,
    });

    this.queues.set(queueName, queue);
    logger.info(`Queue ${queueName} created`);
    return queue;
  }

  // Create or get a worker
  public createWorker(
    config: QueueManagerConfig,
    processor: string | ((job: Job) => Promise<any>)
  ): Worker {
    const { queueName, concurrency } = config;

    if (this.workers.has(queueName)) {
      return this.workers.get(queueName)!;
    }

    const worker = new Worker(queueName, processor, {
      connection: redisManager.getClient(),
      concurrency: concurrency || 1,
    });

    this.setupWorkerEventListeners(worker, queueName);
    this.workers.set(queueName, worker);
    logger.info(`Worker for queue ${queueName} created`);
    return worker;
  }

  // Add a job to the queue
  public async addJob(
    queueName: string,
    jobName: string,
    data: any,
    options?: any
  ): Promise<Job> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new QueueManagerError(`Queue ${queueName} not found`);
    }

    try {
      const job = await queue.add(jobName, data, options);
      logger.info(`Job ${jobName} added to queue ${queueName}`);
      return job;
    } catch (error) {
      logger.error(`Failed to add job ${jobName} to queue ${queueName}`, error);
      throw new QueueManagerError(
        `Failed to add job ${jobName} to queue ${queueName}`
      );
    }
  }

  // Setup worker event listeners for logging
  private setupWorkerEventListeners(worker: Worker, queueName: string): void {
    worker.on('completed', (job: Job) => {
      logger.info(`Job ${job.id} completed in queue ${queueName}`);
    });

    worker.on('failed', (job: Job | undefined, err: Error) => {
      if (job) {
        logger.error(`Job ${job.id} failed in queue ${queueName}`, err);
      } else {
        logger.error(
          `Job failed in queue ${queueName} without a job reference`,
          err
        );
      }
    });

    worker.on('error', (err: Error) => {
      logger.error(`Worker for queue ${queueName} encountered an error`, err);
    });

    worker.on('active', (job: Job) => {
      logger.info(`Job ${job.id} started processing in queue ${queueName}`);
    });

    worker.on('stalled', (jobId: string) => {
      logger.warn(`Job ${jobId} stalled in queue ${queueName}`);
    });
  }

  // Close all queues and workers gracefully
  public async close(): Promise<void> {
    try {
      await Promise.all([
        ...Array.from(this.queues.values()).map((queue) => queue.close()),
        ...Array.from(this.workers.values()).map((worker) => worker.close()),
      ]);
      logger.info('All queues and workers closed gracefully');
    } catch (error) {
      logger.error('Error closing queues and workers', error);
      throw new QueueManagerError('Failed to close queues and workers');
    }
  }
}

// Create a singleton QueueManager instance
const queueManager = QueueManager.getInstance();

export { QueueManager, queueManager, QueueManagerError };

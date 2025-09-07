import { Glacier } from 'aws-sdk';
import { EnvConfiguration } from '../../../config/env';
import { logger } from '../../../utils/logger';
import { retryOperation } from '../../../utils/retryUtil';

export class AWSGlacierProvider {
  private glacier: Glacier;
  private vaultName: string;

  constructor() {
    if (
      !EnvConfiguration.AWS_REGION ||
      !EnvConfiguration.AWS_GLACIER_VAULT_NAME ||
      !EnvConfiguration.AWS_ACCESS_KEY_ID ||
      !EnvConfiguration.AWS_SECRET_ACCESS_KEY
    ) {
      throw new Error(
        'AWS Glacier environment variables are not properly configured'
      );
    }

    this.glacier = new Glacier({
      region: EnvConfiguration.AWS_REGION,
      accessKeyId: EnvConfiguration.AWS_ACCESS_KEY_ID,
      secretAccessKey: EnvConfiguration.AWS_SECRET_ACCESS_KEY,
    });

    this.vaultName = EnvConfiguration.AWS_GLACIER_VAULT_NAME;
  }

  /**
   * Uploads a file to AWS Glacier
   * @param file - The file buffer to be archived
   * @param customKey - Optional custom key or description for the archive
   * @returns The archive ID of the uploaded file
   */
  async upload(
    file: Express.Multer.File,
    customKey: string
  ): Promise<{ archiveId: string }> {
    const params: Glacier.UploadArchiveInput = {
      vaultName: this.vaultName,
      body: file.buffer,
      archiveDescription: customKey,
      accountId: '-',
    };

    try {
      const result = await retryOperation(() =>
        this.glacier.uploadArchive(params).promise()
      );
      logger.info('File archived to AWS Glacier', {
        archiveId: result.archiveId,
        description: customKey,
      });
      return { archiveId: result.archiveId! };
    } catch (error) {
      logger.error('AWS Glacier archive failed', {
        error: error instanceof Error ? error.message : error,
        customKey,
      });
      throw new Error('Failed to archive file to AWS Glacier');
    }
  }

  /**
   * Deletes an archive from AWS Glacier
   * @param archiveId - The ID of the archive to delete
   */
  async delete(archiveId: string): Promise<void> {
    const params: Glacier.DeleteArchiveInput = {
      vaultName: this.vaultName,
      archiveId,
      accountId: '-',
    };

    try {
      await retryOperation(() => this.glacier.deleteArchive(params).promise());
      logger.info('Archive deleted from AWS Glacier', { archiveId });
    } catch (error) {
      logger.error('Failed to delete archive from AWS Glacier', {
        error: error instanceof Error ? error.message : error,
        archiveId,
      });
      throw new Error('Failed to delete archive from AWS Glacier');
    }
  }

  /**
   * Initiates a retrieval job for a file in AWS Glacier
   * @param archiveId - The ID of the archive to retrieve
   * @param tier - The retrieval tier ('Standard', 'Bulk', or 'Expedited')
   * @param description - Optional description for the retrieval job
   * @returns The job ID for the retrieval request
   */
  async initiateRetrieval(
    archiveId: string,
    tier: 'Standard' | 'Bulk' | 'Expedited' = 'Standard',
    description?: string
  ): Promise<string> {
    const params: Glacier.InitiateJobInput = {
      accountId: '-',
      vaultName: this.vaultName,
      jobParameters: {
        Type: 'archive-retrieval',
        ArchiveId: archiveId,
        Tier: tier,
        Description: description || `Retrieve archive ${archiveId}`,
      },
    };

    try {
      const result = await retryOperation(() =>
        this.glacier.initiateJob(params).promise()
      );
      logger.info('Retrieval job initiated for AWS Glacier archive', {
        jobId: result.jobId,
        archiveId,
        tier,
      });
      return result.jobId!;
    } catch (error) {
      logger.error('Failed to initiate retrieval job for AWS Glacier', {
        error: error instanceof Error ? error.message : error,
        archiveId,
        tier,
      });
      throw new Error('Failed to initiate retrieval job for AWS Glacier');
    }
  }

  /**
   * Polls the status of a retrieval job
   * @param jobId - The ID of the job
   * @param intervalMs - Interval in milliseconds to poll the status
   * @param maxRetries - Maximum number of retries
   */
  async pollJobStatus(
    jobId: string,
    intervalMs = 5000,
    maxRetries = 20
  ): Promise<void> {
    let retries = 0;

    while (retries < maxRetries) {
      const jobStatus = await this.glacier
        .describeJob({
          accountId: '-',
          vaultName: this.vaultName,
          jobId,
        })
        .promise();

      if (jobStatus.StatusCode === 'Succeeded') {
        logger.info('Retrieval job succeeded', { jobId });
        return;
      }

      if (jobStatus.StatusCode === 'Failed') {
        logger.error('Retrieval job failed', { jobId });
        throw new Error(`Retrieval job ${jobId} failed`);
      }

      retries++;
      logger.info('Waiting for job to complete', { jobId, retries });
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error(`Job ${jobId} did not complete within expected time`);
  }

  /**
   * Fetches the output of a completed retrieval job
   * @param jobId - The ID of the completed retrieval job
   * @returns The retrieved file buffer
   */
  async getRetrievalOutput(jobId: string): Promise<Buffer> {
    const params: Glacier.GetJobOutputInput = {
      vaultName: this.vaultName,
      jobId,
      accountId: '-',
    };

    try {
      const result = await retryOperation(() =>
        this.glacier.getJobOutput(params).promise()
      );
      logger.info('Retrieval output fetched for AWS Glacier job', { jobId });
      return result.body as Buffer;
    } catch (error) {
      logger.error('Failed to fetch retrieval output from AWS Glacier', {
        error: error instanceof Error ? error.message : error,
        jobId,
      });
      throw new Error('Failed to fetch retrieval output from AWS Glacier');
    }
  }
}

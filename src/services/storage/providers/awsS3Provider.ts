import { S3 } from 'aws-sdk';
import { EnvConfiguration } from '../../../config/env';
import { logger } from '../../../utils/logger';

export class AWSS3Provider {
  private s3: S3;
  private bucketName: string;

  constructor() {
    if (
      !EnvConfiguration.AWS_REGION ||
      !EnvConfiguration.AWS_ACCESS_KEY_ID ||
      !EnvConfiguration.AWS_SECRET_ACCESS_KEY ||
      !EnvConfiguration.AWS_S3_BUCKET_NAME
    ) {
      throw new Error(
        'AWS S3 environment variables are not properly configured'
      );
    }

    this.s3 = new S3({
      region: EnvConfiguration.AWS_REGION,
      accessKeyId: EnvConfiguration.AWS_ACCESS_KEY_ID,
      secretAccessKey: EnvConfiguration.AWS_SECRET_ACCESS_KEY,
    });

    this.bucketName = EnvConfiguration.AWS_S3_BUCKET_NAME;
  }

  /**
   * Uploads a file to S3.
   * @param file - The file to upload.
   * @param customKey - The fully constructed key (e.g., 'image/jpeg/YYYYMMDD/filename.jpg').
   * @returns The file's public URL and key in S3.
   */
  async upload(
    file: Express.Multer.File,
    customKey: string
  ): Promise<{ url: string; key: string }> {
    const params: S3.PutObjectRequest = {
      Bucket: this.bucketName,
      Key: customKey,
      Body: file.buffer,
      ContentType: file.mimetype,
    };

    try {
      const result = await this.s3.upload(params).promise();
      logger.info('File uploaded to AWS S3', {
        key: result.Key,
        url: result.Location,
      });
      return { url: result.Location, key: result.Key };
    } catch (error) {
      logger.error('AWS S3 upload failed', { error, params });
      throw new Error('Failed to upload file to AWS S3');
    }
  }

  /**
   * Deletes a file from S3.
   * @param key - The key of the file to delete.
   */
  async delete(key: string): Promise<void> {
    const params: S3.DeleteObjectRequest = {
      Bucket: this.bucketName,
      Key: key,
    };

    try {
      await this.s3.deleteObject(params).promise();
    } catch (error) {
      logger.error('S3 Delete Error', { error, key });
      throw new Error('Failed to delete file from AWS S3');
    }
  }

  /**
   * Retrieves a signed URL for a file in S3.
   * @param key - The key of the file.
   * @param expiresInSeconds - The expiration time for the signed URL.
   * @returns The signed URL.
   */
  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    try {
      const params: S3.GetObjectRequest = {
        Bucket: this.bucketName,
        Key: key,
      };

      return this.s3.getSignedUrlPromise('getObject', {
        ...params,
        Expires: expiresInSeconds,
      });
    } catch (error) {
      logger.error('S3 Signed URL Error', { error, key });
      throw new Error('Failed to generate signed URL for AWS S3');
    }
  }
}

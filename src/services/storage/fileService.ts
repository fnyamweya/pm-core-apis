import {
  MimeType,
  StorageProvider,
} from '../../constants/storage/storageTypes';
import { File } from '../../entities/storage/fileEntity';
import fileRepository from '../../repositories/storage/fileRepository';
import { generateCustomImageKey } from '../../utils/crypto';
import { logger } from '../../utils/logger';
import RedisCache from '../../utils/redisCache';
import { BaseService } from '../baseService';
import { AWSS3Provider } from './providers/awsS3Provider';
// import { GCPStorageProvider } from './providers/gcpProvider';

class FileService extends BaseService<File> {
  private readonly cacheNamespace = 'file';

  constructor() {
    super(
      {
        repository: fileRepository,
        redisCache: new RedisCache<File>(3600), // Cache TTL: 1 hour
        logger,
      },
      'file'
    );
  }

  /**
   * Determines the storage provider based on input or environment configuration.
   * @param provider - The storage provider (e.g., 'AWS', 'GCP').
   * @returns The corresponding storage provider instance.
   * @throws {Error} If the provider is unsupported.
   */
  private getStorageProvider(provider: string): StorageProvider {
    const normalizedProvider = provider.toLowerCase();

    logger.info('Validating storage provider', { provider });

    switch (normalizedProvider) {
      case StorageProvider.AWS:
        return StorageProvider.AWS;
      case StorageProvider.GCP:
        return StorageProvider.GCP;
      default:
        throw new Error(
          `Unsupported storage provider: '${provider}'. Supported providers are 'aws' or 'gcp'.`
        );
    }
  }

  private getStorageProviderInstance(provider: StorageProvider) {
    switch (provider) {
      case StorageProvider.AWS:
        return new AWSS3Provider();
      // case StorageProvider.GCP:
      //   return new GCPStorageProvider();
      default:
        throw new Error(
          `No implementation found for storage provider: ${provider}`
        );
    }
  }

  private generateFolderPath(mimeType: string): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const formattedDate = `${year}${month}${day}`;
    const [type, subtype] = mimeType.split('/');
    return `${type}/${subtype}/${formattedDate}`;
  }

  private generateStorageKey(file: Express.Multer.File): string {
    const customKey = generateCustomImageKey();
    const extension = file.originalname.split('.').pop() || '';
    const folderPath = this.generateFolderPath(file.mimetype);
    const timestamp = Date.now();
    return customKey
      ? `${folderPath}/${customKey}_${timestamp}.${extension}`
      : `${folderPath}/${timestamp}.${extension}`;
  }

  async uploadFiles(
    files: Express.Multer.File[],
    provider: string,
    category: string
  ): Promise<File[]> {
    const storageProvider = this.getStorageProviderInstance(
      this.getStorageProvider(provider)
    );

    logger.info('Starting multiple file uploads', {
      provider,
      category,
      fileCount: files.length,
    });

    const uploadedFiles: File[] = [];
    for (const file of files) {
      try {
        // Validate MIME type
        if (!Object.values(MimeType).includes(file.mimetype as MimeType)) {
          throw new Error(`Unsupported MIME type: '${file.mimetype}'.`);
        }

        // Generate storage key
        const storageKey = this.generateStorageKey(file);

        // Upload file
        const { url, key } = await storageProvider.upload(file, storageKey);

        // Save metadata in the database
        const fileEntity = await this.create({
          originalName: file.originalname,
          mimeType: file.mimetype as MimeType,
          size: file.size,
          url,
          storageProvider: this.getStorageProvider(provider),
          storageKey: key,
          category,
        });

        // Cache the metadata
        const cacheKey = this.generateCacheKey(
          this.cacheNamespace,
          fileEntity.id
        );
        await this.cache.setToCache(this.cacheNamespace, cacheKey, fileEntity);

        logger.info('File uploaded and metadata saved successfully', {
          fileId: fileEntity.id,
          storageKey: fileEntity.storageKey,
          category: fileEntity.category,
        });

        uploadedFiles.push(fileEntity);
      } catch (error) {
        logger.error('File upload failed for one file', {
          fileName: file.originalname,
          provider,
          category,
          error,
        });
        throw new Error(`File upload failed for file ${file.originalname}`);
      }
    }

    return uploadedFiles;
  }

  /**
   * Deletes a file from the specified storage provider and removes metadata from the database.
   * @param storageKey - The unique storage key of the file to delete.
   * @param provider - The storage provider (e.g., 'AWS', 'GCP').
   */
  async deleteFileByStorageKey(
    storageKey: string,
    provider: string
  ): Promise<void> {
    const storageProvider = this.getStorageProviderInstance(
      this.getStorageProvider(provider)
    );

    logger.info('Deleting file', { storageKey, provider });

    // Delete file from storage provider
    await storageProvider.delete(storageKey);

    // Find and delete file metadata in the database
    const file = await fileRepository.findByStorageKey(storageKey);
    if (!file) {
      logger.warn('File metadata not found in database', { storageKey });
      return;
    }

    // Remove from cache and database
    try {
      const cacheKey = this.generateCacheKey(this.cacheNamespace, file.id);
      await this.cache.deleteKey(this.cacheNamespace, cacheKey);
    } catch (cacheError) {
      logger.warn('Failed to delete metadata from cache', {
        fileId: file.id,
        error: cacheError,
      });
    }

    await this.repository.delete(file.id);

    logger.info('File and metadata deleted successfully', {
      fileId: file.id,
      storageKey,
    });
  }

  /**
   * Retrieves a signed URL for accessing a file from the specified storage provider.
   * @param storageKey - The unique storage key of the file.
   * @param provider - The storage provider (e.g., 'AWS', 'GCP').
   * @param expiresInSeconds - Duration in seconds for which the signed URL is valid.
   * @returns The signed URL.
   */
  async getSignedUrl(
    storageKey: string,
    provider: string,
    expiresInSeconds = 3600
  ): Promise<string> {
    const storageProvider = this.getStorageProviderInstance(
      this.getStorageProvider(provider)
    );

    logger.info('Generating signed URL', { storageKey, provider });

    return storageProvider.getSignedUrl(storageKey, expiresInSeconds);
  }

  /**
   * Generates a cache key for an entity.
   * @private
   * @param namespace - The namespace for the cache.
   * @param key - The unique identifier for the cache entry.
   * @returns The cache key string.
   */
  private generateCacheKey(namespace: string, key: string): string {
    return `${namespace}:${key}`;
  }
}

export default new FileService();

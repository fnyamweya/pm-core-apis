import {
  MimeType,
  StorageProvider,
} from '../../constants/storage/storageTypes';
import { File } from '../../entities/storage/fileEntity';
import { BaseRepository } from '../baseRepository';

class FileRepository extends BaseRepository<File> {
  constructor() {
    super(File);
  }

  /**
   * Finds a file by its storage key.
   * @param storageKey - The unique storage key of the file.
   * @returns The file entity or null if not found.
   */
  async findByStorageKey(storageKey: string): Promise<File | null> {
    try {
      return await this.findOne({ where: { storageKey } });
    } catch (error) {
      this.handleError(
        error,
        `Error finding file by storage key: ${storageKey}`
      );
    }
  }

  /**
   * Finds files by storage provider.
   * @param provider - The storage provider (e.g., AWS, GCP).
   * @returns An array of files stored using the given provider.
   */
  async findByStorageProvider(provider: StorageProvider): Promise<File[]> {
    try {
      return await this.find({ where: { storageProvider: provider } });
    } catch (error) {
      this.handleError(
        error,
        `Error finding files by storage provider: ${provider}`
      );
    }
  }

  /**
   * Finds files by MIME type.
   * @param mimeType - The MIME type of the files.
   * @returns An array of files matching the MIME type.
   */
  async findByMimeType(mimeType: MimeType): Promise<File[]> {
    try {
      return await this.find({ where: { mimeType } });
    } catch (error) {
      this.handleError(error, `Error finding files by MIME type: ${mimeType}`);
    }
  }

  /**
   * Deletes a file by its storage key.
   * @param storageKey - The unique storage key of the file to delete.
   */
  async deleteByStorageKey(storageKey: string): Promise<void> {
    try {
      await this.repository.delete({ storageKey });
    } catch (error) {
      this.handleError(
        error,
        `Error deleting file by storage key: ${storageKey}`
      );
    }
  }
}

// Export an instance of `FileRepository`
const fileRepository = new FileRepository();
export { fileRepository as default, FileRepository };

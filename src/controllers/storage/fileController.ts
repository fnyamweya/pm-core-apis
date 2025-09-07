import { Request, Response } from 'express';
import httpStatus from 'http-status-codes';
import ALLOWED_KINDS from '../../constants/allowedKinds';
import { File } from '../../entities/storage/fileEntity';
import fileService from '../../services/storage/fileService';
import { logger } from '../../utils/logger';
import BaseController from '../baseController';
import { AllowedKind } from '../../constants/allowedKinds';

const RESPONSE_MESSAGES = {
  SUCCESS: {
    UPLOAD: 'File uploaded successfully.',
    DELETE: 'File deleted successfully.',
    RETRIEVE: 'File retrieved successfully.',
    SIGNED_URL: 'Signed URL generated successfully.',
  },
  ERROR: {
    FILE_NOT_FOUND: 'File not found.',
    INVALID_INPUT: 'Invalid input provided.',
    UNSUPPORTED_PROVIDER: 'Unsupported storage provider.',
    INVALID_FILE_TYPE: 'Invalid file type.',
    UPLOAD_ERROR: 'An error occurred during file upload.',
    UNKNOWN_ERROR: 'An unknown error occurred during file upload.',
  },
};

class FileController extends BaseController<File> {
  constructor() {
    super(fileService, ALLOWED_KINDS.FILES.BASE as AllowedKind);
  }

  public async uploadFiles(req: Request, res: Response): Promise<void> {
    const { provider, category } = req.body;
    const files = req.files as Express.Multer.File[];

    // Validate inputs
    if (!provider) {
      logger.warn('Provider is missing in request body', { provider });
      return this.sendError(
        req,
        res,
        httpStatus.BAD_REQUEST,
        'INVALID_INPUT',
        'Storage provider is required.'
      );
    }

    if (!files || files.length === 0) {
      logger.warn('No files provided in request');
      return this.sendError(
        req,
        res,
        httpStatus.BAD_REQUEST,
        'INVALID_INPUT',
        'At least one file is required for upload.'
      );
    }

    try {
      // Attempt to upload the files
      logger.info('Attempting multiple file uploads', {
        provider,
        category,
        fileCount: files.length,
      });

      const uploadedFiles = await fileService.uploadFiles(
        files,
        provider,
        category
      );

      logger.info('Multiple files uploaded successfully', {
        provider,
        fileCount: uploadedFiles.length,
      });

      this.sendCreated(req, res, uploadedFiles, 'Files uploaded successfully.');
    } catch (error) {
      logger.error('Multiple file upload error', {
        error,
        provider,
      });
      return this.sendError(
        req,
        res,
        httpStatus.INTERNAL_SERVER_ERROR,
        'UPLOAD_ERROR',
        'An unexpected error occurred during file upload.'
      );
    }
  }

  /**
   * Deletes a file by its storage key from the specified storage provider.
   */
  public async deleteFile(req: Request, res: Response): Promise<void> {
    const { storageKey, provider } = req.body;

    if (!storageKey || !provider) {
      return this.sendError(
        req,
        res,
        httpStatus.BAD_REQUEST,
        'INVALID_INPUT',
        RESPONSE_MESSAGES.ERROR.INVALID_INPUT
      );
    }

    try {
      await fileService.deleteFileByStorageKey(storageKey, provider);
      this.sendSuccess(req, res, {}, RESPONSE_MESSAGES.SUCCESS.DELETE);
    } catch (error) {
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.FILE_NOT_FOUND);
    }
  }

  /**
   * Deletes a file by key using RESTful path param and provider query.
   */
  public async deleteFileByKeyParam(req: Request, res: Response): Promise<void> {
    const { storageKey } = req.params as { storageKey: string };
    const { provider } = req.query as { provider?: string };
    if (!storageKey || !provider) {
      return this.sendError(
        req,
        res,
        httpStatus.BAD_REQUEST,
        'INVALID_INPUT',
        RESPONSE_MESSAGES.ERROR.INVALID_INPUT
      );
    }
    try {
      await fileService.deleteFileByStorageKey(storageKey, provider);
      res.status(httpStatus.NO_CONTENT).send();
    } catch (error) {
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.FILE_NOT_FOUND);
    }
  }

  /**
   * Retrieves a signed URL for accessing a file.
   */
  public async getSignedUrl(req: Request, res: Response): Promise<void> {
    const { storageKey, provider } = req.query;

    if (!storageKey || !provider) {
      return this.sendError(
        req,
        res,
        httpStatus.BAD_REQUEST,
        'INVALID_INPUT',
        RESPONSE_MESSAGES.ERROR.INVALID_INPUT
      );
    }

    try {
      const signedUrl = await fileService.getSignedUrl(
        storageKey as string,
        provider as string
      );
      this.sendSuccess(
        req,
        res,
        { signedUrl },
        RESPONSE_MESSAGES.SUCCESS.SIGNED_URL
      );
    } catch (error) {
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.FILE_NOT_FOUND);
    }
  }

  /**
   * Retrieves file metadata by its ID.
   */
  public async getFileById(req: Request, res: Response): Promise<void> {
    try {
      const file = await fileService.getById(req.params.id);
      this.sendOrNotFound(file, req, res, RESPONSE_MESSAGES.SUCCESS.RETRIEVE);
    } catch (error) {
      this.handleError(error, req, res, RESPONSE_MESSAGES.ERROR.FILE_NOT_FOUND);
    }
  }

  /**
   * Retrieves all files.
   */
  public async getAllFiles(req: Request, res: Response): Promise<void> {
    try {
      const files = await fileService.getAll();
      this.sendSuccess(req, res, files, 'All files retrieved successfully.');
    } catch (error) {
      this.handleException(error, req, res);
    }
  }

  /**
   * Retrieves paginated files.
   */
  public async getPaginatedFiles(req: Request, res: Response): Promise<void> {
    const { page, limit } = req.query;

    const paginationOptions = {
      page: Number(page) || 1,
      limit: Number(limit) || 10,
    };

    try {
      const paginatedResult = await fileService.getPaginated(paginationOptions);
      this.sendSuccess(
        req,
        res,
        paginatedResult.items,
        'Paginated files retrieved successfully.',
        {
          page: paginatedResult.page,
          limit: paginatedResult.limit,
          total: paginatedResult.total,
          totalPages: paginatedResult.totalPages,
        }
      );
    } catch (error) {
      this.handleException(error, req, res);
    }
  }

  /**
   * Helper method to send success or not-found response based on data presence.
   */
  protected sendOrNotFound(
    data: File | null,
    req: Request,
    res: Response,
    successMessage: string
  ): void {
    if (!data) {
      this.sendError(
        req,
        res,
        httpStatus.NOT_FOUND,
        'FILE_NOT_FOUND',
        RESPONSE_MESSAGES.ERROR.FILE_NOT_FOUND
      );
    } else {
      this.sendSuccess(req, res, data, successMessage);
    }
  }
}

export default new FileController();

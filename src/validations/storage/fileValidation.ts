import Joi, { ArraySchema, ObjectSchema } from 'joi';
import {
  MimeType,
  StorageProvider,
} from '../../constants/storage/storageTypes';

// Common reusable validation rules
const fileNameSchema = Joi.string().max(255).messages({
  'string.max': 'File name must not exceed 255 characters.',
});

const mimeTypeSchema = Joi.string()
  .valid(...Object.values(MimeType))
  .messages({
    'any.only': `MIME type must be one of ${Object.values(MimeType).join(', ')}.`,
  });

const storageProviderSchema = Joi.string()
  .valid(...Object.values(StorageProvider))
  .required()
  .messages({
    'any.only': `Storage provider must be one of ${Object.values(StorageProvider).join(', ')}.`,
    'any.required': 'Storage provider is required.',
  });

const fileSizeSchema = Joi.number().integer().positive().messages({
  'number.base': 'File size must be a number.',
  'number.integer': 'File size must be an integer.',
  'number.positive': 'File size must be a positive number.',
});

const urlSchema = Joi.string().uri().max(512).messages({
  'string.uri': 'File URL must be a valid URI.',
  'string.max': 'File URL must not exceed 512 characters.',
});

const storageKeySchema = Joi.string().max(255).required().messages({
  'string.max': 'Storage key must not exceed 255 characters.',
  'any.required': 'Storage key is required.',
});

const categorySchema = Joi.string().max(100).required().messages({
  'string.max': 'Category must not exceed 100 characters.',
  'any.required': 'Category is required.',
});

const expiresAtSchema = Joi.date().optional().messages({
  'date.base': 'Expiration date must be a valid date.',
});

/**
 * Schema for uploading files
 */
export const uploadFilesSchema: {
  body: ObjectSchema;
  files: ArraySchema;
} = {
  body: Joi.object({
    provider: storageProviderSchema,
    category: categorySchema,
  }),
  files: Joi.array()
    .items(
      Joi.object({
        originalname: fileNameSchema.required().messages({
          'any.required': 'File name is required.',
        }),
        mimetype: mimeTypeSchema.required().messages({
          'any.required': 'MIME type is required.',
        }),
        size: fileSizeSchema.required().messages({
          'any.required': 'File size is required.',
        }),
      }).unknown(true)
    )
    .min(1)
    .max(10)
    .required()
    .messages({
      'array.min': 'At least one file must be uploaded.',
      'array.max': 'A maximum of 10 files can be uploaded at once.',
    }),
};

/**
 * Schema for deleting a file
 */
export const deleteFileSchema: { body: ObjectSchema } = {
  body: Joi.object({
    storageKey: storageKeySchema,
    provider: storageProviderSchema,
  }),
};

export const deleteFileByKeySchema: { params: ObjectSchema; query: ObjectSchema } = {
  params: Joi.object({
    storageKey: storageKeySchema,
  }),
  query: Joi.object({
    provider: storageProviderSchema,
  }),
};

/**
 * Schema for generating a signed URL
 */
export const getSignedUrlSchema: { query: ObjectSchema } = {
  query: Joi.object({
    storageKey: storageKeySchema,
    provider: storageProviderSchema,
    expiresInSeconds: Joi.number().integer().positive().default(3600).messages({
      'number.base': 'Expiration time must be a number.',
      'number.integer': 'Expiration time must be an integer.',
      'number.positive': 'Expiration time must be a positive number.',
    }),
  }),
};

/**
 * Schema for retrieving file metadata by ID
 */
export const getFileByIdSchema: { params: ObjectSchema } = {
  params: Joi.object({
    id: Joi.string().uuid().required().messages({
      'string.uuid': 'File ID must be a valid UUID.',
      'any.required': 'File ID is required.',
    }),
  }),
};

/**
 * Schema for retrieving paginated files
 */
export const getPaginatedFilesSchema: { query: ObjectSchema } = {
  query: Joi.object({
    page: Joi.number().integer().positive().default(1).messages({
      'number.base': 'Page must be a number.',
      'number.integer': 'Page must be an integer.',
      'number.positive': 'Page must be a positive number.',
    }),
    limit: Joi.number().integer().positive().default(10).messages({
      'number.base': 'Limit must be a number.',
      'number.integer': 'Limit must be an integer.',
      'number.positive': 'Limit must be a positive number.',
    }),
  }),
};

/**
 * Validates if the given MIME type is supported.
 * @param mimeType - The MIME type to validate.
 * @returns True if valid, otherwise false.
 */
export const isValidMimeType = (mimeType: string): boolean => {
  return Object.values(MimeType).includes(mimeType as MimeType);
};

/**
 * Validates the file size against a maximum allowed size.
 * @param size - The file size in bytes.
 * @param maxSizeInBytes - The maximum allowed size in bytes.
 * @returns True if size is valid, otherwise false.
 */
export const isValidFileSize = (
  size: number,
  maxSizeInBytes: number
): boolean => {
  return size <= maxSizeInBytes;
};

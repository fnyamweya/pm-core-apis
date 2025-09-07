import { Request } from 'express';
import { AllowedKind } from '../constants/allowedKinds';
import CorrelationIdUtil from '../utils/correlationId';

// Types and interfaces
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  apiVersion: string;
  kind: AllowedKind;
  data?: T;
  errorCode?: string;
  message?: string;
  pagination?: Pagination;
  metadata?: Record<string, any>;
}

// Constants
export const API_CONSTANTS = {
  VERSION_REGEX: /\/api\/v(\d+)\//,
  DEFAULT_API_VERSION: '1',
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MIN_LIMIT: 1,
    MAX_LIMIT: 100,
  },
} as const;

export class ApiResponseFormatter {
  /**
   * Extracts API version from the request URL or defaults to a predefined version.
   * @param url The request URL
   * @returns API version as a string
   */
  private static extractApiVersion(url: string): string {
    const versionMatch = url.match(API_CONSTANTS.VERSION_REGEX);
    return versionMatch ? versionMatch[1] : API_CONSTANTS.DEFAULT_API_VERSION;
  }

  /**
   * Omits specified fields from the data object.
   * @param data The data object
   * @param fields Fields to omit from the object
   * @returns A new object with specified fields omitted
   */
  private static omitFields<T extends Record<string, any>>(
    data: T,
    fields: (keyof T)[]
  ): Partial<T> {
    const result = { ...data };
    fields.forEach((field) => delete result[field]);
    return result;
  }

  /**
   * Formats a success response with correlation ID.
   * @param req Express request
   * @param data The response data
   * @param kind The type of resource (e.g., 'USER', 'PRODUCT')
   * @param pagination Optional pagination data
   * @param metadata Optional metadata
   * @param fieldsToOmit Fields to omit from the response data
   * @returns Formatted API response
   */
  public static success<T extends Record<string, any>>({
    req,
    data,
    kind,
    pagination,
    metadata,
    omitFields: fieldsToOmit,
  }: {
    req: Request;
    data: T;
    kind: AllowedKind;
    pagination?: Pagination;
    metadata?: Record<string, any>;
    omitFields?: (keyof T)[];
  }): ApiResponse<Partial<T>> {
    const apiVersion = this.extractApiVersion(req.originalUrl);
    const correlationId = CorrelationIdUtil.getCorrelationId() || 'N/A';
    const formattedData = fieldsToOmit
      ? this.omitFields(data, fieldsToOmit)
      : data;

    return {
      apiVersion,
      kind,
      data: formattedData,
      ...(pagination && { pagination }),
      metadata: {
        correlationId,
        ...(metadata || {}),
      },
    };
  }

  /**
   * Formats an error response with correlation ID.
   * @param req Express request
   * @param errorCode Application-specific error code
   * @param message Error message
   * @param kind The type of resource (e.g., 'USER', 'PRODUCT')
   * @param metadata Optional metadata
   * @returns Formatted API error response
   */
  public static error({
    req,
    errorCode,
    message,
    kind,
    metadata,
  }: {
    req: Request;
    errorCode: string;
    message: string;
    kind: AllowedKind;
    metadata?: Record<string, any>;
  }): ApiResponse<null> {
    const apiVersion = this.extractApiVersion(req.originalUrl);
    const correlationId = CorrelationIdUtil.getCorrelationId() || 'N/A';

    return {
      apiVersion,
      kind,
      errorCode,
      message,
      metadata: {
        correlationId,
        ...(metadata || {}),
      },
    };
  }

  /**
   * Retrieves validated pagination parameters from a query object.
   * @param query The query object
   * @returns An object containing `page` and `limit`
   */
  public static getPaginationParams(query: Record<string, unknown>): {
    page: number;
    limit: number;
  } {
    const { DEFAULT_PAGE, DEFAULT_LIMIT, MIN_LIMIT, MAX_LIMIT } =
      API_CONSTANTS.PAGINATION;

    const page = Math.max(Number(query.page) || DEFAULT_PAGE, 1);
    const limit = Math.min(
      Math.max(Number(query.limit) || DEFAULT_LIMIT, MIN_LIMIT),
      MAX_LIMIT
    );

    return { page, limit };
  }

  /**
   * Creates a pagination metadata object.
   * @param page Current page number
   * @param limit Number of items per page
   * @param total Total number of items
   * @returns Pagination metadata
   */
  public static createPagination({
    page,
    limit,
    total,
  }: {
    page: number;
    limit: number;
    total: number;
  }): Pagination {
    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }
}

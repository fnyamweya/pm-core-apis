import {
  DeepPartial,
  FindManyOptions,
  FindOptionsRelations,
  FindOptionsSelect,
  FindOptionsWhere,
  ObjectLiteral,
  QueryFailedError,
} from 'typeorm';
import { InternalServerError, NotFoundError } from '../errors/httpErrors';
import {
  BaseRepository,
  PaginatedResult,
  PaginationOptions,
} from '../repositories/baseRepository';
import { logger } from '../utils/logger';
import RedisCache from '../utils/redisCache';

interface BaseServiceDeps<T extends ObjectLiteral> {
  repository: BaseRepository<T>;
  redisCache: RedisCache<T>;
  logger: typeof logger;
}

/**
 * BaseService provides common CRUD operations and other business logic for services.
 * It handles caching, database interactions, and error management.
 * @template T - The entity type managed by this service.
 */
export class BaseService<T extends ObjectLiteral> {
  protected cache: RedisCache<T>;
  protected repository: BaseRepository<T>;
  protected logger: typeof logger;
  protected entityName: string;

  /**
   * Constructs the BaseService with dependencies and the entity name.
   * @param deps - Dependencies including repository, cache, and logger.
   * @param entityName - The name of the entity managed by this service.
   */
  constructor(deps: BaseServiceDeps<T>, entityName: string) {
    this.repository = deps.repository;
    this.cache = deps.redisCache;
    this.logger = deps.logger;
    this.entityName = entityName;
  }

  /**
   * Retrieves an entity by its ID.
   * @param id - The ID of the entity to retrieve.
   * @returns The found entity.
   * @throws {NotFoundError} If the entity is not found.
   * @throws {InternalServerError} If a database error occurs.
   */
  public async getById(id: string | number): Promise<T> {
    const result = await this.handleDatabaseOperation(
      this.repository.findOne({
        where: { id } as unknown as FindOptionsWhere<T>,
      }),
      `Error fetching ${this.entityName} by ID`
    );

    if (!result) {
      this.logger.warn(`${this.entityName} not found with ID: ${id}`);
      throw new NotFoundError(`${this.entityName} not found`);
    }

    return result;
  }

  /**
   * Retrieves all entities of the given type.
   * @returns A list of all entities.
   * @throws {InternalServerError} If a database error occurs.
   */
  public async getAll(): Promise<T[]> {
    return this.handleDatabaseOperation(
      this.repository.find({}),
      `Error fetching all ${this.entityName}s`
    );
  }

  /**
   * Creates a new entity and stores it in the database.
   * @param data - The data for the new entity.
   * @returns The created entity.
   * @throws {InternalServerError} If a database error occurs.
   */
  public async create(data: DeepPartial<T>): Promise<T> {
    const entity = await this.handleDatabaseOperation(
      this.repository.create(data),
      `Error creating ${this.entityName}`
    );
    await this.cache.setToCache(
      this.entityName,
      this.getCacheKey(entity),
      entity
    );
    return entity;
  }

  /**
   * Updates an existing entity by its ID.
   * @param id - The ID of the entity to update.
   * @param data - The updated data for the entity.
   * @returns The updated entity.
   * @throws {NotFoundError} If the entity is not found.
   * @throws {InternalServerError} If a database error occurs.
   */
  public async update(id: string | number, data: DeepPartial<T>): Promise<T> {
    const entity = await this.getById(id);
    await this.handleDatabaseOperation(
      this.repository.update(this.getCacheKey(entity), data),
      `Error updating ${this.entityName}`
    );

    const updatedEntity = await this.getById(id);
    await this.cache.setToCache(
      this.entityName,
      this.getCacheKey(updatedEntity),
      updatedEntity
    );
    const collectionCacheKey = `${this.entityName}:all`;
    await this.updateSingleRecordInCollection(
      updatedEntity,
      collectionCacheKey
    );
    return updatedEntity;
  }

  /**
   * Deletes an entity by its ID.
   * @param id - The ID of the entity to delete.
   * @returns A promise that resolves when the entity is deleted.
   * @throws {NotFoundError} If the entity is not found.
   * @throws {InternalServerError} If a database error occurs.
   */
  public async delete(id: string | number): Promise<void> {
    const entity = await this.getById(id);
    await this.handleDatabaseOperation(
      this.repository.delete(this.getCacheKey(entity)),
      `Error deleting ${this.entityName}`
    );
    await this.cache.deleteKey(this.entityName, this.getCacheKey(entity));
  }

  /**
   * Retrieves a paginated list of entities based on provided options.
   * @param options - Pagination options including page and limit.
   * @param where - Optional filters for querying entities.
   * @param relations - Optional relations to include in the query.
   * @param select - Optional fields to select in the query.
   * @returns A paginated result containing items and pagination metadata.
   * @throws {InternalServerError} If a database error occurs.
   */
  public async getPaginated(
    options: PaginationOptions,
    where?: FindOptionsWhere<T>,
    relations?: FindOptionsRelations<T>,
    select?: FindOptionsSelect<T>
  ): Promise<PaginatedResult<T>> {
    return this.handleDatabaseOperation(
      this.repository.findWithPagination(options, where, relations, select),
      `Error fetching paginated ${this.entityName}s`
    );
  }

  /**
   * Counts the number of entities that match the given criteria.
   * @param where - Optional filters for counting entities.
   * @returns The count of matching entities.
   * @throws {InternalServerError} If a database error occurs.
   */
  public async count(where?: FindOptionsWhere<T>): Promise<number> {
    return this.handleDatabaseOperation(
      this.repository.count(where),
      `Error counting ${this.entityName}s`
    );
  }

  /**
   * Finds a single entity matching the given criteria.
   * @param where - The filter criteria for the entity.
   * @param relations - Optional relations to include in the query.
   * @returns The found entity or null if not found.
   * @throws {InternalServerError} If a database error occurs.
   */
  public async findOne(
    where: FindOptionsWhere<T>,
    relations?: FindOptionsRelations<T>
  ): Promise<T | null> {
    return this.handleDatabaseOperation(
      this.repository.findOne({ where, relations }),
      `Error finding ${this.entityName}`
    );
  }

  /**
   * Finds multiple entities matching the given options.
   * @param options - Query options including filters, relations, and pagination.
   * @returns A list of matching entities.
   * @throws {InternalServerError} If a database error occurs.
   */
  public async find(options?: FindManyOptions<T>): Promise<T[]> {
    return this.handleDatabaseOperation(
      this.repository.find(options),
      `Error finding ${this.entityName}s`
    );
  }

  /**
   * Updates a single record in a cached collection.
   * @param updatedRecord - The updated or newly created record.
   * @param collectionCacheKey - The cache key for the collection.
   */
  private async updateSingleRecordInCollection(
    updatedRecord: T,
    collectionCacheKey: string
  ): Promise<void> {
    // Fetch the cached collection
    const collection = await this.cache.getFromCache(
      this.entityName,
      collectionCacheKey
    );

    // Check if collection is an array before casting
    const typedCollection = Array.isArray(collection) ? collection : [];

    if (typedCollection.length > 0) {
      // Determine if the collection is an array of objects or strings
      const isCollectionOfObjects =
        typeof typedCollection[0] === 'object' && typedCollection[0] !== null;

      // Update the specific record in the collection
      const updatedCollection = typedCollection.map((item: T) => {
        if (isCollectionOfObjects) {
          // If the collection is an array of objects, compare by ID
          return (item as any).id === (updatedRecord as any).id
            ? updatedRecord
            : item;
        } else {
          // If the collection is an array of strings, compare by value
          return item === updatedRecord ? updatedRecord : item;
        }
      });

      // Save the updated collection back to the cache
      await this.cache.setToCache(
        this.entityName,
        collectionCacheKey,
        updatedCollection
      );

      this.logger.info(`Updated single record in cached collection`, {
        recordId: (updatedRecord as any).id || updatedRecord,
      });
    } else {
      this.logger.warn(
        `No collection found in cache for key ${collectionCacheKey}`
      );
    }
  }

  /**
   * Handles database operations and manages errors.
   * @param operation - The database operation to perform.
   * @param errorMessage - The error message to log and throw if the operation fails.
   * @returns The result of the database operation.
   * @throws {InternalServerError | NotFoundError} If the operation fails.
   */
  protected async handleDatabaseOperation<K>(
    operation: Promise<K>,
    errorMessage: string
  ): Promise<K> {
    try {
      return await operation;
    } catch (error: any) {
      this.logAndRethrowError(errorMessage, error);
    }
  }

  /**
   * Generates a cache key for an entity.
   * @private
   * @param entity - The entity to generate a cache key for.
   * @returns The cache key as a string.
   */
  private getCacheKey(entity: T): string {
    return (entity as any).id || (entity as any).code; // Adjust based on entity attributes
  }

  /**
   * Logs an error and rethrows it as an appropriate HTTP error.
   * @private
   * @param message - The error message to log.
   * @param error - The original error object.
   * @throws {InternalServerError | NotFoundError} The rethrown error.
   */
  private logAndRethrowError(message: string, error: unknown): never {
    if (error instanceof QueryFailedError) {
      this.logger.error(`${message}: Database query failed.`, { error });
      throw new InternalServerError(`${message}: Database query failed.`, {
        error,
      });
    } else if (error instanceof NotFoundError) {
      this.logger.warn(`${message}: Entity not found.`, { error });
      throw error;
    } else {
      this.logger.error(`${message}: Unexpected error occurred.`, { error });
      throw new InternalServerError(`${message}: Unexpected error occurred.`, {
        error,
      });
    }
  }
}

export default BaseService;

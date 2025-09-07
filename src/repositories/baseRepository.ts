import { StatusCodes } from 'http-status-codes';
import {
  DataSource,
  DeepPartial,
  EntityManager,
  EntityTarget,
  FindManyOptions,
  FindOneOptions,
  FindOptionsOrder,
  FindOptionsRelations,
  FindOptionsSelect,
  FindOptionsWhere,
  ObjectId,
  ObjectLiteral,
  QueryFailedError,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import databaseInstance from '../config/database';
import { ApiError } from '../errors/apiError';
import { logger } from '../utils/logger';

export interface PaginationOptions {
  page?: number;
  limit?: number;
  order?: FindOptionsOrder<any>;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export abstract class BaseRepository<T extends ObjectLiteral> {
  protected repository: Repository<T>;
  protected dataSource: DataSource;

  constructor(protected entity: EntityTarget<T>) {
    this.initializeRepository();
  }

  /**
   * Initializes the repository by obtaining it from the data source.
   * @throws ApiError if the data source cannot be retrieved.
   */
  private async initializeRepository(): Promise<void> {
    try {
      this.dataSource = await databaseInstance.getDataSource();
      this.repository = this.dataSource.getRepository<T>(this.entity);
    } catch (error) {
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        `Failed to initialize repository for ${this.entity}`,
        true,
        { originalError: error }
      );
    }
  }

  /**
   * Ensures that the repository is initialized before it is used.
   */
  private async ensureRepositoryInitialized(): Promise<void> {
    if (!this.repository) {
      await this.initializeRepository();
    }
  }

  /**
   * Returns true if the entity has a column with the given property name.
   */
  private hasColumn(columnName: string): boolean {
    try {
      return !!this.repository?.metadata?.findColumnWithPropertyName(columnName);
    } catch {
      return false;
    }
  }

  /**
   * Default ordering: newest first when the entity has a createdAt column.
   */
  private defaultOrder(): FindOptionsOrder<T> | undefined {
    return this.hasColumn('createdAt') ? ({ createdAt: 'DESC' } as any) : undefined;
  }

  /**
   * Handles errors encountered in database operations with structured logging.
   * @param error - The error encountered during a database operation.
   * @param contextMessage - Contextual information about the error.
   * @throws ApiError with specific status and message based on the error type.
   */
  protected handleError(error: unknown, contextMessage: string): never {
    if (error instanceof QueryFailedError) {
      logger.error(`${contextMessage}: Database query failed.`, { error });
      throw new ApiError(
        StatusCodes.BAD_REQUEST,
        `${contextMessage}: Database query failed.`,
        true,
        { originalError: error }
      );
    } else {
      logger.error(`${contextMessage}: Unexpected error occurred.`, { error });
      throw new ApiError(
        StatusCodes.INTERNAL_SERVER_ERROR,
        `${contextMessage}: Unexpected error occurred.`,
        false,
        { originalError: error }
      );
    }
  }

  /**
   * Creates and saves a new entity in the repository.
   * @param data - Partial data for creating the entity.
   * @returns The created and saved entity.
   */
  async create(data: DeepPartial<T>): Promise<T> {
    await this.ensureRepositoryInitialized();
    try {
      const entity = this.repository.create(data);
      return await this.repository.save(entity);
    } catch (error) {
      this.handleError(error, `Error creating entity of type ${this.entity}`);
    }
  }

  /**
   * Saves an existing entity to the repository.
   * @param entity - The entity to save.
   * @returns The saved entity.
   */
  async save(entity: T): Promise<T> {
    await this.ensureRepositoryInitialized();
    try {
      return await this.repository.save(entity);
    } catch (error) {
      this.handleError(error, `Error saving entity of type ${this.entity}`);
    }
  }

  /**
   * Creates multiple entities in a transaction.
   * @param entities - Array of entities to create.
   * @returns Array of created entities.
   */
  async createMany(entities: DeepPartial<T>[]): Promise<T[]> {
    await this.ensureRepositoryInitialized();
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const savedEntities = await Promise.all(
        entities.map((entity) => {
          const newEntity = this.repository.create(entity);
          return queryRunner.manager.save(newEntity);
        })
      );

      await queryRunner.commitTransaction();
      return savedEntities;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.handleError(
        error,
        `Error creating multiple entities of type ${this.entity}`
      );
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Finds one entity with specified options.
   * @param options - Find options, such as where conditions, relations, etc.
   * @returns The found entity or null if not found.
   */
  async findOne(options: FindOneOptions<T>): Promise<T | null> {
    await this.ensureRepositoryInitialized();
    try {
      return await this.repository.findOne(options);
    } catch (error) {
      this.handleError(error, `Error finding entity of type ${this.entity}`);
    }
  }

  /**
   * Finds multiple entities matching the specified options.
   * @param options - Options to find entities by (e.g., where conditions, relations).
   * @returns Array of found entities.
   */
  async find(options?: FindManyOptions<T>): Promise<T[]> {
    await this.ensureRepositoryInitialized();
    try {
      const order = options?.order ?? this.defaultOrder();
      const withOrder: FindManyOptions<T> = order ? { ...(options || {}), order } : (options || {});
      return await this.repository.find(withOrder);
    } catch (error) {
      this.handleError(error, `Error finding entities of type ${this.entity}`);
    }
  }

  /**
   * Finds an entity by its ID.
   * @param id - The ID of the entity.
   * @returns The found entity or null if not found.
   */
  async findById(id: string | number | ObjectId): Promise<T | null> {
    await this.ensureRepositoryInitialized();
    try {
      const where = { id } as unknown as FindOptionsWhere<T>;
      const entity = await this.repository.findOne({ where });

      if (!entity) {
        throw new ApiError(
          StatusCodes.NOT_FOUND,
          `Entity of type ${this.entity} with ID ${id} not found.`,
          true
        );
      }
      return entity;
    } catch (error) {
      this.handleError(error, `Error finding entity by ID: ${id}`);
    }
  }

  /**
   * Updates an entity by its ID with the specified data.
   * @param id - The ID of the entity to update.
   * @param data - Partial data for updating the entity.
   */
  async update(
    id: string | number | ObjectId,
    data: DeepPartial<T>
  ): Promise<void> {
    await this.ensureRepositoryInitialized();
    try {
      await this.repository.update(id, data as any);
    } catch (error) {
      this.handleError(
        error,
        `Error updating entity of type ${this.entity} with ID: ${id}`
      );
    }
  }

  /**
   * Deletes an entity by its ID.
   * @param id - The ID of the entity to delete.
   */
  async delete(id: string | number | ObjectId): Promise<void> {
    await this.ensureRepositoryInitialized();
    try {
      await this.repository.delete(id);
    } catch (error) {
      this.handleError(
        error,
        `Error deleting entity of type ${this.entity} with ID: ${id}`
      );
    }
  }

  /**
   * Finds all entities in the repository.
   * @returns Array of all entities.
   */
  async findAll(): Promise<T[]> {
    await this.ensureRepositoryInitialized();
    try {
      const order = this.defaultOrder();
      return await this.repository.find(order ? { order } : undefined);
    } catch (error) {
      this.handleError(
        error,
        `Error finding all entities of type ${this.entity}`
      );
    }
  }

  /**
   * Finds entities with pagination.
   * @param options - Pagination options such as page number, limit, and order.
   * @param where - Optional where clause for filtering entities.
   * @param relations - Optional relations to include.
   * @param select - Optional select fields.
   * @returns Paginated result with items, total count, and page information.
   */
  async findWithPagination(
    options: PaginationOptions,
    where?: FindOptionsWhere<T>,
    relations?: FindOptionsRelations<T>,
    select?: FindOptionsSelect<T>
  ): Promise<PaginatedResult<T>> {
    await this.ensureRepositoryInitialized();
    try {
      const page = options.page || 1;
      const limit = options.limit || 10;
      const skip = (page - 1) * limit;

      const [items, total] = await this.repository.findAndCount({
        where,
        relations,
        select,
        skip,
        take: limit,
        order: options.order || this.defaultOrder(),
      });

      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.handleError(
        error,
        `Error fetching paginated results for ${this.entity}`
      );
    }
  }

  /**
   * Executes a custom query using the query builder.
   * @param queryBuilder - A function that receives the repository and returns a query builder.
   * @returns Array of entities resulting from the custom query.
   */
  async executeCustomQuery(
    queryBuilder: (repository: Repository<T>) => SelectQueryBuilder<T>
  ): Promise<T[]> {
    await this.ensureRepositoryInitialized();
    try {
      return await queryBuilder(this.repository).getMany();
    } catch (error) {
      this.handleError(
        error,
        `Error executing custom query for ${this.entity}`
      );
    }
  }

  /**
   * Performs a bulk update on entities matching the specified criteria.
   * @param criteria - Criteria to match entities.
   * @param data - Data for updating the matched entities.
   */
  async bulkUpdate(
    criteria: FindOptionsWhere<T>,
    data: DeepPartial<T>
  ): Promise<void> {
    await this.ensureRepositoryInitialized();
    try {
      await this.repository.update(criteria, data as any);
    } catch (error) {
      this.handleError(
        error,
        `Error performing bulk update on entities of type ${this.entity}`
      );
    }
  }

  /**
   * Performs a bulk delete on entities matching the specified criteria.
   * @param criteria - Criteria to match entities.
   */
  async bulkDelete(criteria: FindOptionsWhere<T>): Promise<void> {
    await this.ensureRepositoryInitialized();
    try {
      await this.repository.delete(criteria);
    } catch (error) {
      this.handleError(
        error,
        `Error performing bulk delete on entities of type ${this.entity}`
      );
    }
  }

  /**
   * Counts entities that match the specified where clause.
   * @param where - Optional where clause for filtering.
   * @returns The count of matched entities.
   */
  async count(where?: FindOptionsWhere<T>): Promise<number> {
    await this.ensureRepositoryInitialized();
    try {
      return await this.repository.count({ where });
    } catch (error) {
      this.handleError(error, `Error counting entities of type ${this.entity}`);
    }
  }

  /**
   * Soft deletes an entity by its ID if soft delete is supported.
   * @param id - The ID of the entity to soft delete.
   */
  async softDelete(id: string | number | ObjectId): Promise<void> {
    await this.ensureRepositoryInitialized();
    try {
      await this.repository.softDelete(id);
    } catch (error) {
      this.handleError(
        error,
        `Error soft deleting entity of type ${this.entity} with ID: ${id}`
      );
    }
  }

  /**
   * Restores a soft-deleted entity by its ID if soft delete is supported.
   * @param id - The ID of the entity to restore.
   */
  async restore(id: string | number | ObjectId): Promise<void> {
    await this.ensureRepositoryInitialized();
    try {
      await this.repository.restore(id);
    } catch (error) {
      this.handleError(
        error,
        `Error restoring entity of type ${this.entity} with ID: ${id}`
      );
    }
  }

  /**
   * Executes a custom transaction.
   * @param transactionCallback - A callback function that receives the EntityManager and performs operations within the transaction.
   * @returns The result of the transaction callback.
   */
  async executeTransaction<R>(
    transactionCallback: (entityManager: EntityManager) => Promise<R>
  ): Promise<R> {
    await this.ensureRepositoryInitialized();
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await transactionCallback(queryRunner.manager);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.handleError(error, `Error executing transaction for ${this.entity}`);
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Finds entities with pagination and additional options.
   * @param options - Pagination options such as page number, limit, and order.
   * @param where - Optional where clause for filtering entities.
   * @param relations - Optional relations to include.
   * @param select - Optional select fields.
   * @param queryBuilder - Optional custom query builder function.
   * @returns Paginated result with items, total count, and page information.
   */
  async findWithAdvancedPagination(
    options: PaginationOptions,
    where?: FindOptionsWhere<T>,
    relations?: FindOptionsRelations<T>,
    select?: FindOptionsSelect<T>,
    queryBuilder?: (qb: SelectQueryBuilder<T>) => SelectQueryBuilder<T>
  ): Promise<PaginatedResult<T>> {
    await this.ensureRepositoryInitialized();
    try {
      const page = options.page || 1;
      const limit = options.limit || 10;
      const skip = (page - 1) * limit;

      let qb = this.repository.createQueryBuilder(this.entity.toString());

      if (queryBuilder) {
        qb = queryBuilder(qb);
      }

      if (where) {
        qb = qb.where(where);
      }

      qb = qb.skip(skip).take(limit);

      if (options.order) {
        const orderByCondition: { [key: string]: 'ASC' | 'DESC' } = {};
        for (const [key, value] of Object.entries(options.order)) {
          orderByCondition[key] = value as 'ASC' | 'DESC';
        }
        qb = qb.orderBy(orderByCondition);
      } else if (this.hasColumn('createdAt')) {
        qb = qb.orderBy(`${this.entity.toString()}.createdAt`, 'DESC');
      }

      if (relations) {
        for (const relation of Object.keys(relations)) {
          qb = qb.leftJoinAndSelect(
            `${this.entity.toString()}.${relation}`,
            relation
          );
        }
      }

      if (select) {
        const selectFields: string[] = [];
        for (const [key, value] of Object.entries(select)) {
          if (value) {
            selectFields.push(`${this.entity.toString()}.${key}`);
          }
        }
        qb = qb.select(selectFields);
      }

      const [items, total] = await qb.getManyAndCount();

      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.handleError(
        error,
        `Error fetching advanced paginated results for ${this.entity}`
      );
    }
  }
}

export default BaseRepository;

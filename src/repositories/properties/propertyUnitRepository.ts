import { PropertyUnit } from '../../entities/properties/propertyUnitEntity'
import BaseRepository from '../baseRepository'
import { logger } from '../../utils/logger'
import databaseInstance from '../../config/database'

type ListUnitsOptions = {
  page?: number
  pageSize?: number
  orderBy?: 'unitNumber' | 'name' | 'createdAt'
  orderDir?: 'ASC' | 'DESC'
  search?: string
  onlyListed?: boolean
  onlyAvailable?: boolean
  onlyOccupied?: boolean
  include?: {
    leases?: boolean
    requests?: boolean
  }
}

class PropertyUnitRepository extends BaseRepository<PropertyUnit> {
  constructor() {
    super(PropertyUnit)
  }

  private async ensureReady(): Promise<void> {
    if (!this.repository) {
      this.dataSource = await databaseInstance.getDataSource()
      this.repository = this.dataSource.getRepository(PropertyUnit)
    }
  }

  private async qb() {
    await this.ensureReady()
    return this.repository.createQueryBuilder('u')
  }

  async getUnitsByProperty(
    propertyId: string,
    opts: ListUnitsOptions = {}
  ): Promise<{ data: PropertyUnit[]; total: number }> {
    const {
      page = 1,
      pageSize = 20,
      orderBy = 'unitNumber',
      orderDir = 'ASC',
      search,
      onlyListed,
      onlyAvailable,
      onlyOccupied,
      include = {},
    } = opts
    try {
      const qb = await this.qb()
      qb.leftJoin('u.property', 'p')
        .leftJoinAndSelect('u.tenant', 't')
        .where('p.id = :propertyId', { propertyId })
        .andWhere('u.deletedAt IS NULL')
      if (onlyListed === true) qb.andWhere('u.isListed = TRUE')
      if (onlyAvailable === true) qb.andWhere('u.tenant_id IS NULL')
      if (onlyOccupied === true) qb.andWhere('u.tenant_id IS NOT NULL')
      if (search && search.trim()) {
        const q = `%${search.trim().toLowerCase()}%`
        qb.andWhere('(LOWER(u.unitNumber) LIKE :q OR LOWER(u.name) LIKE :q OR u.metadata::text ILIKE :q)', { q })
      }
      if (include.leases) qb.leftJoinAndSelect('u.leases', 'l')
      if (include.requests) qb.leftJoinAndSelect('u.requests', 'req')
      qb.select([
        'u.id',
        'u.unitNumber',
        'u.name',
        'u.isActive',
        'u.isListed',
        'u.status',
        'u.amenities',
        'u.metadata',
        'u.createdAt',
        't.id',
      ])
      qb.orderBy(`u.${orderBy}`, orderDir)
      qb.take(pageSize).skip((page - 1) * pageSize)
      const [data, total] = await qb.getManyAndCount()
      return { data, total }
    } catch (e) {
      logger.error('getUnitsByProperty failed', { error: e, propertyId, opts })
      throw e
    }
  }

  async getAvailableUnits(propertyId: string): Promise<PropertyUnit[]> {
    try {
      const qb = await this.qb()
      return await qb
        .leftJoin('u.property', 'p')
        .where('p.id = :propertyId', { propertyId })
        .andWhere('u.isListed = TRUE')
        .andWhere('u.tenant_id IS NULL')
        .andWhere('u.deletedAt IS NULL')
        .orderBy('u.unitNumber', 'ASC')
        .getMany()
    } catch (e) {
      logger.error('getAvailableUnits failed', { error: e, propertyId })
      throw e
    }
  }

  async getUnitByNumber(propertyId: string, unitNumber: string): Promise<PropertyUnit | null> {
    try {
      const qb = await this.qb()
      return await qb
        .leftJoin('u.property', 'p')
        .leftJoinAndSelect('u.tenant', 't')
        .where('p.id = :propertyId', { propertyId })
        .andWhere('u.unitNumber = :unitNumber', { unitNumber })
        .andWhere('u.deletedAt IS NULL')
        .getOne()
    } catch (e) {
      logger.error('getUnitByNumber failed', { error: e, propertyId, unitNumber })
      throw e
    }
  }

  async getOccupiedUnits(propertyId: string): Promise<PropertyUnit[]> {
    try {
      const qb = await this.qb()
      return await qb
        .leftJoin('u.property', 'p')
        .leftJoinAndSelect('u.tenant', 't')
        .where('p.id = :propertyId', { propertyId })
        .andWhere('u.tenant_id IS NOT NULL')
        .andWhere('u.deletedAt IS NULL')
        .orderBy('u.unitNumber', 'ASC')
        .getMany()
    } catch (e) {
      logger.error('getOccupiedUnits failed', { error: e, propertyId })
      throw e
    }
  }

  async searchUnits(propertyId: string, query: string, limit = 20): Promise<PropertyUnit[]> {
    try {
      const qb = await this.qb()
      const q = `%${query.toLowerCase()}%`
      return await qb
        .leftJoin('u.property', 'p')
        .where('p.id = :propertyId', { propertyId })
        .andWhere('(LOWER(u.unitNumber) LIKE :q OR LOWER(u.name) LIKE :q OR u.metadata::text ILIKE :q)', { q })
        .andWhere('u.deletedAt IS NULL')
        .orderBy('u.unitNumber', 'ASC')
        .limit(limit)
        .getMany()
    } catch (e) {
      logger.error('searchUnits failed', { error: e, propertyId, query, limit })
      throw e
    }
  }
}

const propertyUnitRepository = new PropertyUnitRepository()
export { propertyUnitRepository as default, PropertyUnitRepository }

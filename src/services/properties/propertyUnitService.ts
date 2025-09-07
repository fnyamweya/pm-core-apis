import { PropertyUnit, PropertyUnitStatus } from '../../entities/properties/propertyUnitEntity'
import propertyUnitRepository from '../../repositories/properties/propertyUnitRepository'
import { BaseService } from '../baseService'
import RedisCache from '../../utils/redisCache'
import { logger } from '../../utils/logger'

type Metadata = Record<string, any>

export type ListUnitsOptions = {
  page?: number
  limit?: number // mapped to repo.pageSize
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

interface CreateUnitDTO {
  propertyId: string
  unitNumber: string
  name?: string
  floor?: string
  area?: number
  description?: string
  isListed?: boolean
  metadata?: Metadata
  status?: PropertyUnitStatus
  amenities?: string[]
}

interface UpdateUnitDTO {
  unitNumber?: string
  name?: string
  floor?: string
  area?: number
  description?: string
  isListed?: boolean
  metadata?: Metadata
  tenantId?: string | null
  status?: PropertyUnitStatus
  amenities?: string[]
}

interface Paginated<T> {
  data: T[]
  page: number
  limit: number
  total: number
}

function toErr(e: unknown) {
  if (e instanceof Error) return { message: e.message, stack: e.stack }
  try {
    return { message: JSON.stringify(e) }
  } catch {
    return { message: String(e) }
  }
}

class PropertyUnitService extends BaseService<PropertyUnit> {
  private unitCache = new RedisCache<PropertyUnit>(3600)
  private listCache = new RedisCache<PropertyUnit[]>(3600)

  constructor() {
    super(
      {
        repository: propertyUnitRepository,
        redisCache: new RedisCache<PropertyUnit>(3600),
        logger,
      },
      'propertyUnit'
    )
    this.logger.info('PropertyUnitService initialized')
  }

  // ---------- cache keys ----------
  private unitCacheKey = (id: string) => `unit:${id}`
  private unitsByPropertyKey = (propertyId: string) => `unitsByProperty:${propertyId}`
  private availableUnitsKey = (propertyId: string) => `availableUnits:${propertyId}`
  private unitByNumberKey = (propertyId: string, unitNumber: string) =>
    `unitByNumber:${propertyId}:${unitNumber}`

  // ---------- create ----------
  async createUnit(data: CreateUnitDTO): Promise<PropertyUnit> {
    this.logger.info('Creating property unit', { data })
    try {
      const unit = await this.repository.create({
        property: { id: data.propertyId } as any,
        unitNumber: data.unitNumber,
        name: data.name,
        floor: data.floor,
        area: data.area,
        description: data.description,
        isListed: data.isListed,
        metadata: data.metadata,
        status: data.status,
        amenities: data.amenities,
      })

      // cache the new unit
      await this.unitCache.setToCache('propertyUnit', this.unitCacheKey(unit.id), unit)

      // invalidate lists
      await this.listCache.deleteKey('unitsByProperty', this.unitsByPropertyKey(data.propertyId))
      await this.listCache.deleteKey('availableUnits', this.availableUnitsKey(data.propertyId))

      return unit
    } catch (e) {
      this.logger.error('createUnit failed', { error: toErr(e), data })
      throw e
    }
  }

  // ---------- update ----------
  async updateUnit(id: string, data: UpdateUnitDTO): Promise<PropertyUnit> {
    this.logger.info('Updating property unit', { id, data })
    try {
      const payload: Partial<PropertyUnit> = {
        unitNumber: data.unitNumber,
        name: data.name,
        floor: data.floor,
        area: data.area,
        description: data.description,
        isListed: data.isListed,
        metadata: data.metadata,
        amenities: data.amenities,
      }
      if ('tenantId' in data) {
        payload.tenant = data.tenantId ? ({ id: data.tenantId } as any) : null
      }
      if (data.status) {
        (payload as any).status = data.status
      } else if ('tenantId' in data && data.tenantId !== undefined) {
        // Auto-adjust status if not explicitly provided
        (payload as any).status = data.tenantId ? PropertyUnitStatus.OCCUPIED : PropertyUnitStatus.VACANT
      }

      await this.repository.update(id, payload as any)

      // Reload with property relation for safe cache invalidation
      const updated = await this.repository.findOne({
        where: { id } as any,
        relations: { property: true },
      })

      if (!updated) {
        // if removed concurrently
        this.logger.warn('Updated unit missing after update; treating as not found', { id })
        throw new Error('Property unit not found after update')
      }

      // refresh unit cache
      await this.unitCache.deleteKey('propertyUnit', this.unitCacheKey(id))
      await this.unitCache.setToCache('propertyUnit', this.unitCacheKey(id), updated)

      // list invalidations
      const pid = (updated as any).property?.id
      if (pid) {
        await this.listCache.deleteKey('unitsByProperty', this.unitsByPropertyKey(pid))
        await this.listCache.deleteKey('availableUnits', this.availableUnitsKey(pid))
      }

      return updated
    } catch (e) {
      this.logger.error('updateUnit failed', { error: toErr(e), id, data })
      throw e
    }
  }

  // ---------- delete ----------
  async deleteUnit(id: string): Promise<void> {
    this.logger.info('Deleting property unit', { id })
    try {
      const existing = await this.repository.findOne({
        where: { id } as any,
        relations: { property: true },
      })
      await this.repository.delete(id)

      // invalidate caches
      await this.unitCache.deleteKey('propertyUnit', this.unitCacheKey(id))

      const pid = (existing as any)?.property?.id
      if (pid) {
        await this.listCache.deleteKey('unitsByProperty', this.unitsByPropertyKey(pid))
        await this.listCache.deleteKey('availableUnits', this.availableUnitsKey(pid))
      }
    } catch (e) {
      this.logger.error('deleteUnit failed', { error: toErr(e), id })
      throw e
    }
  }

  // ---------- list by property (paged/unpaged) ----------
  async getUnitsByProperty(
    propertyId: string,
    opts: ListUnitsOptions = {}
  ): Promise<Paginated<PropertyUnit>> {
    const {
      page = 1,
      limit, // undefined => treat as "unpaged"
      orderBy = 'unitNumber',
      orderDir = 'ASC',
      search,
      onlyListed,
      onlyAvailable,
      onlyOccupied,
      include,
    } = opts

    this.logger.info('Fetching units by property', {
      propertyId,
      page,
      limit,
      orderBy,
      orderDir,
      search,
      onlyListed,
      onlyAvailable,
      onlyOccupied,
      include,
    })

    try {
      const isUnpaged = limit === undefined

      if (isUnpaged) {
        // cache the *full* list only
        const key = this.unitsByPropertyKey(propertyId)
        let list = await this.listCache.getFromCache('unitsByProperty', key)
        if (!list) {
          const { data } = await propertyUnitRepository.getUnitsByProperty(propertyId, {
            page: 1,
            pageSize: 10_000, // effectively "all"; tune based on expected max
            orderBy,
            orderDir,
            search,
            onlyListed,
            onlyAvailable,
            onlyOccupied,
            include,
          })
          list = data
          await this.listCache.setToCache('unitsByProperty', key, list)
        }
        return { data: list, page: 1, limit: list.length, total: list.length }
      }

      // paged path (no cache to avoid key explosion)
      const { data, total } = await propertyUnitRepository.getUnitsByProperty(propertyId, {
        page,
        pageSize: limit,
        orderBy,
        orderDir,
        search,
        onlyListed,
        onlyAvailable,
        onlyOccupied,
        include,
      })
      return { data, page, limit, total }
    } catch (e) {
      this.logger.error('getUnitsByProperty failed', { error: toErr(e), propertyId, opts })
      throw e
    }
  }

  // ---------- available units (cached) ----------
  async getAvailableUnits(propertyId: string): Promise<PropertyUnit[]> {
    this.logger.info('Fetching available units', { propertyId })
    const key = this.availableUnitsKey(propertyId)
    try {
      let list = await this.listCache.getFromCache('availableUnits', key)
      if (!list) {
        const result = await propertyUnitRepository.getAvailableUnits(propertyId)
        list = Array.isArray(result) ? result : (result as any)?.data ?? []
        await this.listCache.setToCache('availableUnits', key, list ?? [])
      }
      return list ?? []
    } catch (e) {
      this.logger.error('getAvailableUnits failed', { error: toErr(e), propertyId })
      throw e
    }
  }

  // ---------- by unit number (cached) ----------
  async getUnitByNumber(propertyId: string, unitNumber: string): Promise<PropertyUnit | null> {
    this.logger.info('Fetching unit by number', { propertyId, unitNumber })
    const key = this.unitByNumberKey(propertyId, unitNumber)
    try {
      let unit = await this.unitCache.getFromCache('propertyUnit', key)
      if (!unit) {
        unit = await propertyUnitRepository.getUnitByNumber(propertyId, unitNumber)
        if (unit) {
          await this.unitCache.setToCache('propertyUnit', key, unit)
        }
      }
      return unit
    } catch (e) {
      this.logger.error('getUnitByNumber failed', { error: toErr(e), propertyId, unitNumber })
      throw e
    }
  }

  // ---------- occupied units (no cache) ----------
  async getOccupiedUnits(propertyId: string): Promise<PropertyUnit[]> {
    this.logger.info('Fetching occupied units', { propertyId })
    try {
      return await propertyUnitRepository.getOccupiedUnits(propertyId)
    } catch (e) {
      this.logger.error('getOccupiedUnits failed', { error: toErr(e), propertyId })
      throw e
    }
  }

  // ---------- search (no cache) ----------
  async searchUnits(propertyId: string, query: string, limit = 20): Promise<PropertyUnit[]> {
    this.logger.info('Searching units', { propertyId, query, limit })
    try {
      return await propertyUnitRepository.searchUnits(propertyId, query, limit)
    } catch (e) {
      this.logger.error('searchUnits failed', { error: toErr(e), propertyId, query, limit })
      throw e
    }
  }
}

export default new PropertyUnitService()

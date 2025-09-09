import { DeepPartial } from 'typeorm';
import { BaseService } from '../baseService';
import { logger } from '../../utils/logger';
import RedisCache from '../../utils/redisCache';

import { Location } from '../../entities/locations/locationEntity';
import { AddressComponent } from '../../entities/locations/addressComponentEntity';
import { LocationAddressComponent } from '../../entities/locations/locationAddressComponentEntity';

import locationRepository, {
  ListLocationsFilter,
} from '../../repositories/locations/locationRepository';

import addressComponentRepository from '../../repositories/locations/addressComponentRepository';
import locationAddressComponentRepository from '../../repositories/locations/locationAddressComponentRepository';

import type { Point, Polygon } from 'geojson';

type UUID = string;

export interface AddressComponentLinkInput {
  addressComponentId: UUID;
  label?: string | null;
  sequence?: number | null;
  isPrimary?: boolean | null;
  centerPoint?: Point | null;
  metadata?: Record<string, any> | null;
}

export interface CreateLocationInput {
  localAreaName: string;
  county: string;
  town?: string;
  street?: string;
  coverageDetails?: string;
  parentId?: UUID | null;

  // never pass nulls into DeepPartial<Location> – use undefined
  centerPoint?: Point | { lat: number; lng: number } | undefined;
  geofence?: Polygon | undefined;

  metadata?: Record<string, any> | undefined;
  components?: AddressComponentLinkInput[];
}

export interface UpdateLocationInput extends Partial<CreateLocationInput> {
  // explicit clearing of geometry via repo helpers (SQL NULL)
  clearCenterPoint?: boolean;
  clearGeofence?: boolean;
}

export interface NearestQuery {
  lat: number;
  lng: number;
  limit?: number;
  county?: string | string[];
}
export interface RadiusQuery {
  lat: number;
  lng: number;
  radiusMeters: number;
  limit?: number;
  county?: string | string[];
}
export interface PointInPolygonQuery {
  lat: number;
  lng: number;
  limit?: number;
}
export interface IntersectsQuery {
  polygon: Polygon;
  limit?: number;
}

/* ===================== Helpers ===================== */

// Convert {lat,lng} to GeoJSON Point; return undefined if empty/null
function toGeoPoint(p?: Point | { lat: number; lng: number } | null): Point | undefined {
  if (!p) return undefined;
  if ('type' in p) return p as Point;
  return { type: 'Point', coordinates: [p.lng, p.lat] };
}

function trimOrUndef(v?: string) {
  return typeof v === 'string' ? v.trim() || undefined : v;
}

/* ===================== Service ===================== */

class LocationService extends BaseService<Location> {
  private readonly cacheNs = 'location';
  private readonly listCacheNs = 'location:list';
  private readonly geoCacheNs = 'location:geo';

  // Dedicated cache for list payloads (PaginatedResult)
  private readonly listCache = new RedisCache<any>(3600);

  constructor() {
    super(
      {
        repository: locationRepository,
        redisCache: new RedisCache<Location>(3600),
        logger,
      },
      'location'
    );
  }

  /* -------- cache keys -------- */

  private keyById(id: string) {
    return `${this.cacheNs}:${id}`;
  }
  private keyForList(filter: ListLocationsFilter) {
    return `${this.listCacheNs}:${JSON.stringify(filter)}`;
  }
  private keyForGeo(key: string) {
    return `${this.geoCacheNs}:${key}`;
  }

  /* ------------------------ CRUD ------------------------ */

  async createLocation(input: CreateLocationInput): Promise<Location> {
    const payload: DeepPartial<Location> = {
      localAreaName: trimOrUndef(input.localAreaName)!,
      county: trimOrUndef(input.county)!,
      town: trimOrUndef(input.town),
      street: trimOrUndef(input.street),
      coverageDetails: trimOrUndef(input.coverageDetails),

      // relation
      ...(input.parentId !== undefined
        ? { parent: input.parentId ? ({ id: input.parentId } as any) : undefined }
        : {}),

      // geometry (never null in DeepPartial)
      centerPoint: toGeoPoint(input.centerPoint),
      geofence: input.geofence as any | undefined,

      // metadata (never null in DeepPartial)
      metadata: input.metadata ?? undefined,
    };

    const loc = await this.repository.create(payload);
    await this.cache.setToCache(this.cacheNs, this.keyById(loc.id as string), loc);

    if (input.components?.length) {
      await this.attachAddressComponents(loc.id as string, input.components, {
        replaceExisting: false,
      });
    }

    return loc;
  }

  async updateLocation(id: string, input: UpdateLocationInput): Promise<Location> {
    // ensure exists
    await this.getById(id);

    const payload: DeepPartial<Location> = {
      localAreaName:
        input.localAreaName !== undefined ? trimOrUndef(input.localAreaName) : undefined,
      county: input.county !== undefined ? trimOrUndef(input.county) : undefined,
      town: input.town !== undefined ? trimOrUndef(input.town) : undefined,
      street: input.street !== undefined ? trimOrUndef(input.street) : undefined,
      coverageDetails:
        input.coverageDetails !== undefined ? trimOrUndef(input.coverageDetails) : undefined,

      ...(input.parentId !== undefined
        ? { parent: input.parentId ? ({ id: input.parentId } as any) : undefined }
        : {}),

      centerPoint: input.centerPoint !== undefined ? toGeoPoint(input.centerPoint) : undefined,
      geofence: input.geofence !== undefined ? (input.geofence as any) : undefined,

      metadata: input.metadata !== undefined ? input.metadata : undefined,
    };

    await this.repository.update(id as any, payload);

    // Explicit clears
    if (input.clearCenterPoint) await locationRepository.clearCenterPoint(id);
    if (input.clearGeofence) await locationRepository.clearGeofence(id);

    if (input.components) {
      await this.attachAddressComponents(id, input.components, { replaceExisting: true });
    }

    const updated = await this.getById(id);
    await this.cache.setToCache(this.cacheNs, this.keyById(id), updated);
    return updated;
  }

  async deleteLocation(id: string): Promise<void> {
    await this.getById(id);
    await this.repository.delete(id);
    await this.cache.deleteKey(this.cacheNs, this.keyById(id));
  }

  /* ------------------------ Reads / Lists ------------------------ */

  async getById(id: string): Promise<Location> {
    const ck = this.keyById(id);
    const cached = (await this.cache.getFromCache(this.cacheNs, ck)) as Location | null;
    if (cached) return cached;

    const item = await locationRepository.getByIdWithRelations(id);
    await this.cache.setToCache(this.cacheNs, ck, item);
    return item;
  }

  async list(filter: ListLocationsFilter = {}) {
    const ck = this.keyForList(filter);
    const cached = (await this.listCache.getFromCache(this.listCacheNs, ck)) as any;
    if (cached) return cached;

    const result = await locationRepository.listWithFilters(filter);
    await this.listCache.setToCache(this.listCacheNs, ck, result);
    return result;
  }

  /* ------------------------ Tree ops ------------------------ */

  async move(id: string, newParentId: string | null) {
    const moved = await locationRepository.move(id, newParentId);
    await this.cache.deleteKey(this.cacheNs, this.keyById(id));
    return moved;
  }

  async getSubtree(id: string) {
    return locationRepository.getSubtree(id);
  }

  async getRoots() {
    return locationRepository.getRootTrees();
  }

  async getAncestors(id: string) {
    return locationRepository.getAncestors(id);
  }

  async getDescendants(id: string) {
    return locationRepository.getDescendants(id);
  }

  /* ------------------------ Geo ops ------------------------ */

  async findNearest(q: NearestQuery) {
    const key = this.keyForGeo(
      `nearest:${q.lat},${q.lng}:${q.limit ?? ''}:${JSON.stringify(q.county ?? '')}`
    );
    const cached = (await this.cache.getFromCache(this.geoCacheNs, key)) as Location[] | null;
    if (cached) return cached;

    const pt: Point = { type: 'Point', coordinates: [q.lng, q.lat] };

    // Current repo method supports optional single county; if array needed, extend repo.
    const county = Array.isArray(q.county) ? undefined : q.county;
    const rows = await locationRepository.getNearestLocations(pt, q.limit ?? 10, county);

    await this.cache.setToCache(this.geoCacheNs, key, rows);
    return rows;
  }

  async findWithinRadius(q: RadiusQuery) {
    const key = this.keyForGeo(
      `radius:${q.lat},${q.lng}:${q.radiusMeters}:${q.limit ?? ''}:${JSON.stringify(
        q.county ?? ''
      )}`
    );
    const cached = (await this.cache.getFromCache(this.geoCacheNs, key)) as Location[] | null;
    if (cached) return cached;

    const pt: Point = { type: 'Point', coordinates: [q.lng, q.lat] };
    const rows = await locationRepository.getLocationsNearPoint(pt, q.radiusMeters);

    // If you need county filtering or limit at DB level, add a repo method mirroring service behavior
    const filtered =
      q.county && Array.isArray(q.county)
        ? rows.filter((r) => q.county!.includes((r as any).county))
        : rows;
    const sliced = q.limit ? filtered.slice(0, q.limit) : filtered;

    await this.cache.setToCache(this.geoCacheNs, key, sliced);
    return sliced;
  }

  async findContainingPoint(q: PointInPolygonQuery) {
    const key = this.keyForGeo(`contains:${q.lat},${q.lng}:${q.limit ?? ''}`);
    const cached = (await this.cache.getFromCache(this.geoCacheNs, key)) as Location[] | null;
    if (cached) return cached;

    const pt: Point = { type: 'Point', coordinates: [q.lng, q.lat] };
    const rows = await locationRepository.getLocationsContainingPoint(pt);
    const sliced = q.limit ? rows.slice(0, q.limit) : rows;

    await this.cache.setToCache(this.geoCacheNs, key, sliced);
    return sliced;
  }

  async findIntersectingPolygon(q: IntersectsQuery) {
    const rows = await locationRepository.getLocationsInGeofence(q.polygon);
    return q.limit ? rows.slice(0, q.limit) : rows;
  }

  async getGeofenceAreaSqMeters(id: string) {
    return locationRepository.getGeofenceAreaSqMeters(id);
  }

  async exportGeoJSON(id: string) {
    return locationRepository.exportGeoJSON(id);
  }

  /* ------------------------ Address Components ------------------------ */

  async attachAddressComponents(
    locationId: UUID,
    components: AddressComponentLinkInput[],
    opts: { replaceExisting?: boolean } = {}
  ) {
    // ensure location exists
    await this.getById(locationId);

    // replaceExisting: delete old links
    if (opts.replaceExisting) {
      const existing = await locationAddressComponentRepository.getByLocation(locationId);
      if (existing.length) {
        await locationAddressComponentRepository.bulkDeleteLinks(existing.map((e) => e.id));
      }
    }

    // Ensure single primary
    if (components.some((c) => c.isPrimary)) {
      const currentPrimary = await locationAddressComponentRepository.getPrimaryComponent(
        locationId
      );
      if (currentPrimary) {
        await locationAddressComponentRepository.updateLink(currentPrimary.id, {
          isPrimary: false,
        });
      }
    }

    // validate AddressComponent ids
    const ids = components.map((c) => c.addressComponentId);
    const found = await addressComponentRepository.find({ where: { id: ids as any } });
    const set = new Set(found.map((f) => (f as any).id));
    const missing = ids.filter((i) => !set.has(i));
    if (missing.length) throw new Error(`Invalid addressComponentId(s): ${missing.join(', ')}`);

    // Upsert one by one
    for (const c of components) {
      const link: DeepPartial<LocationAddressComponent> = {
        location: { id: locationId } as any as Location,
        addressComponent: { id: c.addressComponentId } as any as AddressComponent,
        label: c.label ?? undefined,
        sequence: c.sequence ?? undefined,
        isPrimary: !!c.isPrimary,
        centerPoint: toGeoPoint(c.centerPoint) ?? undefined,
        // metadata: c.metadata ?? undefined,
      };

      await locationAddressComponentRepository.bulkUpsertLinks([link]);
    }

    await this.cache.deleteKey(this.cacheNs, this.keyById(locationId));
  }

  async getAddressComponents(locationId: UUID): Promise<AddressComponent[]> {
    return addressComponentRepository.getForLocation(locationId);
  }
}

export default new LocationService();

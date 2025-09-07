import { DeepPartial } from 'typeorm';
import { BaseService } from '../baseService';
import { logger } from '../../utils/logger';
import RedisCache from '../../utils/redisCache';

import { LocationAddressComponent } from '../../entities/locations/locationAddressComponentEntity';
import { Location } from '../../entities/locations/locationEntity';
import { AddressComponent } from '../../entities/locations/addressComponentEntity';

import locationAddressComponentRepository from '../../repositories/locations/locationAddressComponentRepository';

import type { Point } from 'geojson';

type UUID = string;

export interface CreateLinkInput {
  locationId: UUID;
  addressComponentId: UUID;
  label?: string | null;
  sequence?: number | null;
  isPrimary?: boolean | null;
  centerPoint?: Point | null;
  metadata?: Record<string, any> | undefined;
}

export interface UpdateLinkInput extends Partial<CreateLinkInput> {
  clearCenterPoint?: boolean;
}

export interface BulkUpsertLinkInput {
  locationId: UUID;
  addressComponentId: UUID;
  label?: string | null;
  sequence?: number | null;
  isPrimary?: boolean | null;
  centerPoint?: Point | null;
  metadata?: Record<string, any> | undefined;
}

function toUndef<T>(v: T | null | undefined): T | undefined {
  return v === null || v === undefined ? undefined : v;
}

function cleanText(v?: string | null): string | undefined {
  if (v === null || v === undefined) return undefined;
  const t = String(v).trim();
  return t || undefined;
}

class LocationAddressComponentService extends BaseService<LocationAddressComponent> {
  private readonly cacheNs = 'lac';
  private readonly listByLocNs = 'lac:list:loc';
  private readonly listByAcNs = 'lac:list:ac';

  private readonly listCache = new RedisCache<any>(1800);

  constructor() {
    super(
      {
        repository: locationAddressComponentRepository,
        redisCache: new RedisCache<LocationAddressComponent>(3600),
        logger,
      },
      'location_address_component'
    );
  }


  private keyById = (id: string) => `${this.cacheNs}:${id}`;
  private keyByLocation = (locationId: string) => `${this.listByLocNs}:${locationId}`;
  private keyByAddressComponent = (addressComponentId: string) =>
    `${this.listByAcNs}:${addressComponentId}`;

  async createLink(input: CreateLinkInput): Promise<LocationAddressComponent> {
    if (!input.locationId || !input.addressComponentId) {
      throw new Error('locationId and addressComponentId are required');
    }

    const payload: DeepPartial<LocationAddressComponent> = {
      location: { id: input.locationId } as any as Location,
      addressComponent: { id: input.addressComponentId } as any as AddressComponent,
      label: cleanText(input.label),
      sequence: toUndef(input.sequence),
      isPrimary: !!input.isPrimary,
      // IMPORTANT: do not pass geometry directly (repo sets it via SQL)
      // centerPoint handled below by repo through explicit SQL
    };

    const created = await (this.repository as any).createLink({
      ...payload,
      centerPoint: input.centerPoint ?? undefined,
    });

    await this.listCache.deleteKey(this.listByLocNs, this.keyByLocation(input.locationId));
    await this.listCache.deleteKey(
      this.listByAcNs,
      this.keyByAddressComponent(input.addressComponentId)
    );
    await this.cache.setToCache(this.cacheNs, this.keyById(created.id as string), created);

    if (input.isPrimary) {
      await this.ensureSinglePrimary(input.locationId, created.id as string);
    }

    return created;
  }

  async updateLink(id: UUID, input: UpdateLinkInput): Promise<LocationAddressComponent> {
    const prev = await this.getById(id);

    const payload: DeepPartial<LocationAddressComponent> = {
      location: input.locationId !== undefined ? ({ id: input.locationId } as any) : undefined,
      addressComponent:
        input.addressComponentId !== undefined
          ? ({ id: input.addressComponentId } as any)
          : undefined,
      label: input.label !== undefined ? cleanText(input.label) : undefined,
      sequence: input.sequence !== undefined ? toUndef(input.sequence) : undefined,
      isPrimary: input.isPrimary !== undefined ? !!input.isPrimary : undefined,
    };

    const updated = await (this.repository as any).updateLink(id, {
      ...payload,
      centerPoint:
        input.clearCenterPoint === true
          ? null
          : input.centerPoint !== undefined
          ? input.centerPoint
          : undefined,
    });

    const locId = (updated.location as any).id as string;
    if (input.isPrimary) {
      await this.ensureSinglePrimary(locId, id);
    }

    await this.cache.setToCache(this.cacheNs, this.keyById(id), updated);
    await this.listCache.deleteKey(this.listByLocNs, this.keyByLocation(locId));

    const acId = (updated.addressComponent as any).id as string;
    await this.listCache.deleteKey(this.listByAcNs, this.keyByAddressComponent(acId));

    return updated;
  }

  async deleteLink(id: UUID): Promise<void> {
    const prev = await this.getById(id);
    const locId = (prev.location as any).id as string;
    const acId = (prev.addressComponent as any).id as string;

    await (this.repository as any).deleteLink(id);

    await this.cache.deleteKey(this.cacheNs, this.keyById(id));
    await this.listCache.deleteKey(this.listByLocNs, this.keyByLocation(locId));
    await this.listCache.deleteKey(this.listByAcNs, this.keyByAddressComponent(acId));
  }

  async bulkDeleteLinks(ids: UUID[]): Promise<void> {
    if (!ids?.length) return;

    const existing = await Promise.all(ids.map((id) => this.getById(id).catch(() => null)));
    await (this.repository as any).bulkDeleteLinks(ids);

    for (const row of existing) {
      if (!row) continue;
      const locId = (row.location as any).id as string;
      const acId = (row.addressComponent as any).id as string;
      await this.cache.deleteKey(this.cacheNs, this.keyById(row.id as string));
      await this.listCache.deleteKey(this.listByLocNs, this.keyByLocation(locId));
      await this.listCache.deleteKey(this.listByAcNs, this.keyByAddressComponent(acId));
    }
  }

  async getById(id: UUID): Promise<LocationAddressComponent> {
    const ck = this.keyById(id);
    const cached = (await this.cache.getFromCache(this.cacheNs, ck)) as LocationAddressComponent | null;
    if (cached) return cached;

    const row = await this.repository.findById(id);
    if (!row) throw new Error('location address component not found');
    await this.cache.setToCache(this.cacheNs, ck, row);
    return row;
  }

  async getByLocation(locationId: UUID): Promise<LocationAddressComponent[]> {
    const ck = this.keyByLocation(locationId);
    const cached = (await this.listCache.getFromCache(this.listByLocNs, ck)) as LocationAddressComponent[] | null;
    if (cached) return cached;

    const rows = await (this.repository as any).getByLocation(locationId);
    await this.listCache.setToCache(this.listByLocNs, ck, rows);
    return rows;
  }

  async getByAddressComponent(addressComponentId: UUID): Promise<LocationAddressComponent[]> {
    const ck = this.keyByAddressComponent(addressComponentId);
    const cached = (await this.listCache.getFromCache(this.listByAcNs, ck)) as LocationAddressComponent[] | null;
    if (cached) return cached;

    const rows = await (this.repository as any).getByAddressComponent(addressComponentId);
    await this.listCache.setToCache(this.listByAcNs, ck, rows);
    return rows;
  }

  async getPrimaryComponent(locationId: UUID): Promise<LocationAddressComponent | null> {
    return (this.repository as any).getPrimaryComponent(locationId);
  }

  /**
   * Ensures a single primary per location by unsetting any other primary link.
   */
  private async ensureSinglePrimary(locationId: UUID, keepId: UUID) {
    const currentPrimary = await (this.repository as any).getPrimaryComponent(locationId);
    if (currentPrimary && (currentPrimary.id as string) !== keepId) {
      await (this.repository as any).updateLink(currentPrimary.id, { isPrimary: false });

      await this.cache.deleteKey(this.cacheNs, this.keyById(currentPrimary.id as string));
      await this.listCache.deleteKey(this.listByLocNs, this.keyByLocation(locationId));
    }
  }

  /**
   * Reorder sequences for a location’s links.
   * Pass an ordered array of link IDs; we’ll apply 1..N.
   */
  async reorderSequences(locationId: UUID, orderedLinkIds: UUID[]) {
    if (!orderedLinkIds?.length) return;

    await (this.repository as any).executeTransaction(async (manager: any) => {
      for (let i = 0; i < orderedLinkIds.length; i++) {
        const id = orderedLinkIds[i];
        await manager.update(LocationAddressComponent, id, { sequence: i + 1 });
      }
    });

    await this.listCache.deleteKey(this.listByLocNs, this.keyByLocation(locationId));
    await Promise.all(
      orderedLinkIds.map((id) => this.cache.deleteKey(this.cacheNs, this.keyById(id)))
    );
  }

  /**
   * Upsert one link (by unique pair location_id + address_component_id).
   * Delegates geometry handling to the repository.
   */
  async upsertLink(input: CreateLinkInput): Promise<LocationAddressComponent> {
    const payload: DeepPartial<LocationAddressComponent> = {
      location: { id: input.locationId } as any,
      addressComponent: { id: input.addressComponentId } as any,
      label: cleanText(input.label),
      sequence: toUndef(input.sequence),
      isPrimary: !!input.isPrimary,
    };

    const res = await (this.repository as any).bulkUpsertLinks([
      { ...payload, centerPoint: input.centerPoint ?? undefined },
    ]);

    const rows = await this.getByLocation(input.locationId);
    const link = rows.find(
      (r) =>
        ((r.location as any).id as string) === input.locationId &&
        ((r.addressComponent as any).id as string) === input.addressComponentId
    );
    if (!link) {
      throw new Error('Failed to upsert link');
    }

    if (input.isPrimary) {
      await this.ensureSinglePrimary(input.locationId, link.id as string);
    }

    await this.listCache.deleteKey(this.listByLocNs, this.keyByLocation(input.locationId));
    await this.listCache.deleteKey(
      this.listByAcNs,
      this.keyByAddressComponent(input.addressComponentId)
    );
    await this.cache.setToCache(this.cacheNs, this.keyById(link.id as string), link);

    return link;
  }

  /**
   * Bulk upsert links. Geometry handled by repo.
   */
  async bulkUpsertLinks(rows: BulkUpsertLinkInput[]) {
    if (!rows?.length) return { inserted: 0, updated: 0 };

    const payloads: Array<DeepPartial<LocationAddressComponent>> = rows.map((r) => ({
      location: { id: r.locationId } as any,
      addressComponent: { id: r.addressComponentId } as any,
      label: cleanText(r.label),
      sequence: toUndef(r.sequence),
      isPrimary: !!r.isPrimary,
      metadata: r.metadata ?? undefined,
      // centerPoint is passed separately and set by the repo via SQL
      centerPoint: r.centerPoint ?? undefined,
    }));

    const result = await (this.repository as any).bulkUpsertLinks(payloads);

    const locIds = Array.from(new Set(rows.map((r) => r.locationId)));
    const acIds = Array.from(new Set(rows.map((r) => r.addressComponentId)));
    await Promise.all([
      ...locIds.map((l) => this.listCache.deleteKey(this.listByLocNs, this.keyByLocation(l))),
      ...acIds.map((a) =>
        this.listCache.deleteKey(this.listByAcNs, this.keyByAddressComponent(a))
      ),
    ]);

    return result;
  }

  /**
   * Clear geometry for a single link.
   */
  async clearCenterPoint(id: UUID) {
    const row = await this.getById(id);
    await (this.repository as any).updateLink(id, { centerPoint: null });
    await this.cache.deleteKey(this.cacheNs, this.keyById(id));
    await this.listCache.deleteKey(this.listByLocNs, this.keyByLocation((row.location as any).id));
  }

  /**
   * Spatial query: find address-component links near a lat/lng with radius meters.
   */
  async findComponentsNearPoint(lat: number, lng: number, distanceMeters: number, limit = 50) {
    const pt: Point = { type: 'Point', coordinates: [lng, lat] };
    const rows = await (this.repository as any).findComponentsNearPoint(pt, distanceMeters);
    return rows.slice(0, limit);
  }
}

export default new LocationAddressComponentService();

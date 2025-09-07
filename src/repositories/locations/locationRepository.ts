// src/repositories/locations/locationRepository.ts
import { Point, Polygon } from 'geojson';
import {
  DeepPartial,
  In,
  SelectQueryBuilder,
} from 'typeorm';
import BaseRepository from '../baseRepository';
import { Location } from '../../entities/locations/locationEntity';
import { AddressComponent } from '../../entities/locations/addressComponentEntity';
import { LocationAddressComponent } from '../../entities/locations/locationAddressComponentEntity';

/** Filter and pagination contracts used by the service */
export interface ListLocationsFilter {
  search?: string;
  county?: string | string[];
  town?: string | string[];
  parentId?: string | null;
  isRootOnly?: boolean;
  hasGeofence?: boolean;
  includeDeleted?: boolean; // available if you soft-delete
  page?: number;
  pageSize?: number;
  sort?: 'name_asc' | 'name_desc' | 'created_asc' | 'created_desc';
}

export interface PaginatedResult<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

class LocationRepository extends BaseRepository<Location> {
  constructor() {
    super(Location);
  }

  // ---------------- Internal helpers ----------------

  private async ensureReady() {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    await (this as any).ensureRepositoryInitialized?.();
  }

  private async getTreeRepo() {
    await this.ensureReady();
    return this.dataSource.getTreeRepository(Location);
  }

  private async findByIdOrFail(id: string): Promise<Location> {
    const loc = await this.findById(id);
    if (!loc) throw new Error(`Location not found with ID: ${id}`);
    return loc;
  }

  private applyFilters(qb: SelectQueryBuilder<Location>, filter: ListLocationsFilter) {
    if (filter.search) {
      qb.andWhere(
        `(l."localAreaName" ILIKE :q OR l."county" ILIKE :q OR l."town" ILIKE :q OR l."street" ILIKE :q)`,
        { q: `%${filter.search}%` }
      );
    }

    if (filter.county) {
      const arr = Array.isArray(filter.county) ? filter.county : [filter.county];
      qb.andWhere(`l."county" IN (:...counties)`, { counties: arr });
    }

    if (filter.town) {
      const arr = Array.isArray(filter.town) ? filter.town : [filter.town];
      qb.andWhere(`l."town" IN (:...towns)`, { towns: arr });
    }

    if (filter.hasGeofence !== undefined) {
      qb.andWhere(filter.hasGeofence ? `l."geofence" IS NOT NULL` : `l."geofence" IS NULL`);
    }

    if (filter.isRootOnly === true) {
      qb.andWhere(`l."parentId" IS NULL`);
    } else if (filter.parentId !== undefined) {
      if (filter.parentId === null) qb.andWhere(`l."parentId" IS NULL`);
      else qb.andWhere(`l."parentId" = :pid`, { pid: filter.parentId });
    }

    // If you support soft delete and includeDeleted flag, apply it here
    // (Assumes "deletedAt" column; customize for your setup.)
    if (filter.includeDeleted === false) {
      qb.andWhere(`l."deletedAt" IS NULL`);
    }

    return qb;
  }

  // ---------------- CRUD ----------------

  async createLocation(data: DeepPartial<Location>): Promise<Location> {
    try {
      return await this.create(data);
    } catch (error) {
      this.handleError(error, 'Error creating Location');
    }
  }

  async updateLocation(id: string, data: DeepPartial<Location>): Promise<Location> {
    await this.findByIdOrFail(id);
    try {
      await this.update(id, data);
      return await this.findByIdOrFail(id);
    } catch (error) {
      this.handleError(error, `Error updating Location with ID: ${id}`);
    }
  }

  async deleteLocation(id: string): Promise<void> {
    await this.findByIdOrFail(id);
    try {
      await this.delete(id);
    } catch (error) {
      this.handleError(error, `Error deleting Location with ID: ${id}`);
    }
  }

  async bulkDeleteLocations(ids: string[]): Promise<void> {
    if (!ids?.length) return;
    try {
      await this.bulkDelete({ id: In(ids) } as any);
    } catch (error) {
      this.handleError(error, 'Error bulk deleting Locations');
    }
  }

  // ---------------- Reads ----------------

  async getByIdWithRelations(id: string): Promise<Location> {
    try {
      const item = await this.findOne({
        where: { id } as any,
        relations: { parent: true, children: true } as any,
      });
      if (!item) throw new Error('location not found');
      return item;
    } catch (error) {
      this.handleError(error, `Error retrieving Location ID: ${id}`);
    }
  }

  async getLocationByName(localAreaName: string): Promise<Location | null> {
    try {
      return await this.findOne({ where: { localAreaName } });
    } catch (error) {
      this.handleError(error, `Error finding Location with name: ${localAreaName}`);
    }
  }

  async getLocationsByCounty(county: string): Promise<Location[]> {
    try {
      return await this.find({ where: { county } });
    } catch (error) {
      this.handleError(error, `Error finding Locations in county: ${county}`);
    }
  }

  async listWithFilters(filter: ListLocationsFilter = {}): Promise<PaginatedResult<Location>> {
    await this.ensureReady();
    const repo = this.dataSource.getRepository(Location);

    const page = filter.page ?? 1;
    const limit = filter.pageSize ?? 20;

    const baseQb = repo
      .createQueryBuilder('l')
      .leftJoinAndSelect('l.parent', 'parent')
      .leftJoinAndSelect('l.children', 'children')
      .where('1=1');

    const qb = this.applyFilters(baseQb, filter);

    // Total count first
    const total = await qb.clone().getCount();

    // Sorting
    switch (filter.sort) {
      case 'name_asc':
        qb.orderBy(`l."localAreaName"`, 'ASC');
        break;
      case 'name_desc':
        qb.orderBy(`l."localAreaName"`, 'DESC');
        break;
      case 'created_asc':
        qb.orderBy(`l."createdAt"`, 'ASC');
        break;
      default:
        qb.orderBy(`l."createdAt"`, 'DESC');
    }

    qb.skip((page - 1) * limit).take(limit);

    const data = await qb.getMany();

    return {
      data,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ---------------- Tree ops ----------------

  async move(id: string, newParentId: string | null): Promise<Location> {
    const node = await this.findByIdOrFail(id);
    try {
      node.parent = newParentId ? await this.findByIdOrFail(newParentId) : (null as any);
      await this.save(node);
      return await this.findByIdOrFail(id);
    } catch (error) {
      this.handleError(error, `Error moving Location ID: ${id}`);
    }
  }

  async getAncestors(id: string): Promise<Location[]> {
    const node = await this.findByIdOrFail(id);
    try {
      const treeRepo = await this.getTreeRepo();
      return await treeRepo.findAncestors(node);
    } catch (error) {
      this.handleError(error, `Error retrieving ancestors for Location ID: ${id}`);
    }
  }

  async getDescendants(id: string): Promise<Location[]> {
    const node = await this.findByIdOrFail(id);
    try {
      const treeRepo = await this.getTreeRepo();
      const all = await treeRepo.findDescendants(node);
      return all.filter((n: Location) => n.id !== id);
    } catch (error) {
      this.handleError(error, `Error retrieving descendants for Location ID: ${id}`);
    }
  }

  async getSubtree(id: string): Promise<Location> {
    const node = await this.findByIdOrFail(id);
    try {
      const treeRepo = await this.getTreeRepo();
      return await treeRepo.findDescendantsTree(node);
    } catch (error) {
      this.handleError(error, `Error retrieving subtree for Location ID: ${id}`);
    }
  }

  async getRootTrees(): Promise<Location[]> {
    try {
      const treeRepo = await this.getTreeRepo();
      const roots = await treeRepo.findRoots();
      return await Promise.all(roots.map((r: Location) => treeRepo.findDescendantsTree(r)));
    } catch (error) {
      this.handleError(error, 'Error retrieving root location trees');
    }
  }

  // ---------------- Geometry utilities (owned by repo) ----------------

  /** Sets "centerPoint" to NULL (explicit clear). */
  async clearCenterPoint(id: string): Promise<void> {
    await this.ensureReady();
    await this.dataSource.manager.query(
      `UPDATE "locations" SET "centerPoint" = NULL WHERE id = $1`,
      [id]
    );
  }

  /** Sets "geofence" to NULL (explicit clear). */
  async clearGeofence(id: string): Promise<void> {
    await this.ensureReady();
    await this.dataSource.manager.query(
      `UPDATE "locations" SET "geofence" = NULL WHERE id = $1`,
      [id]
    );
  }

  // ---------------- Geo queries (PostGIS) ----------------

  /**
   * Accurate meters (geography) search around a point.
   */
  async getLocationsNearPoint(point: Point, distanceMeters: number): Promise<Location[]> {
    return this.executeCustomQuery((repo) =>
      repo
        .createQueryBuilder('location')
        .where(`location."centerPoint" IS NOT NULL`)
        .andWhere(
          `ST_DWithin(
            location."centerPoint"::geography,
            ST_SetSRID(ST_GeomFromGeoJSON(:pt), 4326)::geography,
            :dist
          )`,
        )
        .setParameters({ pt: JSON.stringify(point), dist: distanceMeters })
    );
  }

  /**
   * Geofences intersecting a polygon.
   */
  async getLocationsInGeofence(polygon: Polygon): Promise<Location[]> {
    return this.executeCustomQuery((repo) =>
      repo
        .createQueryBuilder('location')
        .where(`location."geofence" IS NOT NULL`)
        .andWhere(
          `ST_Intersects(
            location."geofence",
            ST_SetSRID(ST_GeomFromGeoJSON(:poly), 4326)
          )`,
        )
        .setParameters({ poly: JSON.stringify(polygon) })
    );
  }

  /**
   * Geofences that contain the given point.
   */
  async getLocationsContainingPoint(point: Point): Promise<Location[]> {
    return this.executeCustomQuery((repo) =>
      repo
        .createQueryBuilder('location')
        .where(`location."geofence" IS NOT NULL`)
        .andWhere(
          `ST_Contains(
            location."geofence",
            ST_SetSRID(ST_GeomFromGeoJSON(:pt), 4326)
          )`,
        )
        .setParameters({ pt: JSON.stringify(point) })
    );
  }

  /**
   * KNN ordering by nearest centerPoint to a point (requires GiST index).
   * Planar distance for ordering; for exact radius use getLocationsNearPoint.
   */
  async getNearestLocations(point: Point, limit = 10, county?: string): Promise<Location[]> {
    return this.executeCustomQuery((repo) => {
      const qb = repo
        .createQueryBuilder('location')
        .where(`location."centerPoint" IS NOT NULL`);

      if (county) qb.andWhere(`location."county" = :county`, { county });

      return qb
        .orderBy(
          `location."centerPoint" <-> ST_SetSRID(ST_GeomFromGeoJSON(:pt), 4326)`,
          'ASC',
        )
        .setParameters({ pt: JSON.stringify(point) })
        .take(limit);
    });
  }

  /**
   * Intersect a bounding box (minLng, minLat, maxLng, maxLat).
   */
  async getLocationsWithinBBox(
    minLng: number,
    minLat: number,
    maxLng: number,
    maxLat: number,
  ): Promise<Location[]> {
    return this.executeCustomQuery((repo) =>
      repo
        .createQueryBuilder('location')
        .where(`location."geofence" IS NOT NULL`)
        .andWhere(
          `location."geofence" && ST_MakeEnvelope(:minLng, :minLat, :maxLng, :maxLat, 4326)`,
        )
        .setParameters({ minLng, minLat, maxLng, maxLat })
    );
  }

  async getGeofenceAreaSqMeters(id: string): Promise<number | null> {
    await this.ensureReady();
    await this.findByIdOrFail(id);

    try {
      const rows: Array<{ area: number | string }> = await this.dataSource.manager.query(
        `SELECT ST_Area("geofence"::geography) AS area
         FROM "locations"
         WHERE id = $1 AND "geofence" IS NOT NULL`,
        [id],
      );
      return rows?.[0]?.area != null ? Number(rows[0].area) : null;
    } catch (error) {
      this.handleError(error, 'Error computing geofence area');
    }
  }

  async exportGeoJSON(id: string): Promise<{ centerPoint?: any; geofence?: any }> {
    await this.ensureReady();
    await this.findByIdOrFail(id);

    try {
      const rows: Array<{ center: string | null; fence: string | null }> =
        await this.dataSource.manager.query(
          `SELECT
             CASE WHEN "centerPoint" IS NULL THEN NULL ELSE ST_AsGeoJSON("centerPoint") END AS center,
             CASE WHEN "geofence"    IS NULL THEN NULL ELSE ST_AsGeoJSON("geofence")    END AS fence
           FROM "locations"
           WHERE id = $1`,
          [id],
        );

      const row = rows?.[0];
      return {
        centerPoint: row?.center ? JSON.parse(row.center) : undefined,
        geofence: row?.fence ? JSON.parse(row.fence) : undefined,
      };
    } catch (error) {
      this.handleError(error, 'Error exporting Location GeoJSON');
    }
  }

  // ---------------- Address components ----------------

  async getAddressComponents(locationId: string): Promise<AddressComponent[]> {
    try {
      const links = await this.dataSource.getRepository(LocationAddressComponent).find({
        where: { location: { id: locationId } as any },
        relations: { addressComponent: true } as any,
        order: { sequence: 'ASC' },
      });
      return links.map((l) => l.addressComponent);
    } catch (error) {
      this.handleError(
        error,
        `Error retrieving address components for Location ID: ${locationId}`
      );
    }
  }

  // ---------------- Upsert convenience ----------------

  /**
   * Upsert by (localAreaName + county).
   */
  async upsertByNameCounty(data: DeepPartial<Location>): Promise<Location> {
    const { localAreaName, county } = data;
    if (!localAreaName || !county) {
      throw new Error('localAreaName and county are required for upsertByNameCounty');
    }

    const existing = await this.findOne({
      where: {
        localAreaName: localAreaName as string,
        county: county as string,
      },
    });

    if (existing) {
      return this.updateLocation(existing.id, data);
    }
    return this.createLocation(data);
  }
}

const locationRepository = new LocationRepository();
export { locationRepository as default, LocationRepository };

import { Point } from 'geojson';
import { DeepPartial, In } from 'typeorm';
import BaseRepository from '../baseRepository';
import { LocationAddressComponent } from '../../entities/locations/locationAddressComponentEntity';
import { Location } from '../../entities/locations/locationEntity';
import { AddressComponent } from '../../entities/locations/addressComponentEntity';

type UUID = string;

function toGeoJSONText(p?: Point | null): string | null {
  return p ? JSON.stringify(p) : null;
}

class LocationAddressComponentRepository extends BaseRepository<LocationAddressComponent> {
  constructor() {
    super(LocationAddressComponent);
  }

  private async findByIdOrFail(id: UUID): Promise<LocationAddressComponent> {
    const record = await this.findById(id);
    if (!record) throw new Error(`LocationAddressComponent not found with ID: ${id}`);
    return record;
  }

  async createLink(data: DeepPartial<LocationAddressComponent>): Promise<LocationAddressComponent> {
    const { centerPoint, ...rest } = data as DeepPartial<LocationAddressComponent> & {
      centerPoint?: Point | null;
    };

    const created = await this.create(rest);

    if (centerPoint) {
      const gj = toGeoJSONText(centerPoint);
      await this.dataSource.manager.query(
        `
        UPDATE "location_address_components"
        SET "centerPoint" = ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)
        WHERE id = $2
        `,
        [gj, created.id],
      );
    }

    return this.findByIdOrFail(created.id);
  }

  async updateLink(id: UUID, data: DeepPartial<LocationAddressComponent>): Promise<LocationAddressComponent> {
    await this.findByIdOrFail(id);

    const { centerPoint, ...rest } = data as DeepPartial<LocationAddressComponent> & {
      centerPoint?: Point | null;
    };

    if (Object.keys(rest).length) {
      await this.update(id, rest);
    }

    if (centerPoint !== undefined) {
      if (centerPoint === null) {
        await this.dataSource.manager.query(
          `UPDATE "location_address_components" SET "centerPoint" = NULL WHERE id = $1`,
          [id],
        );
      } else {
        const gj = toGeoJSONText(centerPoint);
        await this.dataSource.manager.query(
          `
          UPDATE "location_address_components"
          SET "centerPoint" = ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)
          WHERE id = $2
          `,
          [gj, id],
        );
      }
    }

    return this.findByIdOrFail(id);
  }

  async deleteLink(id: UUID): Promise<void> {
    await this.findByIdOrFail(id);
    await this.delete(id);
  }

  async bulkDeleteLinks(ids: UUID[]): Promise<void> {
    if (!ids?.length) return;
    await this.bulkDelete({ id: In(ids) } as any);
  }

  async getByLocation(locationId: UUID): Promise<LocationAddressComponent[]> {
    return this.find({
      where: { location: { id: locationId } as Location },
      relations: { location: true, addressComponent: true } as any,
      order: { sequence: 'ASC' },
    });
  }

  async getByAddressComponent(addressComponentId: UUID): Promise<LocationAddressComponent[]> {
    return this.find({
      where: { addressComponent: { id: addressComponentId } as AddressComponent },
      relations: { location: true, addressComponent: true } as any,
    });
  }

  async getPrimaryComponent(locationId: UUID): Promise<LocationAddressComponent | null> {
    return this.findOne({
      where: { location: { id: locationId } as Location, isPrimary: true },
      relations: { location: true, addressComponent: true } as any,
    });
  }

  async findComponentsNearPoint(point: Point, distanceMeters: number): Promise<LocationAddressComponent[]> {
    return this.executeCustomQuery((repo) =>
      repo
        .createQueryBuilder('lac')
        .where(`lac."centerPoint" IS NOT NULL`)
        .andWhere(
          `ST_DWithin(
            lac."centerPoint"::geography,
            ST_SetSRID(ST_GeomFromGeoJSON(:pt), 4326)::geography,
            :dist
          )`,
        )
        .setParameters({ pt: JSON.stringify(point), dist: distanceMeters })
        .orderBy(
          `lac."centerPoint" <-> ST_SetSRID(ST_GeomFromGeoJSON(:pt), 4326)`,
          'ASC',
        ),
    );
  }

  /**
   * Upsert links by unique pair (location_id, address_component_id).
   * - Non-geometry fields updated with TypeORM update
   * - Geometry updated with SQL to avoid _QueryDeepPartialEntity typing conflicts
   */
  async bulkUpsertLinks(
    links: Array<DeepPartial<LocationAddressComponent>>
  ): Promise<{ inserted: number; updated: number }> {
    let inserted = 0;
    let updated = 0;

    await this.executeTransaction(async (manager) => {
      for (const raw of links) {
        const { centerPoint, ...rest } = raw as DeepPartial<LocationAddressComponent> & {
          centerPoint?: Point | null;
        };

        if (!rest.location || !rest.addressComponent) {
          throw new Error('Both location and addressComponent are required for bulk upsert');
        }

        const locationId = (rest.location as Location).id;
        const addressComponentId = (rest.addressComponent as AddressComponent).id;
        if (!locationId || !addressComponentId) {
          throw new Error('location.id and addressComponent.id are required for bulk upsert');
        }

        const existing = await manager.findOne(LocationAddressComponent, {
          where: {
            location: { id: locationId } as Location,
            addressComponent: { id: addressComponentId } as AddressComponent,
          },
        });

        if (existing) {
          if (Object.keys(rest).length) {
            await manager.update(LocationAddressComponent, existing.id, rest as any);
          }
          if (centerPoint !== undefined) {
            if (centerPoint === null) {
              await manager.query(
                `UPDATE "location_address_components" SET "centerPoint" = NULL WHERE id = $1`,
                [existing.id],
              );
            } else {
              const gj = toGeoJSONText(centerPoint);
              await manager.query(
                `
                UPDATE "location_address_components"
                SET "centerPoint" = ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)
                WHERE id = $2
                `,
                [gj, existing.id],
              );
            }
          }
          updated++;
        } else {
          const created = await manager.save(
            manager.create(LocationAddressComponent, rest as any),
          );

          if (centerPoint) {
            const gj = toGeoJSONText(centerPoint);
            await manager.query(
              `
              UPDATE "location_address_components"
              SET "centerPoint" = ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)
              WHERE id = $2
              `,
              [gj, created.id],
            );
          }

          inserted++;
        }
      }
    });

    return { inserted, updated };
  }
}

const locationAddressComponentRepository = new LocationAddressComponentRepository();
export { locationAddressComponentRepository as default, LocationAddressComponentRepository };

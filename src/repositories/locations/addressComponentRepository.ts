import { DeepPartial, In } from 'typeorm';
import BaseRepository from '../baseRepository';
import { AddressComponent } from '../../entities/locations/addressComponentEntity';
import { Location } from '../../entities/locations/locationEntity';
import { LocationAddressComponent } from '../../entities/locations/locationAddressComponentEntity';

type UUID = string;

export interface AddressComponentSearch {
  q?: string;
  type?: string | string[];
  parentId?: UUID | null;
  page?: number;
  limit?: number;
}

class AddressComponentRepository extends BaseRepository<AddressComponent> {
  constructor() {
    super(AddressComponent);
  }

  private async findByIdOrFail(id: UUID): Promise<AddressComponent> {
    const item = await this.findById(id);
    if (!item) throw new Error(`AddressComponent not found with ID: ${id}`);
    return item;
  }

  async createComponent(data: DeepPartial<AddressComponent>): Promise<AddressComponent> {
    try {
      return await this.create(data);
    } catch (error) {
      this.handleError(error, 'Error creating AddressComponent');
    }
  }

  async updateComponent(id: UUID, data: DeepPartial<AddressComponent>): Promise<AddressComponent> {
    await this.findByIdOrFail(id);
    try {
      await this.update(id, data);
      return await this.findByIdOrFail(id);
    } catch (error) {
      this.handleError(error, `Error updating AddressComponent with ID: ${id}`);
    }
  }

  async deleteComponent(id: UUID): Promise<void> {
    await this.findByIdOrFail(id);
    try {
      await this.delete(id);
    } catch (error) {
      this.handleError(error, `Error deleting AddressComponent with ID: ${id}`);
    }
  }

  async bulkDeleteComponents(ids: UUID[]): Promise<void> {
    if (!ids?.length) return;
    try {
      await this.bulkDelete({ id: In(ids) } as any);
    } catch (error) {
      this.handleError(error, 'Error bulk deleting AddressComponents');
    }
  }

  async getByTypeAndValue(type: string, value: string): Promise<AddressComponent | null> {
    try {
      return await this.findOne({ where: { type, value } });
    } catch (error) {
      this.handleError(error, `Error fetching AddressComponent (${type}:${value})`);
    }
  }

  async listByTypes(types: string[]): Promise<AddressComponent[]> {
    if (!types?.length) return [];
    try {
      return await this.find({ where: { type: In(types) as any } });
    } catch (error) {
      this.handleError(error, 'Error listing AddressComponents by types');
    }
  }

  async getForLocation(locationId: UUID): Promise<AddressComponent[]> {
    try {
      const rows = await this.executeCustomQuery((repo) =>
        repo
          .createQueryBuilder('ac')
          .innerJoin(LocationAddressComponent, 'lac', 'lac.address_component_id = ac.id')
          .innerJoin(Location, 'l', 'l.id = lac.location_id')
          .where('l.id = :locationId', { locationId })
          .orderBy('lac.sequence', 'ASC')
      );
      return rows;
    } catch (error) {
      this.handleError(error, `Error fetching AddressComponents for Location ID: ${locationId}`);
    }
  }

  async searchPaginated(opts: AddressComponentSearch) {
    const { q, type, parentId, page = 1, limit = 20 } = opts;

    return this.findWithAdvancedPagination(
      { page, limit, order: { type: 'ASC', value: 'ASC' } as any },
      undefined,
      undefined,
      undefined,
      (qb) => {
        qb = qb.from(AddressComponent, 'ac');

        if (q) {
          qb = qb.andWhere('(ac.type ILIKE :q OR ac.value ILIKE :q)', { q: `%${q}%` });
        }
        if (type) {
          const arr = Array.isArray(type) ? type : [type];
          qb = qb.andWhere('ac.type IN (:...types)', { types: arr });
        }
        if (parentId !== undefined) {
          if (parentId === null) {
            qb = qb.andWhere('ac.parent_component_id IS NULL');
          } else {
            qb = qb.andWhere('ac.parent_component_id = :pid', { pid: parentId });
          }
        }

        return qb;
      }
    );
  }

  // Note: AddressComponent isn’t a TypeORM Tree; we use SQL CTEs for recursion.
  async getChildren(parentId: UUID): Promise<AddressComponent[]> {
    try {
      return await this.find({ where: { parentComponent: { id: parentId } as any } });
    } catch (error) {
      this.handleError(error, `Error fetching children for AddressComponent ID: ${parentId}`);
    }
  }

  async getAncestorsCTE(id: UUID): Promise<AddressComponent[]> {
    try {
      const rows: AddressComponent[] = await this.dataSource.manager.query(
        `
        WITH RECURSIVE ancestors AS (
          SELECT ac.*
          FROM address_components ac
          WHERE ac.id = $1
          UNION ALL
          SELECT parent.*
          FROM address_components parent
          INNER JOIN ancestors a ON a.parent_component_id = parent.id
        )
        SELECT * FROM ancestors WHERE id <> $1;
        `,
        [id]
      );
      return rows;
    } catch (error) {
      this.handleError(error, `Error fetching ancestors for AddressComponent ID: ${id}`);
    }
  }

  async getDescendantsCTE(id: UUID): Promise<AddressComponent[]> {
    try {
      const rows: AddressComponent[] = await this.dataSource.manager.query(
        `
        WITH RECURSIVE descendants AS (
          SELECT ac.*
          FROM address_components ac
          WHERE ac.id = $1
          UNION ALL
          SELECT child.*
          FROM address_components child
          INNER JOIN descendants d ON child.parent_component_id = d.id
        )
        SELECT * FROM descendants WHERE id <> $1;
        `,
        [id]
      );
      return rows;
    } catch (error) {
      this.handleError(error, `Error fetching descendants for AddressComponent ID: ${id}`);
    }
  }

  async move(id: UUID, newParentId: UUID | null): Promise<AddressComponent> {
    const node = await this.findByIdOrFail(id);
    try {
      await this.update(id, {
        parentComponent: newParentId ? ({ id: newParentId } as any) : null,
      });
      return await this.findByIdOrFail(id);
    } catch (error) {
      this.handleError(error, `Error moving AddressComponent ID: ${id}`);
    }
  }

  /**
   * Upsert by unique triple (type, value, parent_component_id).
   * If a record exists, it’s updated with provided fields.
   */
  async upsertByTypeValueParent(
    data: DeepPartial<AddressComponent>
  ): Promise<AddressComponent> {
    const { type, value, parentComponent } = data;
    if (!type || !value) {
      throw new Error('type and value are required for upsertByTypeValueParent');
    }

    const parentId = (parentComponent as AddressComponent | undefined)?.id ?? null;

    const existing = await this.findOne({
      where: {
        type: type as string,
        value: value as string,
        ...(parentId === null
          ? { parentComponent: null }
          : { parentComponent: { id: parentId } as any }),
      },
    });

    if (existing) {
      return this.updateComponent(existing.id, data);
    }
    return this.createComponent(data);
  }

  async bulkUpsert(
    rows: Array<DeepPartial<AddressComponent>>
  ): Promise<{ inserted: number; updated: number }> {
    let inserted = 0;
    let updated = 0;

    await this.executeTransaction(async (manager) => {
      for (const row of rows) {
        const { type, value, parentComponent } = row;
        if (!type || !value) {
          throw new Error('Each row must include type and value for bulkUpsert');
        }
        const parentId = (parentComponent as AddressComponent | undefined)?.id ?? null;

        const existing = await manager.findOne(AddressComponent, {
          where: {
            type: type as string,
            value: value as string,
            ...(parentId === null
              ? { parentComponent: null }
              : { parentComponent: { id: parentId } as any }),
          },
        });

        if (existing) {
          updated++;
          await manager.update(AddressComponent, existing.id, row as any);
        } else {
          inserted++;
          const entity = manager.create(AddressComponent, row as any);
          await manager.save(entity);
        }
      }
    });

    return { inserted, updated };
  }
}

const addressComponentRepository = new AddressComponentRepository();
export { addressComponentRepository as default, AddressComponentRepository };

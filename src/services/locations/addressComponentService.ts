import { DeepPartial } from 'typeorm';
import { BaseService } from '../baseService';
import { logger } from '../../utils/logger';
import RedisCache from '../../utils/redisCache';

import { AddressComponent } from '../../entities/locations/addressComponentEntity';
import { Location } from '../../entities/locations/locationEntity';

import addressComponentRepository, {
  AddressComponentSearch as RepoSearch,
} from '../../repositories/locations/addressComponentRepository';

type UUID = string;

export interface CreateAddressComponentInput {
  type: string;
  value: string;
  parentId?: UUID | null;
  metadata?: Record<string, any> | undefined; // inherited from BaseModel
}

export interface UpdateAddressComponentInput extends Partial<CreateAddressComponentInput> {}

export interface AddressComponentSearch extends RepoSearch {}

function trimOrUndef(v?: string) {
  return typeof v === 'string' ? v.trim() || undefined : v;
}

class AddressComponentService extends BaseService<AddressComponent> {
  private readonly cacheNs = 'addrcomp';
  private readonly listCacheNs = 'addrcomp:list';

  private readonly listCache = new RedisCache<any>(3600);

  constructor() {
    super(
      {
        repository: addressComponentRepository,
        redisCache: new RedisCache<AddressComponent>(3600),
        logger,
      },
      'address_component'
    );
  }

  private keyById(id: string) {
    return `${this.cacheNs}:${id}`;
  }
  private keyForList(filter: AddressComponentSearch) {
    return `${this.listCacheNs}:${JSON.stringify(filter)}`;
  }

  async createComponent(input: CreateAddressComponentInput): Promise<AddressComponent> {
    if (!input.type || !input.value) {
      throw new Error('type and value are required');
    }

    const payload: DeepPartial<AddressComponent> = {
      type: trimOrUndef(input.type)!,
      value: trimOrUndef(input.value)!,
      ...(input.parentId !== undefined
        ? { parentComponent: input.parentId ? ({ id: input.parentId } as any) : undefined }
        : {}),
    };

    const created = await this.repository.create(payload);
    await this.cache.setToCache(this.cacheNs, this.keyById(created.id as string), created);
    return created;
  }

  async updateComponent(id: UUID, input: UpdateAddressComponentInput): Promise<AddressComponent> {
    await this.getById(id);

    const payload: DeepPartial<AddressComponent> = {
      type: input.type !== undefined ? trimOrUndef(input.type) : undefined,
      value: input.value !== undefined ? trimOrUndef(input.value) : undefined,
      ...(input.parentId !== undefined
        ? { parentComponent: input.parentId ? ({ id: input.parentId } as any) : null }
        : {}),
    };

    await this.repository.update(id as any, payload);
    const updated = await this.getById(id);
    await this.cache.setToCache(this.cacheNs, this.keyById(id), updated);
    return updated;
  }

  async deleteComponent(id: UUID): Promise<void> {
    await this.getById(id);
    await this.repository.delete(id);
    await this.cache.deleteKey(this.cacheNs, this.keyById(id));
  }

  async bulkDeleteComponents(ids: UUID[]): Promise<void> {
    if (!ids?.length) return;
    await (this.repository as any).bulkDeleteComponents(ids);
    await Promise.all(ids.map((id) => this.cache.deleteKey(this.cacheNs, this.keyById(id))));
  }

  async getById(id: UUID): Promise<AddressComponent> {
    const ck = this.keyById(id);
    const cached = (await this.cache.getFromCache(this.cacheNs, ck)) as AddressComponent | null;
    if (cached) return cached;

    const item = await this.repository.findById(id);
    if (!item) throw new Error('address component not found');
    await this.cache.setToCache(this.cacheNs, ck, item);
    return item;
  }

  async getByTypeAndValue(type: string, value: string) {
    return (this.repository as any).getByTypeAndValue(type, value);
  }

  async listByTypes(types: string[]) {
    return (this.repository as any).listByTypes(types);
  }

  async getForLocation(locationId: UUID): Promise<AddressComponent[]> {
    return (this.repository as any).getForLocation(locationId);
  }

  async searchPaginated(opts: AddressComponentSearch) {
    const ck = this.keyForList(opts);
    const cached = (await this.listCache.getFromCache(this.listCacheNs, ck)) as any;
    if (cached) return cached;

    const result = await (this.repository as any).searchPaginated(opts);
    await this.listCache.setToCache(this.listCacheNs, ck, result);
    return result;
  }

  async getChildren(parentId: UUID) {
    return (this.repository as any).getChildren(parentId);
  }

  async getAncestors(id: UUID) {
    return (this.repository as any).getAncestorsCTE(id);
  }

  async getDescendants(id: UUID) {
    return (this.repository as any).getDescendantsCTE(id);
  }

  async move(id: UUID, newParentId: UUID | null) {
    const moved = await (this.repository as any).move(id, newParentId);
    await this.cache.deleteKey(this.cacheNs, this.keyById(id));
    await this.cache.setToCache(this.cacheNs, this.keyById(moved.id as string), moved);
    return moved;
  }

  async upsertByTypeValueParent(input: CreateAddressComponentInput): Promise<AddressComponent> {
    const payload: DeepPartial<AddressComponent> = {
      type: trimOrUndef(input.type)!,
      value: trimOrUndef(input.value)!,
      parentComponent:
        input.parentId !== undefined
          ? input.parentId
            ? ({ id: input.parentId } as any)
            : null
          : undefined,
    };

    const upserted = await (this.repository as any).upsertByTypeValueParent(payload);
    await this.cache.setToCache(this.cacheNs, this.keyById(upserted.id as string), upserted);
    return upserted;
  }

  async bulkUpsert(
    rows: Array<CreateAddressComponentInput | UpdateAddressComponentInput>
  ): Promise<{ inserted: number; updated: number }> {
    const payloads: Array<DeepPartial<AddressComponent>> = rows.map((r) => ({
      type: r.type !== undefined ? trimOrUndef(r.type) : undefined,
      value: r.value !== undefined ? trimOrUndef(r.value) : undefined,
      parentComponent:
        r.parentId !== undefined ? (r.parentId ? ({ id: r.parentId } as any) : null) : undefined,
      metadata: (r as any).metadata ?? undefined,
    }));

    const res = await (this.repository as any).bulkUpsert(payloads);

    return res;
  }
}

export default new AddressComponentService();

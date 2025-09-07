import { EntitySchema } from 'typeorm';

type ResourceProperties = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  kind: string;
  resourceId: string;
  resourceType: string;
  attributes: Record<string, any>;
};

class Resource implements ResourceProperties {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  kind: string;
  resourceId: string;
  resourceType: string;
  attributes: Record<string, any>;

  constructor(
    kind: string,
    resourceId: string,
    resourceType: string,
    attributes: Record<string, any> = {}
  ) {
    this.kind = kind;
    this.resourceId = resourceId;
    this.resourceType = resourceType;
    this.attributes = attributes;
  }
}

// Define the ResourceSchema using EntitySchema
const ResourceSchema = new EntitySchema<Resource>({
  name: 'Resource',
  tableName: 'resources',
  target: Resource,
  columns: {
    // Inherit base columns from BaseModel
    id: {
      type: 'uuid',
      primary: true,
      generated: 'uuid',
    },
    createdAt: {
      type: 'timestamp',
      createDate: true,
    },
    updatedAt: {
      type: 'timestamp',
      updateDate: true,
    },
    deletedAt: {
      type: 'timestamp',
      nullable: true,
      deleteDate: true,
    },
    // Additional columns for Resource
    kind: {
      type: 'varchar',
      length: 255,
      nullable: false,
    },
    resourceId: {
      type: 'varchar',
      length: 255,
      nullable: false,
    },
    resourceType: {
      type: 'varchar',
      length: 255,
      nullable: false,
    },
    attributes: {
      type: 'jsonb',
      nullable: true,
    },
  },
  indices: [
    {
      name: 'IDX_RESOURCE_KIND',
      columns: ['kind'],
    },
    {
      name: 'IDX_RESOURCE_TYPE',
      columns: ['resourceType'],
    },
  ],
});

export { Resource, ResourceSchema };

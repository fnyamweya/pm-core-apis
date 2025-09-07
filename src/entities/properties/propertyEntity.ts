import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  BeforeInsert,
} from 'typeorm';
import { IsNotEmpty, IsOptional, IsString, MaxLength, IsJSON } from 'class-validator';
import { BaseModel } from '../baseEntity';
import { Organization } from '../organizations/organizationEntity';
import { PropertyOwnerEntity } from '../properties/propertyOwnerEntity';
import { PropertyUnit } from './propertyUnitEntity';
import { PropertyAddressEntity } from './propertyAddressEntity';
import { PropertyStaffEntity } from './propertyStaffEntity';
import { PropertyEquipmentEntity } from './propertyEquipmentEntity';

@Entity('properties')
@Index(['name', 'organization'], { unique: true })
export class Property extends BaseModel {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  @IsString()
  @IsNotEmpty({ message: 'Property name is required' })
  @MaxLength(100)
  name!: string;

  @Column({ type: 'varchar', length: 50, nullable: true, unique: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @Column({ type: 'varchar', length: 50 })
  @IsString()
  @IsNotEmpty()
  type!: string;

  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @ManyToOne(() => Organization, { eager: true })
  @JoinColumn({ name: 'organization_id' })
  organization?: Organization;

  @OneToMany(() => PropertyOwnerEntity, (owner) => owner.property, { cascade: true })
  owners?: PropertyOwnerEntity[];

  @OneToMany(() => PropertyStaffEntity, (staff) => staff.property, { cascade: true })
  staff?: PropertyStaffEntity[];

  /**
   * List of addresses for this property.
   * Example: Main, Gate, Utility, Secondary, Caretaker etc.
   */
  @OneToMany(
    () => PropertyAddressEntity,
    (propertyAddress) => propertyAddress.property,
    { cascade: true }
  )
  addresses?: PropertyAddressEntity[];

  /**
   * Units within this property (apartments/rooms/etc).
   */
  @OneToMany(() => PropertyUnit, (unit) => unit.property, { cascade: true })
  units?: PropertyUnit[];

  /**
   * Equipment or assets associated with this property.
   */
  @OneToMany(() => PropertyEquipmentEntity, (equipment) => equipment.property, {
    cascade: true,
  })
  equipment?: PropertyEquipmentEntity[];

  /**
   * JSONB config for dynamic settings, rules, policies, IoT, etc.
   */
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsJSON({ message: 'Config must be a valid JSON object' })
  config?: Record<string, any>;

  /**
   * Metadata field for arbitrary tagging, flags, notes.
   */
  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  @IsJSON({ message: 'Metadata must be a valid JSON object' })
  metadata?: Record<string, any>;

  @Column({ type: 'boolean', default: true })
  isActive?: boolean;

  @Column({ type: 'boolean', default: true })
  isListed?: boolean;

  @BeforeInsert()
  setDefaults() {
    this.isActive = this.isActive !== false;
    this.isListed = this.isListed !== false;
  }
}

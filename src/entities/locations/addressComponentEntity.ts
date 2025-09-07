import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { LocationAddressComponent } from './locationAddressComponentEntity';

/**
 * AddressComponent entity representing hierarchical parts of an address, such as Estate, Block, or HouseNumber.
 */
@Entity('address_components')
export class AddressComponent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * The type of address component, such as Estate, Block, or HouseNumber.
   * Examples: 'Estate', 'Block', 'HouseNumber'
   */
  @Column({ type: 'varchar', length: 50 })
  @IsNotEmpty({ message: 'Component type cannot be empty' })
  @IsString({ message: 'Component type must be a string' })
  @MaxLength(50, { message: 'Component type cannot exceed 50 characters' })
  type!: string;

  @OneToMany(
    () => LocationAddressComponent,
    (lac) => lac.addressComponent,
    { cascade: true }
  )
  locationLinks!: LocationAddressComponent[];

  /**
   * The actual value of the address component.
   * Examples: 'Greenwood Estate', 'Block A', '101'
   */
  @Column({ type: 'varchar', length: 100 })
  @IsNotEmpty({ message: 'Component value cannot be empty' })
  @IsString({ message: 'Component value must be a string' })
  @MaxLength(100, { message: 'Component value cannot exceed 100 characters' })
  value!: string;

  /**
   * Reference to the parent address component, if any.
   * This enables hierarchical organization within each service location.
   */
  @ManyToOne(
    () => AddressComponent,
    (addressComponent) => addressComponent.childComponents,
    { nullable: true, onDelete: 'CASCADE' }
  )
  @JoinColumn({ name: 'parent_component_id' })
  parentComponent?: AddressComponent;

  /**
   * List of child address components under this component.
   * For example, blocks under an estate, or house numbers under a block.
   */
  @OneToMany(
    () => AddressComponent,
    (addressComponent) => addressComponent.parentComponent,
    { cascade: true }
  )
  childComponents!: AddressComponent[];
}

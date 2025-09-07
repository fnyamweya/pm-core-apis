import { IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseModel } from '../baseEntity';
import { AddressComponent } from '../locations/addressComponentEntity';
import { Location } from '../locations/locationEntity';
import { Organization } from '../organizations/organizationEntity';
import { UserEntity } from '../users/userEntity'; // Assume a user entity exists

/**
 * UserAddress entity representing an address associated with a user.
 */
@Entity('user_addresses')
export class UserAddress extends BaseModel {
  /**
   * Unique code for each record, generated as a UUID.
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Reference to the user who owns this address.
   */
  @ManyToOne(() => UserEntity, (user) => user.addresses, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'user_id' })
  @ValidateIf((o) => !o.organization, {
    message: 'User is required if organization is not provided.',
  })
  user?: UserEntity;

  /**
   * Reference to the organization that this address is associated with.
   */
  @ManyToOne(() => Organization, (organization) => organization.addresses, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'organization_id' })
  @ValidateIf((o) => !o.user, {
    message: 'Organization is required if user is not provided.',
  })
  organization?: Organization;

  /**
   * Reference to the service location (geographic area) that this address is part of.
   */
  @ManyToOne(() => Location, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'service_location_id' })
  location?: Location;

  /**
   * Label for the address, e.g., "Home", "Work".
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  @IsOptional()
  @IsString({ message: 'Label must be a string.' })
  @MaxLength(50, { message: 'Label cannot exceed 50 characters.' })
  label?: string;

  /**
   * Additional notes or custom details for this user address.
   */
  @Column({ type: 'text', nullable: true })
  @IsOptional()
  @IsString({ message: 'Notes must be a string.' })
  notes?: string;

  // /**
  //  * List of address components (e.g., Estate, Block, House Number) that form the full address.
  //  */
  // @OneToMany(
  //   () => AddressComponent,
  //   (addressComponent) => addressComponent.userAddress,
  //   { cascade: true }
  // )
  // addressComponents!: AddressComponent[];
}

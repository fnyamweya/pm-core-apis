import { Exclude } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';
import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Role } from '../accessControl/roleEntity';
import { UserEntity } from './userEntity';

/**
 * UserRole represents the relationship between users and roles.
 */
@Entity('user_roles')
export class UserRole {
  @PrimaryColumn()
  @IsNotEmpty({ message: 'User ID cannot be empty' })
  @IsString({ message: 'User ID must be a string' })
  userId!: string;

  @PrimaryColumn()
  @IsNotEmpty({ message: 'Role code cannot be empty' })
  @IsString({ message: 'Role code must be a string' })
  roleId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId', referencedColumnName: 'id' })
  @Exclude()
  user!: UserEntity;

  @ManyToOne(() => Role, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roleId', referencedColumnName: 'id' })
  role!: Role;
}

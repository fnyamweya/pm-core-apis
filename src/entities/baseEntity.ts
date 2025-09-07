import { IsOptional, IsString } from 'class-validator';
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  UpdateDateColumn,
} from 'typeorm';

interface Metadata {
  [key: string]: any;
}

export abstract class BaseModel extends BaseEntity {
  /**
   * Timestamp for when the record was created, automatically managed by TypeORM.
   */
  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  /**
   * Timestamp for when the record was last updated, automatically managed by TypeORM.
   */
  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString({ message: 'CreatedBy must be a string.' })
  createdBy?: string;

  @Column({ type: 'varchar', nullable: true })
  @IsOptional()
  @IsString({ message: 'UpdatedBy must be a string.' })
  updatedBy?: string;

  @Column({ type: 'jsonb', nullable: true })
  @IsOptional()
  metadata?: Metadata;

  /**
   * Timestamp for when the record was deleted, automatically set by TypeORM on soft delete.
   * This field is optional and remains null if the record is not soft-deleted.
   */
  @DeleteDateColumn({ type: 'timestamp', nullable: true })
  deletedAt?: Date;
}

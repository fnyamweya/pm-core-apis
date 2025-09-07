import { IsNotEmpty } from 'class-validator';
import { Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { BaseModel } from '../baseEntity';
import { Order } from '../orders/orderEntity';
import { UserEntity } from './userEntity';

@Entity('user_orders')
export class UserOrder extends BaseModel {
  /**
   * Unique code for each record, generated as a UUID.
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Reference to the order associated with this user.
   */
  @ManyToOne(() => Order, (order) => order.userOrders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  @IsNotEmpty({ message: 'Order reference cannot be empty.' })
  order: Order;
}

import { Entity, PrimaryGeneratedColumn, Column, BaseEntity, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from './User';

@Entity()
export class ChatMessage extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { nullable: false })
  sender!: User;

  @ManyToOne(() => User, { nullable: true })
  receiver?: User; // null for broadcast

  @Column()
  message!: string;

  @Column({ default: 'direct' })
  type!: 'direct' | 'broadcast';

  @CreateDateColumn()
  createdAt!: Date;
} 
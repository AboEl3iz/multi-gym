import { Entity, PrimaryGeneratedColumn, Column, BaseEntity, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from './User';

@Entity()
export class Notification extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { nullable: false })
  user!: User;

  @Column()
  message!: string;

  @Column({ default: 'info' })
  type!: 'info' | 'offer' | 'reminder' | 'alert';

  @Column({ default: false })
  read!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
} 
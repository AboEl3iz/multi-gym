import { Entity, PrimaryGeneratedColumn, Column, BaseEntity, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from './User';
import { Schedule } from './Schedule';

@Entity()
export class SessionBooking extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { nullable: false })
  member!: User;

  @ManyToOne(() => Schedule, { nullable: false })
  schedule!: Schedule;

  @Column({ default: 'booked' })
  status!: 'booked' | 'cancelled' | 'attended' | 'missed';

  @CreateDateColumn()
  createdAt!: Date;
} 
import { Entity, PrimaryGeneratedColumn, Column, BaseEntity, ManyToOne } from 'typeorm';
import { Class } from './Class';
import { Room } from './Room';
import { User } from './User';
import { Branch } from './Branch';

@Entity()
export class Schedule extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Class, { nullable: false })
  class!: Class;

  @ManyToOne(() => Room, { nullable: false })
  room!: Room;

  @ManyToOne(() => User, { nullable: false })
  trainer!: User;

  @ManyToOne(() => Branch, { nullable: false })
  branch!: Branch;

  @Column()
  startTime!: Date;

  @Column()
  endTime!: Date;
} 
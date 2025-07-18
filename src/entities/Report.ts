import { Entity, PrimaryGeneratedColumn, Column, BaseEntity, ManyToOne, CreateDateColumn } from 'typeorm';
import { Branch } from './Branch';

@Entity()
export class Report extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  type!: string; // e.g., 'attendance', 'revenue', 'performance'

  @ManyToOne(() => Branch, { nullable: true })
  branch?: Branch;

  @Column()
  period!: string; // e.g., '2024-05', '2024-05-01', etc.

  @Column({ type: 'jsonb' })
  data!: any;

  @CreateDateColumn()
  createdAt!: Date;
} 
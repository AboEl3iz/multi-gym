import { Entity, PrimaryGeneratedColumn, Column, BaseEntity, ManyToOne, CreateDateColumn } from 'typeorm';
import { Branch } from './Branch';

@Entity()
export class Offer extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  title!: string;

  @Column({ nullable: true })
  description?: string;

  @Column('float')
  discount!: number; // e.g., 0.15 for 15%

  @Column()
  type!: string; // e.g., 'membership', 'booking', 'global'

  @ManyToOne(() => Branch, { nullable: true })
  branch?: Branch;

  @Column()
  validFrom!: Date;

  @Column()
  validTo!: Date;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
} 
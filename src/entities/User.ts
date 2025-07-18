import { Entity, PrimaryGeneratedColumn, Column, BaseEntity, ManyToOne } from 'typeorm';
import { Branch } from './Branch';

export type UserRole = 'SuperAdmin' | 'BranchAdmin' | 'Trainer' | 'Member';

@Entity("users")
export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  password!: string;

  @Column({ type: 'enum', enum: ['SuperAdmin', 'BranchAdmin', 'Trainer', 'Member'] })
  role!: UserRole;

  @ManyToOne(() => Branch, { nullable: true })
  branch?: Branch;
} 
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Client } from './client.entity';
import { Contract } from './contract.entity';
import { AuditLog } from './audit-log.entity';

@Entity('businesses')
export class Business {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @OneToMany(() => User, (user) => user.business)
  users: User[];

  @OneToMany(() => Client, (client) => client.business)
  clients: Client[];

  @OneToMany(() => Contract, (contract) => contract.business)
  contracts: Contract[];

  @OneToMany(() => AuditLog, (log) => log.business)
  auditLogs: AuditLog[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

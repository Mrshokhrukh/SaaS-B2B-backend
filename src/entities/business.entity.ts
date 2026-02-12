import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AuditLog } from './audit-log.entity';
import { Client } from './client.entity';
import { Contract } from './contract.entity';
import { ContractTemplate } from './contract-template.entity';
import { Invoice } from './invoice.entity';
import { Payment } from './payment.entity';
import { User } from './user.entity';

@Entity('businesses')
export class Business {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 180 })
  @Index({ unique: true })
  name: string;

  @Column({ length: 180, unique: true })
  slug: string;

  @OneToMany(() => User, (user) => user.business)
  users: User[];

  @OneToMany(() => Client, (client) => client.business)
  clients: Client[];

  @OneToMany(() => ContractTemplate, (template) => template.business)
  templates: ContractTemplate[];

  @OneToMany(() => Contract, (contract) => contract.business)
  contracts: Contract[];

  @OneToMany(() => Invoice, (invoice) => invoice.business)
  invoices: Invoice[];

  @OneToMany(() => Payment, (payment) => payment.business)
  payments: Payment[];

  @OneToMany(() => AuditLog, (auditLog) => auditLog.business)
  auditLogs: AuditLog[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

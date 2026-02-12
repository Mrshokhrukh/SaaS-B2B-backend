import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ContractStatus } from '../common/enums/contract-status.enum';
import { Business } from './business.entity';
import { Client } from './client.entity';
import { ContractTemplate } from './contract-template.entity';
import { Invoice } from './invoice.entity';
import { User } from './user.entity';

@Entity('contracts')
@Index(['businessId', 'status'])
export class Contract {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  businessId: string;

  @ManyToOne(() => Business, (business) => business.contracts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ type: 'uuid' })
  clientId: string;

  @ManyToOne(() => Client, (client) => client.contracts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @Column({ type: 'uuid' })
  templateId: string;

  @ManyToOne(() => ContractTemplate, (template) => template.contracts, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'template_id' })
  template: ContractTemplate;

  @Column({ type: 'uuid' })
  createdByUserId: string;

  @ManyToOne(() => User, (user) => user.contracts, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by_user_id' })
  createdBy: User;

  @Column({ length: 180 })
  title: string;

  @Column({ type: 'text' })
  renderedBody: string;

  @Column({ type: 'varchar', length: 64, unique: true })
  @Index({ unique: true })
  publicToken: string;

  @Column({
    type: 'enum',
    enum: ContractStatus,
    default: ContractStatus.CREATED,
  })
  status: ContractStatus;

  @Column({ length: 60, unique: true })
  contractNumber: string;

  @Column({ type: 'integer' })
  amountCents: number;

  @Column({ length: 3, default: 'USD' })
  currency: string;

  @Column({ type: 'timestamptz', nullable: true })
  sentAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  viewedAt: Date | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  viewerIp: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  signedAt: Date | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  signedIp: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  signedPdfPath: string | null;

  @OneToOne(() => Invoice, (invoice) => invoice.contract)
  invoice: Invoice;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

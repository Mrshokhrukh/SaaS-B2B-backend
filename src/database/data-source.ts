import 'dotenv/config';
import { DataSource } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';
import { Business } from '../entities/business.entity';
import { Client } from '../entities/client.entity';
import { Contract } from '../entities/contract.entity';
import { ContractTemplate } from '../entities/contract-template.entity';
import { Invoice } from '../entities/invoice.entity';
import { Payment } from '../entities/payment.entity';
import { User } from '../entities/user.entity';
import { SnakeNamingStrategy } from './snake-naming.strategy';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  entities: [
    Business,
    User,
    Client,
    ContractTemplate,
    Contract,
    Invoice,
    Payment,
    AuditLog,
  ],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
  namingStrategy: new SnakeNamingStrategy(),
});

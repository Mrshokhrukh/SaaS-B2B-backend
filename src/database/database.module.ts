import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { SnakeNamingStrategy } from './snake-naming.strategy';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): TypeOrmModuleOptions => ({
        type: 'postgres',
        host: config.get<string>('database.host') ?? 'localhost',
        port: config.get<number>('database.port') ?? 5432,
        username: config.get<string>('database.user') ?? 'postgres',
        password: config.get<string>('database.password') ?? 'postgres',
        database: config.get<string>('database.name') ?? 'contracts_platform',
        ssl:
          (config.get<boolean>('database.ssl') ?? false)
            ? { rejectUnauthorized: false }
            : false,
        autoLoadEntities: true,
        synchronize: false,
        namingStrategy: new SnakeNamingStrategy(),
        migrationsRun: config.get<boolean>('database.migrationsRun') ?? false,
        migrations: ['dist/database/migrations/*.js'],
        logging: config.get<boolean>('database.logging') ?? false,
      }),
    }),
  ],
})
export class DatabaseModule {}

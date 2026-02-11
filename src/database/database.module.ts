import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host', { infer: true }),
        port: configService.get<number>('database.port', { infer: true }),
        username: configService.get<string>('database.username', { infer: true }),
        password: configService.get<string>('database.password', { infer: true }),
        database: configService.get<string>('database.name', { infer: true }),
        synchronize: configService.get<boolean>('database.synchronize', { infer: true }),
        logging: configService.get<boolean>('database.logging', { infer: true }),
        autoLoadEntities: true,
      }),
    }),
  ],
})
export class DatabaseModule {}

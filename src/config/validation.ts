import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  APP_NAME: Joi.string().default('contract-platform-api'),
  PORT: Joi.number().default(3000),
  API_PREFIX: Joi.string().default('api/v1'),
  CORS_ORIGIN: Joi.string().default('*'),

  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),
  DB_SSL: Joi.boolean().default(false),
  DB_MIGRATIONS_RUN: Joi.boolean().default(true),
  DB_LOGGING: Joi.boolean().default(false),

  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_TLS: Joi.boolean().default(false),

  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_TTL: Joi.string().default('15m'),
  JWT_REFRESH_TTL: Joi.string().default('30d'),

  OTP_TTL_SECONDS: Joi.number().default(300),
  RATE_LIMIT_WINDOW_SECONDS: Joi.number().default(60),
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(120),
  PUBLIC_LINK_CACHE_TTL_SECONDS: Joi.number().default(120),
  PUBLIC_CONTRACT_BASE_URL: Joi.string().uri().required(),

  MOCK_CLICK_WEBHOOK_SECRET: Joi.string().min(12).required(),
  MOCK_PAYME_WEBHOOK_SECRET: Joi.string().min(12).required(),
  SIGNED_CONTRACTS_DIR: Joi.string().default('storage/signed-contracts'),
});

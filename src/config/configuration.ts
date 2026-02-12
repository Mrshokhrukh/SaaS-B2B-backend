export default () => ({
  app: {
    name: process.env.APP_NAME ?? 'contract-platform-api',
    env: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.PORT ?? 3000),
    apiPrefix: process.env.API_PREFIX ?? 'api/v1',
    corsOrigin: process.env.CORS_ORIGIN ?? '*',
  },
  database: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true',
    migrationsRun: process.env.DB_MIGRATIONS_RUN === 'true',
    logging: process.env.DB_LOGGING === 'true',
  },
  redis: {
    host: process.env.REDIS_HOST,
    port: Number(process.env.REDIS_PORT ?? 6379),
    password: process.env.REDIS_PASSWORD || undefined,
    tls: process.env.REDIS_TLS === 'true',
  },
  auth: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '30d',
  },
  otp: {
    ttlSeconds: Number(process.env.OTP_TTL_SECONDS ?? 300),
  },
  rateLimit: {
    windowSeconds: Number(process.env.RATE_LIMIT_WINDOW_SECONDS ?? 60),
    maxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 120),
  },
  publicLinks: {
    ttlSeconds: Number(process.env.PUBLIC_LINK_CACHE_TTL_SECONDS ?? 120),
    baseUrl:
      process.env.PUBLIC_CONTRACT_BASE_URL ??
      'http://localhost:3000/public/contracts',
  },
  payments: {
    clickSecret: process.env.MOCK_CLICK_WEBHOOK_SECRET,
    paymeSecret: process.env.MOCK_PAYME_WEBHOOK_SECRET,
  },
  storage: {
    signedContractsPath:
      process.env.SIGNED_CONTRACTS_DIR ?? 'storage/signed-contracts',
  },
});

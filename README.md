# Contract Platform API

## Folder Structure

```text
api/
  src/
    app.module.ts
    main.ts
    common/
      decorators/
      enums/
      filters/
      guards/
      interceptors/
      types/
      utils/
    config/
      configuration.ts
      validation.ts
    database/
      data-source.ts
      database.module.ts
      migrations/
      seeds/
    redis/
      redis.constants.ts
      redis.module.ts
      redis.service.ts
    entities/
      audit-log.entity.ts
      business.entity.ts
      client.entity.ts
      contract-template.entity.ts
      contract.entity.ts
      invoice.entity.ts
      payment.entity.ts
      user.entity.ts
    audit/
      audit.module.ts
      audit.service.ts
    auth/
      auth.module.ts
      auth.controller.ts
      auth.service.ts
      dto/
      guards/
      strategies/
    business/
      business.module.ts
      business.service.ts
    users/
      users.module.ts
      users.service.ts
      dto/
    clients/
      clients.module.ts
      clients.service.ts
    contracts/
      contracts.module.ts
      contracts.controller.ts
      contracts.service.ts
      dto/
    invoices/
      invoices.module.ts
      invoices.service.ts
    payments/
      payments.module.ts
      payments.controller.ts
      payments.service.ts
      dto/
      providers/
    health/
      health.module.ts
      health.controller.ts
  Dockerfile
  docker-compose.yml
  .env.example
  package.json
```

## Run Locally

```bash
cp .env.example .env
npm install
npm run migration:run
npm run seed
npm run start:dev
```

API base URL:

```text
http://localhost:3000/api/v1
```

## Run With Docker

```bash
cp .env.example .env
docker compose up --build
```

## Environment Variables

```text
NODE_ENV
APP_NAME
PORT
API_PREFIX
CORS_ORIGIN

DB_HOST
DB_PORT
DB_USER
DB_PASSWORD
DB_NAME
DB_SSL
DB_MIGRATIONS_RUN
DB_LOGGING

REDIS_HOST
REDIS_PORT
REDIS_PASSWORD
REDIS_TLS

JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
JWT_ACCESS_TTL
JWT_REFRESH_TTL

OTP_TTL_SECONDS
RATE_LIMIT_WINDOW_SECONDS
RATE_LIMIT_MAX_REQUESTS
PUBLIC_LINK_CACHE_TTL_SECONDS
PUBLIC_CONTRACT_BASE_URL

MOCK_CLICK_WEBHOOK_SECRET
MOCK_PAYME_WEBHOOK_SECRET
SIGNED_CONTRACTS_DIR
```

## Main Routes

```text
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
POST   /api/v1/auth/staff
GET    /api/v1/auth/me
POST   /api/v1/auth/me/audit

POST   /api/v1/templates
GET    /api/v1/templates
GET    /api/v1/contracts
POST   /api/v1/contracts
POST   /api/v1/contracts/:id/send-link
GET    /api/v1/contracts/:id

GET    /api/v1/public/contracts/:token
POST   /api/v1/public/contracts/:token/otp/request
POST   /api/v1/public/contracts/:token/otp/verify

POST   /api/v1/payments/invoices/:invoiceId/intents
POST   /api/v1/payments/webhooks/:provider
GET    /api/v1/payments/:id

GET    /api/v1/health
GET    /api/docs
```

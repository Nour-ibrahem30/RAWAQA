# Environment Configuration — RAWAQA

**Version:** 2.0
**Last Updated:** 2026-09-02
**Status:** Template — apply when backend is implemented

> **⚠️ SUPERSEDED HISTORY:** Version 1.0 contained `DATABASE_URL` (PostgreSQL DSN) and referenced Prisma. These are replaced by `MONGODB_URI` and Redis configuration. Do NOT use `DATABASE_URL` or any PostgreSQL connection string in this project.

---

## Environment Files

| File | Purpose | Commit to git? |
|------|---------|----------------|
| `.env.example` | Documented variable names with placeholder values | **Yes** |
| `.env` | Local development secrets | **Never** |
| `.env.staging` | Staging secrets (secure store / CI secrets) | **Never** |
| `.env.production` | Production secrets (secure store / CI secrets) | **Never** |

**Rule:** All environment variables are loaded via `src/config/env.ts` using a Zod schema. No `process.env.*` access outside that module. This ensures missing or malformed variables fail at startup, not at runtime.

---

## Variable Reference

### Application

```bash
NODE_ENV=development|staging|production
PORT=3000
API_BASE_URL=http://localhost:3000/api/v1
FRONTEND_URL=http://localhost:8000
LOG_LEVEL=debug|info|warn|error
```

### MongoDB

```bash
# Full connection string — MongoDB Atlas or self-hosted
# Format: mongodb+srv://user:password@cluster.mongodb.net/rawaqa_dev
# Or local: mongodb://localhost:27017/rawaqa_dev
MONGODB_URI=mongodb://localhost:27017/rawaqa_dev

# Optional: connection pool size (default: 10)
MONGODB_POOL_SIZE=10
```

> **Replaces:** `DATABASE_URL` (PostgreSQL) from v1.0. Do not use `DATABASE_URL`.

### Redis (BullMQ backing store — DEC-017)

```bash
# Full Redis connection URL
# Local: redis://localhost:6379
# TLS: rediss://user:password@host:6380
REDIS_URL=redis://localhost:6379
```

### Authentication (DEC-006)

```bash
# Minimum 32 bytes random string — generate with: openssl rand -base64 32
JWT_SECRET=change-me-use-openssl-rand-base64-32

# Access token expiry — MUST be 15m per DEC-006
JWT_ACCESS_EXPIRY=15m

# Refresh token expiry
JWT_REFRESH_EXPIRY=7d

# bcrypt cost factor — minimum 12
BCRYPT_ROUNDS=12
```

> **Note:** `JWT_EXPIRY=24h` from v1.0 is superseded. The authoritative expiry is `JWT_ACCESS_EXPIRY=15m`.

### Odoo Integration (DEC-021)

```bash
# Client's Odoo instance — provided by client (DEC-016 OPEN)
ODOO_URL=https://odoo.example.com
ODOO_DB=rawaqa
ODOO_USERNAME=api_integration
ODOO_API_KEY=

# Enable/disable Odoo sync (false in dev until credentials available)
ODOO_SYNC_ENABLED=false

# Retry configuration
ODOO_SYNC_MAX_RETRIES=4
```

> **Client dependency:** `ODOO_URL`, `ODOO_DB`, `ODOO_USERNAME`, `ODOO_API_KEY` must be provided by the client before Odoo integration can be tested. See DEC-016.

### SMS Integration (DEC-022)

```bash
# Provider identifier — 'console' for dev/test (ConsoleSmsAdapter)
# Set to real provider name when DEC-004 is resolved
SMS_PROVIDER=console

# Provider credentials — populated when DEC-004 is resolved
SMS_API_KEY=
SMS_API_URL=
SMS_SENDER_ID=RAWAQA

# Enable/disable SMS sending
# false = use ConsoleSmsAdapter (logs to stdout instead of sending)
SMS_ENABLED=false

# Default language for SMS templates
# ar = Arabic, en = English
SMS_DEFAULT_LOCALE=ar
```

### Localization (DEC-015, DEC-023)

```bash
# Default language when Accept-Language header is absent or unsupported
# Must be 'ar' per DEC-023
DEFAULT_LANGUAGE=ar

# Supported languages (comma-separated)
SUPPORTED_LANGUAGES=ar,en
```

### Storage (Product Images)

```bash
# Storage backend
STORAGE_TYPE=local|s3

# Local storage path (development)
STORAGE_PATH=./uploads

# S3-compatible storage (production)
# S3_BUCKET=
# S3_REGION=
# S3_ACCESS_KEY=
# S3_SECRET_KEY=
# S3_ENDPOINT=   # for non-AWS S3-compatible services
```

### CORS

```bash
# Comma-separated list of allowed origins
CORS_ORIGINS=http://localhost:8000,https://www.rawaqa.example.com
```

### Optional Monitoring

```bash
# Sentry DSN for error tracking (optional)
SENTRY_DSN=
```

---

## Frontend Configuration

When the backend API is live, the frontend needs the API base URL. Since the frontend is vanilla JS (no build step — DEC-011), this is injected as a runtime config object:

```html
<!-- In index.html or a separate config.js loaded before main.js -->
<script>
  window.RAWAQA_CONFIG = {
    API_BASE_URL: 'https://api.rawaqa.example.com/v1'
  };
</script>
```

**Rule:** No secrets in frontend config. Only the API base URL. Never inject `JWT_SECRET`, `MONGODB_URI`, or any API key into the frontend.

---

## .env.example (Template)

The following block is the intended content for `.env.example` once the backend is scaffolded. It resolves ISSUE-015 (currently empty `.env.example`):

```bash
# RAWAQA Backend — Environment Variables
# Copy this file to .env and fill in real values
# NEVER commit .env to git

# Application
NODE_ENV=development
PORT=3000
API_BASE_URL=http://localhost:3000/api/v1
FRONTEND_URL=http://localhost:8000
LOG_LEVEL=debug

# MongoDB (DEC-003-MONGODB)
MONGODB_URI=mongodb://localhost:27017/rawaqa_dev
MONGODB_POOL_SIZE=10

# Redis — BullMQ (DEC-017)
REDIS_URL=redis://localhost:6379

# Authentication (DEC-006)
JWT_SECRET=CHANGE_ME_GENERATE_WITH_OPENSSL_RAND_BASE64_32
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
BCRYPT_ROUNDS=12

# Odoo Integration (DEC-021) — credentials from client (DEC-016)
ODOO_URL=https://odoo.example.com
ODOO_DB=rawaqa
ODOO_USERNAME=api_integration
ODOO_API_KEY=
ODOO_SYNC_ENABLED=false
ODOO_SYNC_MAX_RETRIES=4

# SMS Integration (DEC-022) — provider from client (DEC-004)
SMS_PROVIDER=console
SMS_API_KEY=
SMS_API_URL=
SMS_SENDER_ID=RAWAQA
SMS_ENABLED=false
SMS_DEFAULT_LOCALE=ar

# Localization (DEC-015, DEC-023)
DEFAULT_LANGUAGE=ar
SUPPORTED_LANGUAGES=ar,en

# Storage
STORAGE_TYPE=local
STORAGE_PATH=./uploads

# CORS
CORS_ORIGINS=http://localhost:8000

# Optional
SENTRY_DSN=
```

---

## Responsibility Matrix

| Config Item | Developer | Client |
|-------------|-----------|--------|
| `MONGODB_URI` (prod) | Setup (Atlas/VPS) | Fund hosting (DEC-025) |
| `REDIS_URL` (prod) | Setup | Fund |
| `JWT_SECRET` | Generate | — |
| `ODOO_*` | Integrate | Provide credentials (DEC-016) |
| `SMS_*` | Integrate | Provider account (DEC-004) |
| Domain / DNS | Assist | Own domain |
| SSL | Configure | Approve |

---

## Related Documents

- Architecture: `docs/03-architecture/System-Architecture.md`
- Database config: `docs/05-database/ERD.md`
- Security: `docs/08-security/Security-Specification.md`
- Decisions: `docs/00-ai/Decision-Log.md` DEC-003-MONGODB, DEC-017, DEC-006

# Decision-Log — RAWAQA

**Authoritative record of architectural and product decisions.**  
**Last updated:** 2026-09-02 (Architecture sync — MongoDB + i18n + Guest Checkout)  
**Rule:** Never add a decision here without documentary evidence. For unresolved decisions mark `Status: OPEN`.

---

## How to Read This Log

- `Accepted` — In force. All code and documentation must comply.
- `Superseded` — Was accepted; replaced by a later decision. Preserved for historical context. Do NOT implement superseded decisions.
- `OPEN` — Unresolved. Do not assume an answer.

---

## Accepted Decisions

---

### DEC-001

**Decision ID:** DEC-001
**Decision:** Build RAWAQA as a custom-coded website, not a CMS or e-commerce platform (no Shopify, WooCommerce, Magento, or similar).
**Status:** Accepted
**Date:** Project initiation
**Reason:** Client requires full control, custom UX, Odoo integration, and a brand-specific experience not achievable within off-the-shelf platforms within budget.
**Alternatives Considered:** Shopify (rejected — integration limitations), WooCommerce (rejected — less control)
**Impact:** Full custom development required. Full code ownership.
**Affected Areas:** All layers
**Source:** `docs/01-product/Product-Overview.md`, `docs/01-product/PRD.md`

---

### DEC-002

**Decision ID:** DEC-002
**Decision:** Backend language and framework: **Node.js + TypeScript + Express**.
**Status:** Accepted
**Date:** 2026-09-02
**Reason:** Single language ecosystem across frontend (JS) and backend (TS). TypeScript provides compile-time type safety aligned with Mongoose schema types. Express is well-supported, lightweight, and widely known in the Egyptian development market. BullMQ (job queue) and the Node.js XML-RPC client are mature in this ecosystem.
**Alternatives Considered:** Python + FastAPI (rejected — language split with frontend), PHP + Laravel (rejected — weaker TypeScript integration and job queue story)
**Impact:** All backend source files are TypeScript. Compile step required (`tsc` or `ts-node` for dev). `tsconfig.json` required. All services, repositories, and controllers use TypeScript interfaces and types.
**Affected Areas:** Entire backend layer, deployment (compile step), CI/CD, testing
**Supersedes:** DEC-002 (OPEN — backend stack undecided)
**Source:** Architecture decision prompt 2026-09-02
**Related Issues:** Resolves ISSUE-009, ISSUE-010

---

### DEC-003-MONGODB

**Decision ID:** DEC-003-MONGODB
**Decision:** Primary application database: **MongoDB** with **Mongoose** as the ODM.
**Status:** Accepted
**Date:** 2026-09-02
**Reason:** MongoDB's document model is well-suited to the embedded order snapshot pattern, flexible product variant structures, and the bilingual `{ ar, en }` localized field pattern. Mongoose provides schema validation, middleware hooks, and index management in TypeScript.
**Alternatives Considered:** PostgreSQL + Prisma (see DEC-003-PG — Superseded)
**Impact:** All database interactions go through Mongoose models and a repository layer. No SQL. No migrations in the relational sense — Mongoose schemas define structure, Mongoose indexes are created on application startup or via scripts. Seed scripts use Mongoose models.
**Affected Areas:** All backend services, repositories, database documentation, environment configuration, testing
**Supersedes:** DEC-003 (PostgreSQL — Superseded)
**Source:** Architecture decision prompt 2026-09-02
**Related Issues:** Resolves ISSUE-009

---

### DEC-005

**Decision ID:** DEC-005
**Decision:** Cash on Delivery (COD) is the only payment method at launch.
**Status:** Accepted
**Date:** Requirements phase
**Reason:** Fastest path to launch; no payment gateway complexity or fees; appropriate for Egyptian market at MVP.
**Alternatives Considered:** Paymob (deferred), Fawry (deferred), Stripe (out of scope)
**Impact:** No payment gateway code required. Checkout flow: place order → COD confirmed. Payment gateway is a post-MVP Change Request.
**Affected Areas:** Frontend checkout, backend order creation, order status logic
**Source:** `docs/02-requirements/FRS.md`, `docs/01-product/Roadmap.md`

---

### DEC-006

**Decision ID:** DEC-006
**Decision:** Use JWT (JSON Web Tokens) for API authentication.
**Status:** Accepted
**Date:** Architecture phase
**Reason:** Stateless, works well for SPA-to-API communication, industry standard.
**Alternatives Considered:** Session cookies (rejected — stateful, CORS complexity)
**Impact:** Backend issues short-lived access tokens (15 minutes) and refresh tokens (7 days). Access token in Authorization header. Refresh token in HttpOnly cookie or secure storage. Previous references to 24h expiry in `Auth-Security.md` are superseded — the authoritative expiry is **15 minutes access / 7 days refresh**.
**Affected Areas:** Auth endpoints, all protected API routes, frontend auth module
**Source:** `docs/03-architecture/Auth-Security.md`, `docs/08-security/Security-Specification.md`

---

### DEC-008

**Decision ID:** DEC-008
**Decision:** Order number format is `RWQ-{zero-padded sequential number}`.
**Status:** Accepted
**Date:** Requirements phase
**Reason:** Brand-identifiable, human-readable for customer support and SMS.
**Alternatives Considered:** UUIDs (rejected — not human-friendly)
**Impact:** Order creation must generate and store this format. Track order uses it. SMS template includes it. In MongoDB this is a field on the Order document, not derived from `_id`.
**Affected Areas:** Order collection, order creation service, track order API, SMS template
**Source:** `js/main.js` (demo: RWQ-10482), `docs/02-requirements/FRS.md`

---

### DEC-009

**Decision ID:** DEC-009
**Decision:** Odoo integration is asynchronous and non-blocking.
**Status:** Accepted
**Date:** Architecture phase
**Reason:** Odoo API latency must not delay order confirmation. Odoo downtime must not prevent orders being accepted.
**Alternatives Considered:** Synchronous push (rejected)
**Impact:** Requires BullMQ job queue. Orders confirmed before Odoo sync. `odooSyncStatus` field on Order document tracks state.
**Affected Areas:** Order creation, BullMQ job queue, Odoo adapter
**Source:** `docs/06-integrations/Odoo-Integration-Specification.md`

---

### DEC-010

**Decision ID:** DEC-010
**Decision:** SMS integration is asynchronous and non-blocking.
**Status:** Accepted
**Date:** Architecture phase
**Reason:** SMS delivery failure must not cancel a confirmed order.
**Impact:** SMS sent after order confirmed. `smsStatus` field on Order document tracks state.
**Affected Areas:** Order creation, BullMQ job queue, SMS adapter
**Source:** `docs/06-integrations/SMS-Integration-Specification.md`

---

### DEC-011

**Decision ID:** DEC-011
**Decision:** Frontend is a vanilla HTML/CSS/ES5 JavaScript SPA with no build step and no npm.
**Status:** Accepted
**Date:** Project initiation / frontend prototype
**Reason:** Simplicity, zero build infrastructure, fast iteration at prototype stage.
**Impact:** No bundler, no TypeScript on frontend. Any new frontend JS must be compatible with ES5 IIFE style. Framework introduction requires a formal decision.
**Affected Areas:** Frontend — all files
**Source:** `index.html`, `js/main.js`, `css/styles.css`

---

### DEC-012

**Decision ID:** DEC-012
**Decision:** Commercial scope is fixed at 35,000 EGP with a 3-payment structure.
**Status:** Accepted
**Date:** Client agreement
**Impact:** Features outside scope require a formal Change Request.
**Affected Areas:** All — scope boundary
**Source:** `docs/12-client-proposal/Commercial-Summary.md`

---

### DEC-013

**Decision ID:** DEC-013
**Decision:** Guest checkout is **enabled**. Orders can be placed without a registered account.
**Status:** Accepted
**Date:** 2026-09-02
**Reason:** Egyptian e-commerce has high cart abandonment from forced registration. Guest checkout maximises conversion. The MongoDB Order document's `customerSnapshot` field captures all fulfillment data for guest orders. This was the recommended option in the Pre-Implementation Decision Report.
**Alternatives Considered:** Account required before checkout (rejected — conversion risk; adds auth dependency on checkout path)
**Impact:**
- Cart document: `userId` is nullable; `sessionId` is required for guest identification.
- Order document: `userId` is nullable; `customerSnapshot` is mandatory (captures name, phone, email at checkout time).
- `POST /orders` accepts requests without a Bearer token (session-based auth as alternative).
- Cart endpoints support both JWT and session ID identification.
- Guest orders are associated by `sessionId`; no order history without an account.
**Affected Areas:** Cart collection, Order collection, checkout API, auth middleware, cart API
**Supersedes:** DEC-013 (OPEN — guest checkout undecided)
**Source:** Architecture decision prompt 2026-09-02
**Related Issues:** Resolves ISSUE-014

---

### DEC-015

**Decision ID:** DEC-015
**Decision:** Arabic **and** English language support from MVP. Full bilingual platform.
**Status:** Accepted
**Date:** 2026-09-02
**Reason:** The platform serves the Egyptian market where both Arabic and English are expected. Not deferring Arabic to post-MVP ensures content quality and avoids a costly i18n retrofit. The current frontend prototype's `toggleLang()` already establishes intent.
**Alternatives Considered:** Arabic-only MVP (rejected — English content may be needed for some product names and admin use); English-only MVP (rejected — primary market is Arabic-speaking)
**Impact:**
- Localized content fields use a `{ ar: string, en: string }` embedded object pattern in MongoDB.
- Affected fields: `product.name`, `product.description`, `product.longDescription`, `category.name`, `category.description`.
- `product.slug` is a single language-independent identifier (not localized).
- API responses include a `lang` query parameter or `Accept-Language` header for language selection.
- Default language when none specified: **Arabic (`ar`)**.
- Frontend language state drives `Accept-Language` header on all API requests.
- RTL (Arabic) and LTR (English) layout switching is required.
- Admin product creation/editing must support both `ar` and `en` content fields.
**Affected Areas:** Product collection, Category collection, API responses, frontend i18n, admin product management, SMS templates (both languages)
**Supersedes:** DEC-015 (OPEN — Arabic strategy undecided)
**Source:** Architecture decision prompt 2026-09-02
**Related Issues:** Resolves ISSUE-007

---

### DEC-017

**Decision ID:** DEC-017
**Decision:** Asynchronous job processing: **BullMQ + Redis**.
**Status:** Accepted
**Date:** 2026-09-02
**Reason:** BullMQ is the most mature job queue for Node.js, backed by Redis. It provides built-in retry policies, exponential backoff, dead-letter queues, job status tracking, and a monitoring dashboard (Bull Board). Redis is a lightweight dependency appropriate for MVP scale.
**Alternatives Considered:** Agenda (MongoDB-backed, rejected — weaker retry story), node-cron (rejected — not a proper queue), RabbitMQ (rejected — overkill for MVP)
**Impact:** Redis instance required in all environments (local dev: Docker or local Redis). `REDIS_URL` environment variable required. Two queues: `odoo-sync` and `sms-notifications`. Workers run as part of the same Node.js process at MVP or as separate processes post-MVP.
**Affected Areas:** Backend job workers, Odoo adapter, SMS adapter, environment configuration, deployment
**Source:** Architecture decision prompt 2026-09-02

---

### DEC-018

**Decision ID:** DEC-018
**Decision:** Input validation library: **Zod**.
**Status:** Accepted
**Date:** 2026-09-02
**Reason:** Zod is TypeScript-first — schemas double as both runtime validators and TypeScript type definitions. Eliminates duplication between Mongoose schema validation and API input validation. Better DX than Joi for TypeScript projects.
**Alternatives Considered:** Joi (rejected — JavaScript-first, requires separate type definitions), class-validator (rejected — requires decorators, more boilerplate)
**Impact:** All API request bodies validated with Zod schemas before reaching service layer. Zod parse errors mapped to standard `VALIDATION_ERROR` response format.
**Affected Areas:** All API routes, validation middleware
**Source:** Architecture decision prompt 2026-09-02

---

### DEC-019

**Decision ID:** DEC-019
**Decision:** Logging library: **Pino**.
**Status:** Accepted
**Date:** 2026-09-02
**Reason:** Pino is the fastest structured JSON logger for Node.js. Works well with Express via `pino-http`. Supports log levels, redaction of sensitive fields (phone numbers, API keys), and structured output compatible with log aggregators.
**Alternatives Considered:** Winston (rejected — slower, more complex), console.log (rejected — unstructured, no levels)
**Impact:** All logging uses Pino. Sensitive fields (phone, password hash, API keys) configured as redacted. Log level controlled by `LOG_LEVEL` environment variable.
**Affected Areas:** All backend modules, middleware
**Source:** Architecture decision prompt 2026-09-02

---

### DEC-020

**Decision ID:** DEC-020
**Decision:** Testing framework: **Jest + Supertest**.
**Status:** Accepted
**Date:** 2026-09-02
**Reason:** Jest is the standard TypeScript/Node.js testing framework with excellent async support. Supertest enables HTTP-level integration testing of Express routes without a running server. Both are well-supported with Mongoose test patterns (in-memory MongoDB via `mongodb-memory-server`).
**Alternatives Considered:** Vitest (considered — faster but less mature ecosystem for Mongoose), pytest (rejected — Python-only, wrong language)
**Impact:** All backend tests use Jest. API integration tests use Supertest. Mongoose models tested against in-memory MongoDB. SMS and Odoo adapters tested with Jest mocks.
**Affected Areas:** Test suite, CI/CD pipeline
**Source:** Architecture decision prompt 2026-09-02

---

### DEC-021

**Decision ID:** DEC-021
**Decision:** Odoo integration uses **adapter pattern with XML-RPC as the initial protocol**.
**Status:** Accepted
**Date:** 2026-09-02
**Reason:** XML-RPC is supported by all Odoo versions (15, 16, 17) and Community/Enterprise editions. The adapter pattern isolates the protocol from the OrderService, allowing future migration to Odoo REST API (v16+) without touching business logic. Development proceeds against the adapter interface; real XML-RPC connection awaits client credentials.
**Alternatives Considered:** Odoo REST API only (rejected — v16+ only, version not yet confirmed), direct HTTP calls without adapter (rejected — tightly couples OrderService to Odoo protocol)
**Impact:** `OdooAdapter` interface defined. `XmlRpcOdooAdapter` implements it. `OrderService` depends on the interface, not the implementation. All retry logic, idempotency, and logging live in the adapter/job layer.
**Affected Areas:** Backend Odoo service, job queue, order service
**Source:** Architecture decision prompt 2026-09-02, `docs/06-integrations/Odoo-Integration-Specification.md`

---

### DEC-022

**Decision ID:** DEC-022
**Decision:** SMS integration uses **adapter pattern with Mock/Console provider for development**.
**Status:** Accepted
**Date:** 2026-09-02
**Reason:** Adapter pattern allows provider swapping without touching OrderService. Development and test environments use a `ConsoleSmsAdapter` that logs to stdout instead of sending real SMS. This unblocks the full order flow end-to-end before a real provider is selected.
**Alternatives Considered:** No abstraction (rejected — forces provider selection before development), hardcoded Twilio (rejected — provider not yet selected)
**Impact:** `SmsAdapter` interface defined. `ConsoleSmsAdapter` ships with codebase. Real provider adapter implemented when DEC-004 is resolved. `SMS_PROVIDER=console` used in development/test.
**Affected Areas:** Backend SMS service, job queue, order service
**Source:** Architecture decision prompt 2026-09-02, `docs/06-integrations/SMS-Integration-Specification.md`

---

### DEC-023

**Decision ID:** DEC-023
**Decision:** Language default is **Arabic (`ar`)** when no language preference is specified.
**Status:** Accepted
**Date:** 2026-09-02
**Reason:** The primary market is Egypt. Arabic is the primary language. When `Accept-Language` header is absent or contains an unsupported locale, the API returns Arabic content.
**Alternatives Considered:** English default (rejected — primary market is Arabic-speaking), Error on missing header (rejected — degrades API usability)
**Impact:** API response localized content defaults to `.ar` field value. Frontend must explicitly set `Accept-Language: en` to receive English content. Admin-created content missing `ar` value falls back to `en` with a `translationMissing: true` flag in the response.
**Affected Areas:** All API endpoints returning localized content, API-Design.md, frontend language state
**Source:** Architecture decision prompt 2026-09-02

---

## Superseded Decisions (Historical — Do Not Implement)

---

### DEC-003 ~~(PostgreSQL)~~ — SUPERSEDED by DEC-003-MONGODB

**Decision ID:** DEC-003
**Original Decision:** Use PostgreSQL as the primary database with Prisma as the ORM.
**Status:** ⚠️ SUPERSEDED — 2026-09-02
**Superseded by:** DEC-003-MONGODB (MongoDB + Mongoose)
**Historical Reason:** PostgreSQL was recommended in the Pre-Implementation Decision Report for its relational model, JSONB support, and transactional integrity.
**Why Superseded:** MongoDB's document model better fits the embedded snapshot pattern, bilingual `{ ar, en }` field structure, and flexible product variant schema. Mongoose in TypeScript provides sufficient schema enforcement. Decision made by project team 2026-09-02.
**⚠️ DO NOT:** Use PostgreSQL, write SQL, reference Prisma, write database migrations, or use `DATABASE_URL` in this project.
**Source:** Pre-Implementation Decision Report, Architecture decision prompt 2026-09-02

---

## Open Decisions (Unresolved)

---

### DEC-004

**Decision ID:** DEC-004
**Decision:** SMS provider selection.
**Status:** OPEN
**Options Under Consideration:** Twilio, Infobip, VictoryLink, SMS Misr, other local Egyptian gateway
**What is needed:** Client to confirm provider, provide API key, confirm Arabic Unicode + sender ID support.
**Affected Areas:** SMS adapter implementation (real provider), `.env` SMS variables, `SMS_PROVIDER` value
**Blocker for:** Real SMS delivery (development unblocked by ConsoleSmsAdapter — DEC-022)
**Source:** `docs/06-integrations/SMS-Integration-Specification.md`

---

### DEC-014

**Decision ID:** DEC-014
**Decision:** Hosting provider selection.
**Status:** OPEN
**Options Under Consideration:** VPS (DigitalOcean, Hetzner), PaaS (Railway, Render), Egyptian/regional hosting
**Affected Areas:** Deployment architecture, CI/CD, SSL, environment variable injection, MongoDB hosting (Atlas vs self-hosted)
**Note:** MongoDB Atlas is the recommended managed option regardless of app hosting choice. Decision on app hosting can be deferred to deployment phase.
**Source:** `docs/10-deployment/Deployment-Operations.md`

---

### DEC-016

**Decision ID:** DEC-016
**Decision:** Odoo version and credentials confirmation.
**Status:** OPEN
**What is needed:** Client to confirm Odoo version (15/16/17), Community vs Enterprise, instance URL, DB name, username, API key, test environment access, and whether sale orders should arrive as draft or confirmed.
**Affected Areas:** `XmlRpcOdooAdapter` implementation, field mapping, test environment setup
**Blocker for:** Real Odoo integration (development unblocked by adapter pattern — DEC-021)
**Source:** `docs/06-integrations/Odoo-Integration-Specification.md`

---

### DEC-024

**Decision ID:** DEC-024
**Decision:** Language persistence strategy for frontend.
**Status:** OPEN
**Context:** DEC-015 established Arabic + English from MVP. The mechanism for persisting a user's language preference across sessions has not been decided.
**Options Under Consideration:**
- `localStorage` key (e.g., `rawaqa_lang`) — simple, guest-compatible
- URL prefix (`/ar/`, `/en/`) — SEO-friendly but requires router changes
- User profile field (authenticated users only) — server-persisted but guest-blind
- Cookie — works for both guest and authenticated
**Impact:** Affects frontend router, API call construction, and (for user profile option) the User document schema.
**What is needed:** Team decision. Recommendation: `localStorage` for MVP (simplest, no router change, guest-compatible) with user profile field added for authenticated users post-MVP.
**Affected Areas:** Frontend `toggleLang()` implementation, User document (if profile preference added), API `Accept-Language` header construction
**Source:** DEC-015, architecture decision prompt 2026-09-02

---

### DEC-025

**Decision ID:** DEC-025
**Decision:** MongoDB hosting — Atlas vs self-hosted.
**Status:** OPEN
**Context:** DEC-003-MONGODB confirms MongoDB. The hosting model (Atlas managed service vs self-hosted on VPS) is not yet decided.
**Options Under Consideration:**
- MongoDB Atlas free tier / M10+ (managed, recommended for MVP)
- Self-hosted MongoDB on VPS (lower cost, higher ops burden)
**Affected Areas:** `MONGODB_URI` format, deployment configuration, backup strategy
**What is needed:** Hosting provider decision (DEC-014) influences this.
**Source:** DEC-003-MONGODB, DEC-014

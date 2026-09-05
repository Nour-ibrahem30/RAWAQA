# AI-Context — RAWAQA

**Last updated:** 2026-09-02 (v2.0 — MongoDB + TypeScript + bilingual)
**Based on:** Full repository + documentation audit + architecture decision sync

---

## Project Identity

| Field | Value |
|-------|-------|
| **Name** | RAWAQA |
| **Type** | Custom e-commerce website |
| **Domain** | Premium bean bag and relaxed seating retail |
| **Market** | Egypt — EGP currency, Cairo/Alexandria primary delivery |
| **Platform** | Web only |
| **Business objective** | Online sales, Odoo ERP order handoff, SMS customer notifications |
| **Commercial value** | 35,000 EGP total |
| **Estimated delivery** | 4–6 weeks from kickoff |

---

## Confirmed Technology Stack

### Backend (Not Yet Implemented)

| Layer | Technology | Decision |
|-------|-----------|---------|
| Runtime | Node.js | DEC-002 |
| Language | TypeScript | DEC-002 |
| Framework | Express | DEC-002 |
| Database | **MongoDB** | DEC-003-MONGODB |
| ODM | **Mongoose** | DEC-003-MONGODB |
| Validation | Zod | DEC-018 |
| Logging | Pino | DEC-019 |
| Auth | JWT (15m access / 7d refresh) + bcrypt | DEC-006 |
| Async jobs | BullMQ + Redis | DEC-017 |
| Testing | Jest + Supertest | DEC-020 |
| Odoo protocol | XML-RPC (adapter pattern) | DEC-021 |
| SMS dev | Console/Mock adapter | DEC-022 |

> **⚠️ PostgreSQL and Prisma are NOT part of this project.** DEC-003 (PostgreSQL) was superseded by DEC-003-MONGODB on 2026-09-02.

### Frontend (Partially Implemented)

| Layer | Technology | Decision |
|-------|-----------|---------|
| Markup | HTML5 | In repository |
| Styles | CSS3 custom properties | In repository |
| JavaScript | Vanilla ES5 IIFE | DEC-011 |
| Build step | None | DEC-011 |

---

## Current Implementation Status

### Frontend
**Status: PARTIALLY_IMPLEMENTED**

High-fidelity prototype exists. Runs entirely on static mock data. Zero API calls.

| Feature | Status |
|---------|--------|
| Homepage, navigation, footer | ✅ IMPLEMENTED |
| Shop page grid (static data) | ⚠️ PARTIAL |
| Product detail page (static) | ⚠️ PARTIAL |
| Cart UI (static, no persistence) | ⚠️ PARTIAL |
| Language direction toggle | ⚠️ PARTIAL (direction only, no content) |
| Track order (mock demo only) | ⚠️ PARTIAL |
| Checkout | ❌ NOT IMPLEMENTED |
| Search / filters / sort | ❌ NOT IMPLEMENTED |
| Authentication | ❌ NOT IMPLEMENTED |
| Customer account | ❌ NOT IMPLEMENTED |

### Backend
**Status: NOT_IMPLEMENTED**
No server code, no `package.json`, no TypeScript, no Express.

### Database
**Status: NOT_IMPLEMENTED**
No MongoDB instance, no Mongoose models, no seed data.

### Authentication
**Status: NOT_IMPLEMENTED**

### Admin Dashboard
**Status: NOT_IMPLEMENTED**

### Odoo Integration
**Status: INTEGRATION_REQUIRED**
Fully specified. Awaiting client credentials (DEC-016 OPEN).

### SMS Integration
**Status: INTEGRATION_REQUIRED**
Fully specified. Awaiting provider selection (DEC-004 OPEN). Development unblocked by ConsoleSmsAdapter.

### Testing
**Status: NOT_IMPLEMENTED**

### Deployment
**Status: NOT_IMPLEMENTED**

---

## Architecture Mental Model

```
Customer Browser (Arabic RTL or English LTR)
  ↓  Accept-Language: ar | en
  ↓  Authorization: Bearer JWT  (authenticated)
  ↓  X-Session-ID: uuid          (guest)
Frontend SPA (index.html + main.js)
  ↓  HTTPS REST/JSON
Backend API (Node.js + TypeScript + Express)
  ↓  Mongoose
MongoDB
  ↓  (async BullMQ)
  ├── Odoo ERP (XML-RPC adapter)
  └── SMS Provider (adapter — Console in dev)
```

---

## Language and Localization

- **Arabic + English from MVP** (DEC-015) — not a post-MVP feature
- **Default language: Arabic** when `Accept-Language` absent (DEC-023)
- **Storage pattern:** `{ ar: "...", en: "..." }` embedded in MongoDB documents
- **RTL (Arabic) and LTR (English)** layout required — not just text direction change
- **Language persistence mechanism: OPEN** (DEC-024)
- Full spec: `docs/03-architecture/Localization-Architecture.md`

---

## Guest Checkout

- **Enabled** (DEC-013) — orders can be placed without registration
- Guest carts identified by `sessionId` (UUID v4 issued by backend)
- Guest orders: `userId = null`, `customerSnapshot` mandatory
- Cart and checkout endpoints: accept JWT **or** `X-Session-ID`
- Guest cart TTL: 7 days (MongoDB TTL index on `carts.expiresAt`)

---

## Key Business Rules

1. Order number format: `RWQ-{zero-padded sequential}` e.g. `RWQ-10483`
2. Free shipping threshold: EGP 3,000
3. Primary payment method: **COD only** (DEC-005) — no gateway at launch
4. Currency: **EGP** — prices stored as numbers (e.g. `3450`, not `"EGP 3,450"`)
5. SMS failure must never cancel a confirmed order
6. Odoo failure must never cancel a confirmed order (async retry)
7. Orders are immutable after creation — status updates only
8. Idempotent Odoo push — never duplicate `sale.order` for same website order
9. Idempotent SMS — never send duplicate confirmation for same order
10. Phone validation: normalize `01xxxxxxxxx` → `+20xxxxxxxxx` (E.164)
11. Admin routes never publicly linked from customer-facing site
12. `passwordHash` never returned by any API endpoint

---

## Critical Constraints (Must Not Violate)

1. **No PostgreSQL, no Prisma, no SQL** — MongoDB + Mongoose is the authoritative database (DEC-003-MONGODB)
2. **No payment gateway** — COD only (DEC-005). Gateway requires Change Request.
3. **No frontend secrets** — `MONGODB_URI`, `JWT_SECRET`, API keys must never appear in `index.html` or `main.js`
4. **No `.env` committed** — `.env.example` with placeholders only
5. **Backend stack is Node.js + TypeScript + Express** — confirmed (DEC-002)
6. **Arabic + English from MVP** — not deferred (DEC-015)
7. **Guest checkout is enabled** — not gated on account creation (DEC-013)
8. **SMS and Odoo are async** — never block the checkout response
9. **CSS design system must not change** without explicit client approval
10. **NoSQL injection prevention** required — Zod validation at API boundary, never pass raw objects to Mongoose queries

---

## What Does Not Exist (Do Not Assume)

- No `package.json` in repository — Node.js project not scaffolded yet
- No `.env` — environment not configured
- No Mongoose models — MongoDB schema not defined in code
- No API routes — no Express server
- No authentication — no JWT, no bcrypt in codebase
- No Arabic content — product data is English-only in static JS array
- No real product images — SVG placeholders only
- No tests — no Jest, no Supertest
- No Redis — BullMQ not configured
- No CI/CD pipeline

---

## Open Decisions (Still Unresolved)

| ID | Decision | Blocker |
|----|---------|---------|
| DEC-004 | SMS provider | Real SMS delivery |
| DEC-014 | Hosting provider | Deployment |
| DEC-016 | Odoo version + credentials | Odoo integration |
| DEC-024 | Language persistence mechanism | Frontend lang state |
| DEC-025 | MongoDB hosting (Atlas vs self-hosted) | Database deployment |

---

## Related Files

- Decisions: `docs/00-ai/Decision-Log.md`
- Implementation state: `docs/00-ai/Current-State.md`
- Architecture: `docs/00-ai/Architecture-Summary.md`
- Data model: `docs/05-database/ERD.md`
- Localization: `docs/03-architecture/Localization-Architecture.md`

# Project-Context — RAWAQA

**Detailed project context for AI coding agents.**
**Last updated:** 2026-09-02 (v2.0 — MongoDB + bilingual + guest checkout)

---

## 1. Product Overview

RAWAQA is a custom e-commerce website for premium bean bags and relaxed seating, targeting the Egyptian market. Premium, editorial brand aesthetic. Custom-built full-stack platform — not a CMS.

Platform covers: bilingual (Arabic/English) customer storefront SPA, REST backend API (Node.js + TypeScript + Express), MongoDB database (Mongoose), admin dashboard, Odoo ERP order integration, SMS transactional notifications.

**Current state:** Frontend prototype is ~20% of total deliverable. Backend, database, and integrations do not exist yet.

---

## 2. Business Model

- **Revenue:** Direct B2C e-commerce sales
- **Market:** Egypt — EGP pricing, local delivery
- **Payment:** Cash on Delivery (COD) only at launch — DEC-005
- **Fulfillment:** Client manages via Odoo ERP
- **Customer communication:** SMS confirmation on order placement
- **Catalog management:** Admin dashboard product CRUD

---

## 3. User Types

| Type | Description | Auth |
|------|-------------|------|
| Guest visitor | Browse products | None |
| Guest shopper | Place order without account (DEC-013) | `X-Session-ID` |
| Registered customer | Account with order history | JWT |
| Store admin | Full product and order management | JWT `role: admin` |
| Operations staff | Fulfills orders in Odoo (outside website) | N/A |

---

## 4. Customer Journey (Target)

```
1. Lands on homepage (AR or EN)
   ↓ IMPLEMENTED — hero, featured products, tiles

2. Browses shop in preferred language
   ↓ PARTIAL — grid renders static English data; filters unwired

3. Views product detail in preferred language
   ↓ PARTIAL — static data; variant selection client-only

4. Selects variant, sets quantity
   ↓ PARTIAL — client-side only

5. Adds to cart
   ↓ PARTIAL — increments badge; no X-Session-ID yet

6. Reviews cart
   ↓ PARTIAL — static HTML; no persistence

7. Proceeds to checkout (guest or authenticated)
   ↓ NOT IMPLEMENTED — toast placeholder

8. Enters name, phone (+20x), address
   ↓ NOT IMPLEMENTED

9. Confirms COD order
   ↓ NOT IMPLEMENTED

10. Sees confirmation page with RWQ- number
    ↓ NOT IMPLEMENTED

11. Receives SMS in preferred language (ar or en)
    ↓ NOT IMPLEMENTED — INTEGRATION_REQUIRED

12. Tracks order by RWQ- number
    ↓ PARTIAL — mock demo only
```

---

## 5. Admin Journey (Target — Not Implemented)

```
1. Admin logs in (JWT role:admin)
2. Views KPIs: orders today, pending, total products
3. Creates/edits products — must enter BOTH ar and en content
4. Manages orders: view list, update status
5. Views customers
```

---

## 6. Main Modules

| Module | Status | Priority |
|--------|--------|----------|
| Customer storefront SPA | PARTIALLY_IMPLEMENTED | P0 — connect to API |
| Backend REST API (Node.js + TS + Express) | NOT_IMPLEMENTED | P0 — scaffold first |
| MongoDB + Mongoose | NOT_IMPLEMENTED | P0 |
| JWT authentication | NOT_IMPLEMENTED | P0 |
| Guest checkout (X-Session-ID) | NOT_IMPLEMENTED | P0 |
| Cart and checkout | NOT_IMPLEMENTED | P0 |
| Order management | NOT_IMPLEMENTED | P0 |
| Admin dashboard | NOT_IMPLEMENTED | P0 |
| Bilingual content (ar + en) | NOT_IMPLEMENTED | P0 — required at MVP |
| RTL/LTR layout | NOT_IMPLEMENTED | P0 — required at MVP |
| Odoo integration | INTEGRATION_REQUIRED | P0 |
| SMS integration (console dev) | NOT_IMPLEMENTED | P0 — unblocked |
| SMS integration (real provider) | INTEGRATION_REQUIRED | P0 — awaits DEC-004 |
| Track order (real data) | NOT_IMPLEMENTED | P1 |
| Product search / filters / sort | NOT_IMPLEMENTED | P1 |
| Customer account / order history | NOT_IMPLEMENTED | P1 |
| SEO | NOT_IMPLEMENTED | P2 |

---

## 7. Core Entities (MongoDB Collections)

| Collection | Key Fields | Notes |
|------------|------------|-------|
| `users` | `_id`, `email`, `phone`, `passwordHash`, `fullName`, `role` | Customers + admins |
| `categories` | `_id`, `name {ar,en}`, `slug` | Relax, Game, Kids, Outdoor |
| `products` | `_id`, `slug`, `name {ar,en}`, `description {ar,en}`, `categoryId`, `basePrice`, `variants[]`, `images[]` | 8 seed products |
| `carts` | `_id`, `userId` (nullable), `sessionId`, `items[]`, `expiresAt` | Guest TTL 7 days |
| `orders` | `_id`, `orderNumber`, `userId` (nullable), `status`, `customerSnapshot`, `shippingAddress`, `items[]`, `statusHistory[]` | Immutable after creation |
| `integrationLogs` | `_id`, `orderId`, `provider`, `status`, `requestPayload`, `responsePayload` | Odoo + SMS audit trail |

Full schema: `docs/05-database/ERD.md`

---

## 8. Localization

- **Languages:** Arabic (`ar`) and English (`en`) — both from MVP (DEC-015)
- **Storage:** `{ ar: "...", en: "..." }` embedded in MongoDB documents
- **Default:** Arabic when `Accept-Language` absent (DEC-023)
- **API:** `Accept-Language` header drives language selection
- **Direction:** RTL for Arabic, LTR for English
- **Persistence:** OPEN — DEC-024 (interim: `localStorage`)
- **Client dependency:** Arabic product content must be supplied by client (ISSUE-017)

---

## 9. Integrations

### Odoo ERP (7,000 EGP)
- Direction: Website → Odoo (one-way push)
- Trigger: Confirmed order
- Creates: `res.partner` + `sale.order`
- Protocol: XML-RPC adapter (DEC-021)
- Async: BullMQ queue, max 4 retries (DEC-009)
- Blocked by: DEC-016 (client credentials OPEN)

### SMS (3,000 EGP)
- Direction: Backend → provider → customer phone
- Trigger: Successful order creation
- Templates: Arabic (primary) + English
- Adapter: `SmsAdapter` interface + `ConsoleSmsAdapter` for dev (DEC-022)
- Blocked by: DEC-004 (provider OPEN) — dev is unblocked

---

## 10. Technical Architecture

```
Customer Browser (AR RTL / EN LTR)
  + Accept-Language header
  + X-Session-ID (guest) or JWT (authenticated)
        ↓ HTTPS REST/JSON
Frontend SPA (index.html + main.js)
        ↓ HTTPS REST/JSON
Backend API — Node.js + TypeScript + Express
        ↓ Mongoose
MongoDB
  └── BullMQ → Redis
        ├── OdooSyncWorker (XmlRpcOdooAdapter)
        └── SmsSendWorker (SmsAdapter → Console/Real)
```

Full architecture: `docs/03-architecture/System-Architecture.md`

---

## 11. Important Workflows

### Checkout Flow (COD)
1. Frontend: `POST /api/orders` with JWT or `X-Session-ID`
2. Backend: validate cart, stock, phone, address
3. Backend: generate `RWQ-{seq}`, save order `status: confirmed`
4. Backend: returns 201 with `orderNumber` immediately
5. BullMQ: enqueue odoo-sync + sms-send (async)
6. Frontend: show confirmation page

### Order Tracking
1. Customer enters `RWQ-XXXXX`
2. Frontend: `GET /api/orders/track/:orderNumber` (public)
3. Backend: returns status + `statusHistory` array
4. Frontend: renders timeline in selected language

### Admin Status Update
1. Admin logs in (JWT `role:admin`)
2. `PATCH /api/admin/orders/:id/status`
3. Backend: validates transition, appends to `statusHistory`

---

## 12. Implementation Status Summary

| Layer | % Complete | Critical Blocker |
|-------|-----------|-----------------|
| Frontend UI | ~20% | Needs API connection |
| Backend API | 0% | Not scaffolded (DEC-002 now resolved) |
| MongoDB | 0% | Backend not started |
| Auth | 0% | Backend not started |
| Admin | 0% | Backend not started |
| Odoo | 0% | Backend + DEC-016 |
| SMS (console) | 0% | Backend not started |
| Tests | 0% | Backend not started |
| **Total** | **~2%** | Start backend scaffolding |

---

## 13. Files That Matter Right Now

| File | Purpose | Read Before |
|------|---------|-------------|
| `index.html` | Complete SPA markup | Any frontend change |
| `css/styles.css` | Design system | Any UI change |
| `js/main.js` | Routing, static data, UI | Any JS change |
| `docs/04-api/API-Design.md` | All API contracts | Any backend route |
| `docs/05-database/ERD.md` | MongoDB document model | Any DB work |
| `docs/02-requirements/FRS.md` | Functional requirements | Any feature |
| `docs/03-architecture/Localization-Architecture.md` | i18n, RTL/LTR | Any bilingual work |
| `docs/06-integrations/Odoo-Integration-Specification.md` | Odoo scope | Any Odoo work |
| `docs/06-integrations/SMS-Integration-Specification.md` | SMS scope | Any SMS work |
| `docs/08-security/Security-Specification.md` | Auth + NoSQL security | Any auth or API work |
| `docs/10-deployment/Environment-Configuration.md` | Env vars (MONGODB_URI etc.) | Any config work |

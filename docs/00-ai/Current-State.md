# Current-State — RAWAQA Implementation Status

**Last updated:** 2026-09-02 (v2.0 — architecture sync)
**Evidence source:** Direct repository inspection + architecture decision sync
**Important:** This is the single authoritative record of what is actually built.

---

## Status Key

| Symbol | Meaning |
|--------|---------|
| ✅ IMPLEMENTED | Works in production-equivalent form |
| ⚠️ PARTIALLY_IMPLEMENTED | UI or skeleton exists; not fully functional |
| ❌ NOT_IMPLEMENTED | Does not exist in codebase |
| 🔗 INTEGRATION_REQUIRED | Specified; awaiting external credentials/provider |
| ⚡ CONFLICTING | Code and docs disagree |

---

## Frontend — `index.html` + `css/styles.css` + `js/main.js`

| Area | Status | Evidence | Notes |
|------|--------|----------|-------|
| Homepage hero | ✅ IMPLEMENTED | `#page-home .hero` | |
| Category tiles | ✅ IMPLEMENTED | `.discover-grid` | |
| Featured products section | ✅ IMPLEMENTED | `renderProducts()` | Static JS array |
| Customer reviews section | ✅ IMPLEMENTED | `.reviews-grid` | Hardcoded content |
| Footer | ✅ IMPLEMENTED | `<footer>` | Static links |
| Desktop navigation | ✅ IMPLEMENTED | `.nav` | |
| Mobile menu | ✅ IMPLEMENTED | `#mmenu`, `toggleMenu()` | |
| SPA client-side routing | ✅ IMPLEMENTED | `go()` in `main.js` | |
| Scroll animations | ✅ IMPLEMENTED | IntersectionObserver | |
| Toast notifications | ✅ IMPLEMENTED | `showToast()` | |
| Language direction toggle | ⚠️ PARTIALLY_IMPLEMENTED | `toggleLang()` | Changes `dir`/`lang` attrs only; no Arabic content; no persistence |
| Shop page layout | ⚠️ PARTIALLY_IMPLEMENTED | `#page-shop` | Grid renders; filters/sort unwired |
| Shop filter controls | ❌ NOT_IMPLEMENTED | UI present; no JS handler | Dead UI — ISSUE-004 |
| Shop sort control | ❌ NOT_IMPLEMENTED | `<select>` present; no handler | Dead UI — ISSUE-004 |
| Product search | ❌ NOT_IMPLEMENTED | Button present; no handler | Dead UI — ISSUE-005 |
| Product detail page | ⚠️ PARTIALLY_IMPLEMENTED | `#page-pdp` | Static data; variant selection client-only |
| Product variant selection | ⚠️ PARTIALLY_IMPLEMENTED | `selectVariant()` | Client-side only |
| Quantity controls (PDP) | ⚠️ PARTIALLY_IMPLEMENTED | `changeQty()` | Works locally; not saved |
| Add to cart | ⚠️ PARTIALLY_IMPLEMENTED | `addToCart()` increments badge | Badge only; no cart state; no `sessionId` |
| Cart page | ⚠️ PARTIALLY_IMPLEMENTED | `#page-cart` static HTML | No persistence; static items |
| Cart item quantity controls | ❌ NOT_IMPLEMENTED | HTML present; no handler | Dead UI — ISSUE-006 |
| Cart remove item | ❌ NOT_IMPLEMENTED | HTML present; no handler | Dead UI — ISSUE-006 |
| Cart persistence | ❌ NOT_IMPLEMENTED | No storage calls | Resets on refresh |
| Checkout form | ❌ NOT_IMPLEMENTED | Toast placeholder only | ISSUE-002 |
| Order confirmation page | ❌ NOT_IMPLEMENTED | Does not exist | |
| Track order page (UI) | ⚠️ PARTIALLY_IMPLEMENTED | `#page-track` exists | |
| Track order (real data) | ❌ NOT_IMPLEMENTED | Hardcoded RWQ-10482 demo | ISSUE-003 |
| Customer authentication | ❌ NOT_IMPLEMENTED | No page, no logic | |
| Customer account / order history | ❌ NOT_IMPLEMENTED | Does not exist | |
| Arabic content | ❌ NOT_IMPLEMENTED | All text is English | ISSUE-017 |
| Language persistence | ❌ NOT_IMPLEMENTED | No `localStorage` call | ISSUE-016 |
| `Accept-Language` on API calls | ❌ NOT_IMPLEMENTED | No API calls exist yet | |
| Guest session (`X-Session-ID`) | ❌ NOT_IMPLEMENTED | No API calls exist yet | |
| Real product images | ❌ NOT_IMPLEMENTED | SVG placeholders only | ISSUE-013 |
| Product data from API | ❌ NOT_IMPLEMENTED | Static `PRODUCTS[]` array | 8 hardcoded; prices as strings — ISSUE-008 |
| API client / fetch layer | ❌ NOT_IMPLEMENTED | Zero `fetch()` calls | |

---

## Backend — Node.js + TypeScript + Express

| Area | Status | Evidence | Notes |
|------|--------|----------|-------|
| `package.json` / Node.js project | ❌ NOT_IMPLEMENTED | No file in repository | Scaffolding not started |
| `tsconfig.json` | ❌ NOT_IMPLEMENTED | No file | |
| Express server entry point | ❌ NOT_IMPLEMENTED | No file | |
| Middleware stack | ❌ NOT_IMPLEMENTED | — | CORS, rate limit, auth, Zod, Pino, error handler |
| Auth routes (`/api/auth/*`) | ❌ NOT_IMPLEMENTED | — | |
| Product routes (`/api/products`) | ❌ NOT_IMPLEMENTED | — | |
| Cart routes (`/api/cart`) | ❌ NOT_IMPLEMENTED | — | |
| Order routes (`/api/orders`) | ❌ NOT_IMPLEMENTED | — | |
| Admin routes (`/api/admin/*`) | ❌ NOT_IMPLEMENTED | — | |
| Track order endpoint | ❌ NOT_IMPLEMENTED | — | |
| Zod validators | ❌ NOT_IMPLEMENTED | — | |
| Service layer | ❌ NOT_IMPLEMENTED | — | |
| Repository layer | ❌ NOT_IMPLEMENTED | — | |
| BullMQ queues + workers | ❌ NOT_IMPLEMENTED | — | |
| `OdooAdapter` interface | ❌ NOT_IMPLEMENTED | — | |
| `XmlRpcOdooAdapter` | ❌ NOT_IMPLEMENTED | — | |
| `SmsAdapter` interface | ❌ NOT_IMPLEMENTED | — | |
| `ConsoleSmsAdapter` | ❌ NOT_IMPLEMENTED | — | |
| Pino logger | ❌ NOT_IMPLEMENTED | — | |

---

## Database — MongoDB + Mongoose

| Area | Status | Evidence | Notes |
|------|--------|----------|-------|
| MongoDB instance | ❌ NOT_IMPLEMENTED | No connection string | `MONGODB_URI` not configured |
| Mongoose models | ❌ NOT_IMPLEMENTED | No model files | Schema documented in ERD.md |
| `users` collection | ❌ NOT_IMPLEMENTED | — | |
| `categories` collection | ❌ NOT_IMPLEMENTED | — | 4 seed records needed |
| `products` collection | ❌ NOT_IMPLEMENTED | — | 8 seed products (need Arabic content) |
| `carts` collection | ❌ NOT_IMPLEMENTED | — | Guest TTL index needed |
| `orders` collection | ❌ NOT_IMPLEMENTED | — | |
| `integrationLogs` collection | ❌ NOT_IMPLEMENTED | — | |
| Repository layer | ❌ NOT_IMPLEMENTED | — | |
| Seed scripts | ❌ NOT_IMPLEMENTED | — | Need client Arabic content first |
| MongoDB indexes | ❌ NOT_IMPLEMENTED | — | Documented in Data-Dictionary.md |

---

## Authentication

| Area | Status | Evidence | Notes |
|------|--------|----------|-------|
| User registration | ❌ NOT_IMPLEMENTED | — | |
| User login (JWT 15m/7d) | ❌ NOT_IMPLEMENTED | — | |
| bcrypt password hashing | ❌ NOT_IMPLEMENTED | — | |
| JWT access + refresh tokens | ❌ NOT_IMPLEMENTED | — | |
| Admin authentication | ❌ NOT_IMPLEMENTED | — | |
| Guest session (`X-Session-ID`) | ❌ NOT_IMPLEMENTED | — | |
| Cart merge (guest → user) | ❌ NOT_IMPLEMENTED | — | |

---

## Admin Dashboard

| Area | Status | Evidence | Notes |
|------|--------|----------|-------|
| Admin UI | ❌ NOT_IMPLEMENTED | Not in repo | |
| Product management (CRUD) | ❌ NOT_IMPLEMENTED | — | Must support `{ ar, en }` content |
| Order management | ❌ NOT_IMPLEMENTED | — | |
| KPI dashboard | ❌ NOT_IMPLEMENTED | — | |

---

## Integrations

| Area | Status | Evidence | Notes |
|------|--------|----------|-------|
| Odoo adapter interface | ❌ NOT_IMPLEMENTED | — | DEC-021 |
| `XmlRpcOdooAdapter` | 🔗 INTEGRATION_REQUIRED | — | Awaiting DEC-016 (credentials) |
| Odoo customer sync | 🔗 INTEGRATION_REQUIRED | — | |
| Odoo order push | 🔗 INTEGRATION_REQUIRED | — | |
| Odoo retry queue | 🔗 INTEGRATION_REQUIRED | — | |
| SMS adapter interface | ❌ NOT_IMPLEMENTED | — | DEC-022 |
| `ConsoleSmsAdapter` (dev) | ❌ NOT_IMPLEMENTED | — | Unblocked — no credentials needed |
| Real SMS provider adapter | 🔗 INTEGRATION_REQUIRED | — | Awaiting DEC-004 |
| Bilingual SMS templates | ❌ NOT_IMPLEMENTED | — | Arabic + English required |

---

## Testing

| Area | Status | Notes |
|------|--------|-------|
| Jest configuration | ❌ NOT_IMPLEMENTED | |
| Unit tests — services | ❌ NOT_IMPLEMENTED | |
| Unit tests — repositories | ❌ NOT_IMPLEMENTED | |
| Unit tests — validators (Zod) | ❌ NOT_IMPLEMENTED | |
| Integration tests (Supertest) | ❌ NOT_IMPLEMENTED | |
| Localization tests | ❌ NOT_IMPLEMENTED | |
| E2E tests (Playwright) | ❌ NOT_IMPLEMENTED | |
| CI/CD pipeline | ❌ NOT_IMPLEMENTED | |

---

## Deployment

| Area | Status | Notes |
|------|--------|-------|
| `Dockerfile` | ❌ NOT_IMPLEMENTED | |
| `.env.example` populated | ❌ NOT_IMPLEMENTED | Template defined in Environment-Configuration.md |
| MongoDB hosting | ❌ NOT_IMPLEMENTED | DEC-025 OPEN |
| Redis hosting | ❌ NOT_IMPLEMENTED | |
| Hosting provider | ❌ NOT_IMPLEMENTED | DEC-014 OPEN |
| Domain / SSL | ❌ NOT_IMPLEMENTED | |
| Local dev server (frontend only) | ✅ IMPLEMENTED | `python -m http.server 8000` |

---

## Overall Completion

| Phase | Completion | Blocker |
|-------|-----------|---------|
| Frontend UI (static prototype) | ~20% | Needs API connection |
| Frontend → API client | 0% | Backend not built |
| Backend API | 0% | Scaffolding not started |
| MongoDB + Mongoose | 0% | Backend not started |
| Authentication | 0% | Backend not started |
| Admin dashboard | 0% | Backend not started |
| Odoo integration | 0% | Backend + credentials (DEC-016) |
| SMS integration (console) | 0% | Backend not started |
| SMS integration (real) | 0% | DEC-004 OPEN |
| Tests | 0% | Backend not started |
| Deployment | 0% | DEC-014, DEC-025 OPEN |
| **Total platform** | **~2%** | Backend scaffolding is the critical path |

---

## Undocumented Implementations (Code Without Formal Spec)

| Item | Location | Status |
|------|----------|--------|
| Cart badge hardcoded at `2` | `main.js` `cartCount = 2` | ISSUE-001 |
| Prices as formatted strings `"EGP 3,450"` | `PRODUCTS[]` in `main.js` | ISSUE-008 |
| Demo order RWQ-10482 hardcoded | `main.js` `trackOrder()` | ISSUE-003 |
| SVG icon sprite system | `index.html <defs>` | Not in UX specs |
| IntersectionObserver scroll animations | `main.js` | Not in FRS |

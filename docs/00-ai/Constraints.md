# Constraints — RAWAQA

**Central constraint registry. Last updated:** 2026-09-02 (v2.0 — MongoDB + i18n sync)
**These constraints must not be violated without a formal decision and Change Request.**

---

## 1. Business Constraints

| ID | Constraint | Source |
|----|-----------|--------|
| BC-001 | Cash on Delivery is the only payment method at launch. No gateway without Change Request. | DEC-005 |
| BC-002 | Scope is fixed at agreed deliverables. Features not in FRS require Change Request. | DEC-012 |
| BC-003 | Estimated delivery is 4–6 weeks from kickoff. | `docs/11-project-management/` |
| BC-004 | Odoo integration pushes orders only. Website does not modify client Odoo configuration. | `docs/06-integrations/Odoo-Integration-Specification.md` |
| BC-005 | Egyptian market only at MVP. EGP. Egyptian phones. Egyptian governorates. | `docs/01-product/Product-Overview.md` |
| BC-006 | Single admin role at MVP. No multi-staff RBAC. | `docs/02-requirements/FRS.md` |
| BC-007 | Product catalog: 4 fixed categories (Relax, Game, Kids, Outdoor). Changes require Change Request. | `docs/01-product/Product-Overview.md` |

---

## 2. Commercial / Scope Constraints

| Phase | Deliverable | Budget (EGP) |
|-------|-------------|-------------|
| Frontend Development | SPA prototype → fully wired storefront | 12,000 |
| Backend Development | REST API + MongoDB + auth + admin dashboard | 10,000 |
| Odoo Integration | Order push, customer sync, retry logic | 7,000 |
| SMS Integration | Order confirmation SMS, phone normalization | 3,000 |
| Testing, Deployment & Integration | Test suite, CI/CD, hosting, go-live | 3,000 |
| **Total** | | **35,000** |

Payment: 40% (14,000) → 30% (10,500) → 30% (10,500).

---

## 3. Technical Constraints

| ID | Constraint | Source |
|----|-----------|--------|
| TC-001 | Frontend is vanilla HTML/CSS/ES5 JS. No framework without formal decision. | DEC-011 |
| TC-002 | No frontend build step. Any new frontend JS must work natively in browser. | DEC-011 |
| TC-003 | Backend is **Node.js + TypeScript + Express** (DEC-002). Do not scaffold in Python, PHP, or any other language. | DEC-002 |
| TC-004 | Database is **MongoDB** with **Mongoose** ODM (DEC-003-MONGODB). **PostgreSQL and Prisma are not part of this project.** | DEC-003-MONGODB |
| TC-005 | Authentication must use JWT Bearer tokens (15m access / 7d refresh). No server-side sessions. | DEC-006 |
| TC-006 | Passwords must be hashed with bcrypt (min cost 12). No MD5, SHA1, or plaintext. | `docs/08-security/Security-Specification.md` |
| TC-007 | All API inputs must be validated server-side with **Zod**. Frontend validation is UX only. | DEC-018 |
| TC-008 | Odoo sync must be async and non-blocking (BullMQ). | DEC-009, DEC-017 |
| TC-009 | SMS delivery must be async and non-blocking (BullMQ). | DEC-010, DEC-017 |
| TC-010 | Order creation is idempotent with respect to Odoo push and SMS. | `docs/06-integrations/` |
| TC-011 | **NoSQL injection prevention:** Never pass raw user-input objects to Mongoose queries. Zod validates all inputs at the API boundary before any DB operation. Use `mongoose-sanitize` as defense-in-depth. | `docs/08-security/Security-Specification.md` |
| TC-012 | HTTPS required in production. | `docs/10-deployment/Deployment-Operations.md` |
| TC-013 | CORS configured to allow only known origins via `CORS_ORIGINS` env var. | `docs/03-architecture/System-Architecture.md` |
| TC-014 | Rate limiting on auth endpoints (10 req/min/IP) and checkout (5 req/min/IP). | `docs/08-security/Security-Specification.md` |
| TC-015 | Existing CSS design system variables must not be altered without explicit client approval. | `css/styles.css` |
| TC-016 | **Arabic + English from MVP.** Localized content uses `{ ar, en }` embedded object in MongoDB. Default language: Arabic (DEC-023). | DEC-015, DEC-023 |
| TC-017 | **Guest checkout is enabled.** `userId` is nullable on `carts` and `orders`. Guest sessions identified by `X-Session-ID` UUID header. | DEC-013 |
| TC-018 | All monetary values stored and transmitted as numeric EGP (e.g. `3450`). Never formatted strings in API or database. | `docs/05-database/ERD.md`, ISSUE-008 |

> **⚠️ TC-004 replaces former TC-004** which stated "Database is PostgreSQL." PostgreSQL is not an active architecture dependency.
> **⚠️ TC-011 replaces former TC-011** which stated "Parameterize all database queries / no SQL interpolation." MongoDB is not SQL; the equivalent constraint is NoSQL injection prevention via Zod and explicit query construction.

---

## 4. Security Constraints

| ID | Constraint | Source |
|----|-----------|--------|
| SC-001 | `MONGODB_URI`, `JWT_SECRET`, `REDIS_URL`, `ODOO_API_KEY`, `SMS_API_KEY` must never appear in frontend code. | `docs/08-security/Security-Specification.md` |
| SC-002 | `.env` must never be committed. `.env.example` has placeholders only. | `docs/08-security/Security-Specification.md` |
| SC-003 | Admin routes (`/api/admin/*`) require JWT with `role: 'admin'`. Frontend routing is not sufficient. | `docs/08-security/Security-Specification.md` |
| SC-004 | Sensitive data (passwords, full API keys) must never be logged. | DEC-019 (Pino redaction) |
| SC-005 | Phone numbers in logs must be partially masked (e.g. `+2010****5678`). | `docs/08-security/Security-Specification.md` |
| SC-006 | JWT access tokens expire in 15 minutes. Refresh tokens in 7 days. | DEC-006 |
| SC-007 | User input must be sanitized/validated before database writes. `passwordHash` never returned by any API endpoint. | DEC-018 (Zod) |
| SC-008 | Guest session identifiers (`X-Session-ID`) must be validated as UUID v4 format before use. | `docs/08-security/Security-Specification.md` |

---

## 5. Integration Constraints

| ID | Constraint | Source |
|----|-----------|--------|
| IC-001 | Odoo scope: create `res.partner` + `sale.order` only. No accounting, invoicing, POS, full inventory sync. | `docs/06-integrations/Odoo-Integration-Specification.md` |
| IC-002 | Odoo push: never create a duplicate `sale.order` for the same website order (idempotency via `odooOrderId` check). | `docs/06-integrations/Odoo-Integration-Specification.md` |
| IC-003 | Odoo retry: max 4 retries with exponential backoff. After 4 failures: `odooSyncStatus = 'failed'`, log entry, admin alert. | `docs/06-integrations/Odoo-Integration-Specification.md` |
| IC-004 | SMS scope: order confirmation only at MVP. No OTP, no status SMS, no marketing. | `docs/06-integrations/SMS-Integration-Specification.md` |
| IC-005 | SMS provider must support Arabic Unicode (UCS-2) and custom sender ID. | `docs/06-integrations/SMS-Integration-Specification.md` |
| IC-006 | Phone numbers normalized to E.164 before SMS send (`01xxxxxxxxx` → `+20xxxxxxxxx`). | `docs/06-integrations/SMS-Integration-Specification.md` |
| IC-007 | SMS service implemented behind `SmsAdapter` interface — provider swappable without changing `OrderService`. | DEC-022 |
| IC-008 | Odoo service implemented behind `OdooAdapter` interface — protocol swappable without changing `OrderService`. | DEC-021 |

---

## 6. UX / Frontend Constraints

| ID | Constraint | Source |
|----|-----------|--------|
| UX-001 | SPA router uses `go()` function showing/hiding `#page-*` divs. No URL hash changes. | `js/main.js` |
| UX-002 | Free shipping messaging must reflect EGP 3,000 threshold. | `docs/02-requirements/FRS.md` |
| UX-003 | Order number in track page and confirmation must use `RWQ-` format. | DEC-008 |
| UX-004 | Mobile-responsive design must be preserved. | `css/styles.css` |
| UX-005 | `showToast()` is the approved pattern for transient feedback. | `js/main.js` |
| UX-006 | Dead UI controls must be wired or hidden before launch. | ISSUE-004, ISSUE-005, ISSUE-006 |
| UX-007 | RTL layout required for Arabic. LTR for English. Changing `dir` attribute alone is insufficient — see `docs/03-architecture/Localization-Architecture.md` for full RTL requirements. | DEC-015 |

---

## 7. Deployment Constraints

| ID | Constraint | Source |
|----|-----------|--------|
| DC-001 | Hosting provider not yet selected (DEC-014). Do not purchase or configure without client approval. | DEC-014 |
| DC-002 | HTTPS required in production. SSL/TLS before launch. | `docs/10-deployment/Deployment-Operations.md` |
| DC-003 | Environment variables injected via server env or secrets manager. Never committed. | `docs/10-deployment/Environment-Configuration.md` |
| DC-004 | Staging environment before production deployment. | `docs/10-deployment/Deployment-Operations.md` |
| DC-005 | MongoDB hosting (Atlas vs self-hosted) is an open decision (DEC-025). Do not provision without decision. | DEC-025 |

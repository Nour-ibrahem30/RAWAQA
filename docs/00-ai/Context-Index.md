# Context-Index — RAWAQA

**Task-to-documentation navigation map. Last updated:** 2026-09-02 (v2.0)
**Use this before reading any docs. Find your task below, then read only the listed files.**

---

## TASK: Understand the project for the first time

```
1. docs/00-ai/AI-Context.md
2. docs/00-ai/Current-State.md
3. docs/00-ai/Architecture-Summary.md
4. docs/00-ai/Decision-Log.md
5. docs/01-product/Product-Overview.md
```

---

## TASK: Scaffold the backend (Node.js + TypeScript + Express)

```
1. docs/00-ai/Decision-Log.md          ← DEC-002 (stack confirmed), DEC-003-MONGODB
2. docs/03-architecture/System-Architecture.md  ← Directory structure, layer responsibilities
3. docs/04-api/API-Design.md           ← All endpoints to implement
4. docs/05-database/ERD.md            ← MongoDB collections to model
5. docs/10-deployment/Environment-Configuration.md ← MONGODB_URI, REDIS_URL, JWT_SECRET
6. docs/08-security/Security-Specification.md  ← Security requirements
```

---

## TASK: Implement any backend API endpoint

```
1. docs/00-ai/Current-State.md         ← Check what already exists
2. docs/04-api/API-Design.md           ← Endpoint contract
3. docs/04-api/openapi.yaml            ← Machine-readable spec
4. docs/02-requirements/FRS.md         ← Functional requirements
5. docs/05-database/ERD.md            ← MongoDB schema
6. docs/08-security/Security-Specification.md  ← Auth, Zod, NoSQL injection
7. docs/03-architecture/System-Architecture.md  ← Architecture context
```

---

## TASK: Implement or fix authentication (login, register, JWT)

```
1. docs/08-security/Security-Specification.md  ← bcrypt, JWT 15m/7d, NoSQL injection
2. docs/03-architecture/Auth-Security.md        ← Auth flow design
3. docs/04-api/API-Design.md                    ← /api/auth/* endpoints
4. docs/05-database/ERD.md                     ← users collection + refreshTokenHash
5. docs/02-requirements/FRS.md                 ← FR-020, FR-021
6. docs/00-ai/Constraints.md                   ← TC-005, TC-006, SC-001–SC-008
```

---

## TASK: Implement guest checkout or cart (X-Session-ID)

```
1. docs/00-ai/Decision-Log.md          ← DEC-013 (guest checkout enabled)
2. docs/04-api/API-Design.md           ← Guest Session Pattern section + /api/cart
3. docs/05-database/ERD.md            ← carts collection (userId nullable, sessionId, TTL)
4. docs/02-requirements/FRS.md         ← FR-007, FR-008, FR-009
5. docs/00-ai/Constraints.md          ← TC-017, SC-008
```

---

## TASK: Implement checkout and order creation

```
1. docs/02-requirements/FRS.md                      ← FR-009, FR-010
2. docs/04-api/API-Design.md                        ← POST /api/orders
3. docs/05-database/ERD.md                         ← orders, embedded snapshots
4. docs/05-database/Data-Dictionary.md              ← orderNumber, status enums
5. docs/06-integrations/Odoo-Integration-Specification.md ← async sync
6. docs/06-integrations/SMS-Integration-Specification.md  ← async SMS
7. docs/08-security/Security-Specification.md       ← Zod validation
8. docs/00-ai/Constraints.md                        ← BC-001 (COD), TC-018 (numeric prices)
9. docs/00-ai/Architecture-Summary.md               ← Order creation flow diagram
```

---

## TASK: Set up MongoDB and Mongoose models

```
1. docs/05-database/ERD.md              ← Collections, embedded vs referenced decisions
2. docs/05-database/Data-Dictionary.md  ← Field types, indexes, enums
3. docs/00-ai/Decision-Log.md           ← DEC-003-MONGODB (MongoDB confirmed)
4. docs/10-deployment/Environment-Configuration.md ← MONGODB_URI
5. docs/08-security/Security-Specification.md      ← NoSQL injection prevention
```

---

## TASK: Implement bilingual content (Arabic + English)

```
1. docs/03-architecture/Localization-Architecture.md ← COMPLETE SPEC — read entirely
2. docs/05-database/ERD.md             ← LocalizedString { ar, en } pattern
3. docs/04-api/API-Design.md           ← Language Negotiation section
4. docs/00-ai/Decision-Log.md          ← DEC-015, DEC-023, DEC-024
5. docs/06-integrations/SMS-Integration-Specification.md ← Bilingual SMS templates
```

---

## TASK: Implement RTL/LTR layout

```
1. docs/03-architecture/Localization-Architecture.md ← RTL/LTR section (Section 6)
2. index.html                           ← Current dir/lang toggle
3. css/styles.css                       ← Design system (must not break)
4. js/main.js                           ← toggleLang() current implementation
5. docs/00-ai/Constraints.md           ← UX-007
```

---

## TASK: Implement product listing, filtering, search

```
1. docs/02-requirements/FRS.md          ← FR-004, FR-005, FR-006
2. docs/04-api/API-Design.md            ← GET /api/products + query params
3. docs/05-database/ERD.md             ← products collection + text index
4. docs/03-architecture/Localization-Architecture.md ← Localized product fields
5. js/main.js                           ← Current PRODUCTS[] (to be replaced)
```

---

## TASK: Implement admin dashboard

```
1. docs/04-api/Admin-Dashboard-Specification.md
2. docs/02-requirements/FRS.md
3. docs/04-api/API-Design.md            ← /api/admin/* endpoints
4. docs/05-database/ERD.md
5. docs/08-security/Security-Specification.md  ← role:admin enforcement
6. docs/04-ux-and-flows/Admin-Flows.md
7. docs/03-architecture/Localization-Architecture.md ← Admin must support ar+en content entry
```

---

## TASK: Implement Odoo integration

```
1. docs/06-integrations/Odoo-Integration-Specification.md ← COMPLETE SPEC
2. docs/04-api/API-Design.md            ← Order data structure
3. docs/05-database/ERD.md             ← orders.odooOrderId, odooSyncStatus, integrationLogs
4. docs/08-security/Security-Specification.md  ← Credential handling
5. docs/10-deployment/Environment-Configuration.md ← ODOO_* vars
6. docs/00-ai/Constraints.md           ← IC-001, IC-002, IC-003, IC-008
7. docs/00-ai/Known-Issues.md          ← ISSUE-012 (credentials needed)
8. docs/00-ai/Decision-Log.md          ← DEC-021 (adapter + XML-RPC)
```

---

## TASK: Implement SMS integration

```
1. docs/06-integrations/SMS-Integration-Specification.md ← COMPLETE SPEC
2. docs/05-database/ERD.md             ← orders.smsStatus, integrationLogs
3. docs/03-architecture/Localization-Architecture.md ← Bilingual SMS templates
4. docs/10-deployment/Environment-Configuration.md ← SMS_* vars
5. docs/00-ai/Constraints.md           ← IC-004–IC-007
6. docs/00-ai/Known-Issues.md          ← ISSUE-011 (provider needed)
7. docs/00-ai/Decision-Log.md          ← DEC-022 (ConsoleSmsAdapter for dev)
```

---

## TASK: Set up BullMQ + Redis job queue

```
1. docs/00-ai/Decision-Log.md          ← DEC-017 (BullMQ + Redis)
2. docs/03-architecture/System-Architecture.md ← Async job architecture
3. docs/10-deployment/Environment-Configuration.md ← REDIS_URL
4. docs/06-integrations/Odoo-Integration-Specification.md ← Retry policy
5. docs/06-integrations/SMS-Integration-Specification.md  ← Retry policy
```

---

## TASK: Write tests (unit or integration)

```
1. docs/09-testing/Testing-Strategy.md ← COMPLETE SPEC (v2.0 — Jest+Supertest)
2. docs/02-requirements/Acceptance-Criteria.md
3. docs/05-database/ERD.md             ← Schema to test Mongoose models against
4. docs/08-security/Security-Specification.md ← NoSQL injection test cases
5. docs/03-architecture/Localization-Architecture.md ← Localization test cases
```

---

## TASK: Fix a frontend bug

```
1. docs/00-ai/Current-State.md
2. docs/00-ai/Known-Issues.md
3. index.html
4. css/styles.css
5. js/main.js
6. docs/04-ux-and-flows/UX-Flows.md
```

---

## TASK: Connect frontend to backend API

```
1. docs/00-ai/Current-State.md
2. docs/04-api/API-Design.md           ← Endpoint contracts + language negotiation
3. docs/03-architecture/Localization-Architecture.md ← Accept-Language header
4. js/main.js                          ← Current static implementations
5. docs/00-ai/AI-Rules.md             ← FE-05, FE-06, FE-07
6. docs/10-deployment/Environment-Configuration.md ← API_BASE_URL
```

---

## TASK: Configure deployment / environment

```
1. docs/10-deployment/Environment-Configuration.md ← All vars (MONGODB_URI, REDIS_URL etc.)
2. docs/10-deployment/Deployment-Operations.md
3. docs/03-architecture/Deployment-Checklist.md
4. .env.example
5. docs/00-ai/Decision-Log.md          ← DEC-014 (hosting OPEN), DEC-025 (MongoDB hosting OPEN)
```

---

## TASK: Make an architectural decision

```
1. docs/00-ai/Decision-Log.md          ← Check if already decided
2. docs/00-ai/Known-Issues.md
3. docs/03-architecture/System-Architecture.md
4. docs/00-ai/Change-Protocol.md
→ After decision: update Decision-Log.md
```

---

## Domain Reference Map

| Domain | Primary Docs |
|--------|-------------|
| Products | FRS, API-Design, ERD, Localization-Architecture |
| Cart (guest + auth) | FRS, API-Design (Guest Session section), ERD, DEC-013 |
| Orders | FRS, API-Design, ERD, Data-Dictionary, Odoo-Spec, SMS-Spec |
| Auth (JWT + guest session) | Security-Spec, Auth-Security, API-Design, ERD (users) |
| Admin | Admin-Dashboard-Spec, API-Design, ERD, Security-Spec |
| Localization (i18n) | Localization-Architecture, ERD, API-Design, DEC-015/023/024 |
| Odoo | Odoo-Spec, API-Design, ERD, Env-Config, DEC-021 |
| SMS | SMS-Spec, ERD, Localization-Architecture, Env-Config, DEC-022 |
| Async jobs | DEC-017, System-Architecture, Env-Config (REDIS_URL) |
| Security | Security-Spec (v2.0), Auth-Security, Threat-Model |
| Deployment | Deployment-Operations, Env-Config, DEC-014, DEC-025 |
| Testing | Testing-Strategy (v2.0), Acceptance-Criteria, DEC-020 |

---

## Files Rarely Needed for Implementation

- `docs/05-project-plan/` — historical planning
- `docs/06-engineering/` — team process guides
- `docs/01-product/Risks-Assumptions.md` — risk register
- `CHANGELOG.md` — history log
- `ai/` directory (root) — original runbooks, superseded by `docs/00-ai/`

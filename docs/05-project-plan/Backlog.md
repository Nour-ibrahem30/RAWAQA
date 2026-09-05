# Implementation Backlog — RAWAQA

## Phase 1 — Foundation

| ID | Area | Task | Deps | Acceptance | Status |
|----|------|------|------|------------|--------|
| B-001 | Backend | Scaffold API project + Docker | — | Health endpoint runs | Pending |
| B-002 | DB | M001–M005 migrations | B-001 | Schema matches ERD | Pending |
| B-003 | DB | Seed 8 products from main.js | B-002 | GET /products returns 8 | Pending |
| B-004 | DevOps | .env.example + CI skeleton | B-001 | Documented vars | Pending |
| B-005 | Docs | Confirm stack with client | — | Decision recorded | Pending |

## Phase 2 — Frontend Integration

| ID | Area | Task | Deps | Acceptance | Status |
|----|------|------|------|------------|--------|
| B-010 | FE | API client module | B-003 | Fetch products works | Pending |
| B-011 | FE | Dynamic shop grid | B-010 | Shop from API | Partial |
| B-012 | FE | Dynamic cart page | B-020 | Cart matches API | Pending |
| B-013 | FE | Checkout page UI | B-012 | Form + validation UI | Pending |
| B-014 | FE | Confirmation page | B-030 | Shows RWQ- number | Pending |
| B-015 | FE | Auth pages | B-040 | Login/register UI | Pending |
| B-016 | FE | Wire or hide dead filters | B-010 | No misleading UI | Pending |

## Phase 3 — Backend Core

| ID | Area | Task | Deps | Acceptance | Status |
|----|------|------|------|------------|--------|
| B-020 | API | Cart endpoints | B-002 | CRUD cart items | Pending |
| B-030 | API | Order creation | B-020 | POST /orders works | Pending |
| B-040 | API | Auth register/login | B-002 | JWT issued | Pending |
| B-041 | API | GET orders (customer) | B-030 | History works | Pending |
| B-042 | API | Track order public | B-030 | Timeline from DB | Pending |

## Phase 4 — Admin

| ID | Area | Task | Deps | Acceptance | Status |
|----|------|------|------|------------|--------|
| B-050 | Admin | Dashboard UI | B-040 | KPIs display | Pending |
| B-051 | Admin | Product CRUD | B-003 | Create/edit/delete | Pending |
| B-052 | Admin | Order management | B-030 | List + status update | Pending |
| B-053 | Admin | Image upload | B-051 | Images on PDP | Pending |

## Phase 5 — Odoo (7,000 EGP)

| ID | Area | Task | Deps | Acceptance | Status |
|----|------|------|------|------------|--------|
| B-060 | Odoo | Adapter + auth | Client creds | Connect staging | Pending |
| B-061 | Odoo | Partner + order push | B-030 | Sale order created | Pending |
| B-062 | Odoo | Retry + idempotency | B-061 | No duplicates | Pending |

## Phase 6 — SMS (3,000 EGP)

| ID | Area | Task | Deps | Acceptance | Status |
|----|------|------|------|------------|--------|
| B-070 | SMS | Provider adapter | Client account | Send test | Pending |
| B-071 | SMS | Confirmation template | B-030 | SMS on order | Pending |
| B-072 | SMS | Duplicate prevention | B-071 | One SMS per order | Pending |

## Phase 7–8 — QA & Deploy (3,000 EGP)

| ID | Area | Task | Deps | Acceptance | Status |
|----|------|------|------|------------|--------|
| B-080 | QA | Execute test plan | All | P0/P1 clear | Pending |
| B-081 | QA | Client UAT | B-080 | Sign-off | Pending |
| B-082 | Ops | Production deploy | B-081 | HTTPS live | Pending |
| B-083 | Ops | Smoke tests | B-082 | E2E pass | Pending |

## Already Done (Prototype)

| ID | Task | Status |
|----|------|--------|
| P-001 | SPA shell + routing | Done |
| P-002 | Design system CSS | Done |
| P-003 | Static 8-product catalog | Done |
| P-004 | PDP variants UI | Partial |
| P-005 | Cart badge increment | Partial |
| P-006 | Track order mock UI | Partial |

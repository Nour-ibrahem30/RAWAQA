# Project Plan — RAWAQA

**Version:** 1.0 | **Duration:** 4–6 weeks | **Budget:** 35,000 EGP

---

## Project Overview

Deliver production-ready custom e-commerce: connected frontend, backend API, admin, Odoo + SMS integrations, tested and deployed.

**Current state:** Frontend UI prototype (~15–20% complete).

---

## Technical Direction

- Retain existing RAWAQA design (`css/styles.css`)  
- REST API + PostgreSQL backend  
- JWT authentication  
- Async Odoo/SMS after order confirmation  

---

## Goals

1. Launch on client production domain with SSL  
2. End-to-end order: website → DB → Odoo → SMS  
3. Admin self-service for products and orders  
4. Documentation and handover complete  

---

## Phase Scope

| Phase | Week | Focus |
|-------|------|-------|
| 1 | 1 | Planning, schema, API contract |
| 2 | 2 | Frontend API integration |
| 3 | 2–3 | Backend + auth |
| 4 | 3 | Admin dashboard |
| 5 | 4 | Odoo (7,000 EGP) |
| 6 | 4–5 | SMS (3,000 EGP) |
| 7 | 5 | QA + UAT |
| 8 | 5–6 | Production deploy (3,000 EGP) |

Detail: [../11-project-management/Implementation-Timeline.md](../11-project-management/Implementation-Timeline.md)

---

## Assumptions

- Client provides Odoo/SMS credentials by agreed dates  
- COD payment at launch  
- 8 seed products from prototype  

---

## Milestones

| # | Milestone | Payment |
|---|-----------|---------|
| M0 | Kickoff | 40% (14,000 EGP) |
| M1 | Backend + admin on staging | 30% (10,500 EGP) |
| M2 | Production + UAT sign-off | 30% (10,500 EGP) |

See [Milestones.md](Milestones.md).

---

## Dependencies

- Odoo access (Week 1)  
- SMS account (Week 4)  
- Hosting/DNS (Week 5)  
- Product images (before prod)  

---

## Risks

See [Delivery-Risks.md](Delivery-Risks.md) and [../01-product/Risks-Assumptions.md](../01-product/Risks-Assumptions.md).

---

## Acceptance Criteria

See [../02-requirements/Acceptance-Criteria.md](../02-requirements/Acceptance-Criteria.md).

---

## Deliverables

- Production website + admin  
- API + OpenAPI docs  
- Database with migrations  
- Odoo + SMS integration  
- Deployment runbook  
- This documentation pack  
- UAT sign-off record  

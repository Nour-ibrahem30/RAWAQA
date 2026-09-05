# Product Requirements Document (PRD) — RAWAQA

**Version:** 1.0 | **Status:** Approved for implementation | **Date:** 2026-09-02

---

## Product Overview

RAWAQA is a custom e-commerce website for premium bean bags and relaxed seating in Egypt. The platform enables customers to browse, configure, and purchase products online while operations sync orders to Odoo ERP and notify customers via SMS.

**Commercial value:** 35,000 EGP | **Duration:** 4–6 weeks | **Platform:** Web only

---

## Product Vision

Become Egypt's trusted online destination for thoughtfully designed comfort seating — premium brand experience, reliable fulfillment, integrated operations.

See [Product-Vision.md](Product-Vision.md) and [Product-Overview.md](Product-Overview.md).

---

## Product Goals

1. Launch production e-commerce within 4–6 weeks  
2. Enable end-to-end online ordering (catalog → checkout → confirmation)  
3. Automate order handoff to Odoo  
4. Send transactional SMS on order confirmation  
5. Provide admin tools for catalog and order management  

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Checkout completion | > 60% of started carts |
| Odoo sync success | > 99% |
| SMS delivery | > 98% |
| Mobile LCP | < 2.5s |
| P0 bugs at launch | 0 |

See [Success-Metrics.md](Success-Metrics.md).

---

## Target Users

- Retail customers (Egypt, EGP)  
- Guest shoppers  
- Registered customers  
- Store admin / operations  

See [Personas.md](Personas.md).

---

## Problem Statement

RAWAQA needs a professional online sales channel that matches its premium brand, replaces manual order entry, and integrates with existing Odoo operations — not a generic template store.

---

## Product Principles

1. Clarity over clutter in purchase flow  
2. Mobile-first for Egyptian market  
3. Trust at checkout (totals, delivery, confirmation)  
4. Never lose an order (Odoo/SMS failures are async/retried)  
5. Admin self-service for catalog changes  

---

## Scope

### In Scope
- Customer storefront (home, shop, product, cart, checkout, track, account)  
- Backend API + PostgreSQL  
- Admin dashboard  
- Odoo order/customer sync (agreed boundary)  
- SMS order confirmation  
- Testing, staging, production deployment  

### Out of Scope
See [../11-project-management/Out-of-Scope.md](../11-project-management/Out-of-Scope.md)

---

## Technical Context

| Layer | Current | Target |
|-------|---------|--------|
| Frontend | HTML/CSS/JS SPA prototype | API-connected SPA |
| Backend | None | REST API |
| Database | None | PostgreSQL |
| Integrations | None | Odoo + SMS |

**Evidence:** `index.html`, `js/main.js` — 8 static products, partial cart, checkout placeholder.

---

## Functional Requirements Summary

| Area | Status |
|------|--------|
| Home, Shop, Product UI | Partial |
| Cart / Checkout | Partial / Not Implemented |
| Auth / Account | Not Yet Implemented |
| Admin | Not Yet Implemented |
| Odoo / SMS | Integration Required |

Full detail: [../02-requirements/FRS.md](../02-requirements/FRS.md)

---

## Core User Journeys

1. Browse → Purchase → Confirm → SMS → Odoo  
2. Track order by RWQ- number  
3. Admin: manage products and orders  

See [User-Journeys.md](User-Journeys.md).

---

## Non-Functional Expectations

Performance, security, HTTPS, responsive design, logging, backups. See [../02-requirements/NFR.md](../02-requirements/NFR.md).

---

## Design / Brand Requirements

- Existing design system in `css/styles.css` (charcoal, ivory, gold palette)  
- Typography: Fraunces + Manrope + Noto Sans Arabic  
- Tagline: *Crafted Comfort. Designed for Life.*  
- RTL-capable layout (full Arabic content phased)  

---

## Constraints & Assumptions

- Budget fixed at 35,000 EGP  
- Client provides Odoo access, SMS account, hosting  
- COD primary payment unless client adds gateway via CR  

See [Risks-Assumptions.md](Risks-Assumptions.md).

---

## Risks

| Risk | Mitigation |
|------|------------|
| Frontend appears complete but backend missing | Gap analysis shared with client |
| Odoo credential delay | Request Week 1 |
| Scope creep | Change Request process |

---

## Acceptance Criteria (Launch)

- [ ] Customer completes purchase on production  
- [ ] Order in Odoo within 60s (staging verified)  
- [ ] SMS received on confirmation  
- [ ] Admin CRUD products and update orders  
- [ ] Client UAT sign-off  

---

## Priorities

**P0:** Backend, cart, checkout, orders, admin, Odoo, SMS, deploy  
**P1:** Auth, order history, track order API, filters/search  
**P2:** Full i18n, status SMS, SEO  

---

## Future Enhancements

Payment gateway, inventory sync, reviews, coupons, WhatsApp, analytics.

See [Roadmap.md](Roadmap.md).

---

## Open Notes

- Backend stack TBD (client decision)  
- Guest checkout TBD  
- Canonical docs map: [../README.md](../README.md)

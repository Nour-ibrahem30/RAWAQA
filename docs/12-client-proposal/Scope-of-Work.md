# Scope of Work — RAWAQA E-Commerce Platform

**Prepared for:** RAWAQA  
**Project type:** Custom E-Commerce Website  
**Total investment:** **35,000 EGP**  
**Estimated duration:** **4–6 weeks**

---

## Executive Summary

This Scope of Work defines the delivery of a **complete custom software solution** for RAWAQA — not merely a visual website design. The engagement covers a production-ready e-commerce platform: customer-facing storefront, backend API and database, administrative dashboard, Odoo ERP integration, SMS order notifications, and full testing and deployment.

The current repository contains a **frontend prototype** demonstrating brand, UX, and core page layouts. This proposal covers completion of the remaining platform components to launch-ready standard.

---

## Commercial Breakdown

| Component | Cost (EGP) | What You Receive |
|-----------|-------------:|------------------|
| **Frontend Development** | 12,000 | Connected customer website: catalog, product pages, cart, checkout, account, track order — integrated with live data |
| **Backend Development** | 10,000 | REST API, database, authentication, order processing, business rules, admin APIs |
| **Odoo Integration** | 7,000 | Automated order and customer sync from website to your Odoo system |
| **SMS Integration** | 3,000 | Transactional SMS when orders are confirmed |
| **Testing, Deployment & Integration** | 3,000 | QA, staging, production deployment, end-to-end verification |
| **TOTAL** | **35,000 EGP** | Complete custom e-commerce platform |

---

## Component Details

### Frontend Development — 12,000 EGP

A polished, responsive customer experience built on the existing RAWAQA design foundation:

- Homepage with hero, categories, featured products, and brand storytelling  
- Product catalog with search and filters  
- Product detail pages with variants (colour, size) and quantity selection  
- Shopping cart with live totals  
- Checkout with customer and delivery information  
- Order confirmation experience  
- Order tracking  
- Customer registration, login, and order history  
- Mobile-optimized navigation and layouts  
- Arabic/English language framework (RTL support)  

### Backend Development — 10,000 EGP

The operational core of your online store:

- Secure REST API architecture  
- Relational database for products, orders, customers, and carts  
- User authentication and authorization  
- Order creation, validation, and lifecycle management  
- Admin APIs for product and order management  
- Input validation, error handling, and logging  
- Environment-based configuration for staging and production  

### Odoo Integration — 7,000 EGP

Seamless handoff from website orders to your ERP:

- Push confirmed orders to Odoo as sale orders  
- Create or match customer records in Odoo  
- Map order line items with quantities and prices  
- Secure API authentication  
- Error handling, retry logic, and sync status tracking  
- Integration logging for operational visibility  

**Odoo scope includes:** Customer data, order data, and agreed order mapping.  
**Odoo scope excludes:** Accounting, invoicing, POS, full inventory sync, payment sync, and advanced ERP modules — available via Change Request if needed.

### SMS Integration — 3,000 EGP

Professional post-purchase communication:

- Order confirmation SMS to customer mobile  
- Provider API integration with secure credentials  
- Egyptian phone number validation  
- Message templates (Arabic/English)  
- Delivery logging and retry on failure  
- Duplicate notification prevention  

**Note:** Development cost covers integration work. SMS credits, provider subscription, and sender ID registration are **client-paid operational costs**.

### Testing, Deployment & Integration — 3,000 EGP

Confidence at launch:

- Test plans covering customer, admin, and integration flows  
- Staging environment verification  
- Production deployment support  
- End-to-end test: browse → purchase → Odoo → SMS  
- Handover documentation and UAT support  

---

## Timeline Overview

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| 1. Planning & Architecture | Week 1 | Finalized architecture, API contract, DB schema |
| 2. Frontend Development | Week 2 | Connected storefront |
| 3. Backend Development | Week 2–3 | API, database, auth |
| 4. Admin Dashboard | Week 3 | Product and order management |
| 5. Odoo Integration | Week 4 | Order sync live on staging |
| 6. SMS Integration | Week 4–5 | Confirmation SMS live on staging |
| 7. Testing | Week 5 | QA sign-off |
| 8. Production Deployment | Week 5–6 | Go-live |

See [Implementation-Timeline.md](../11-project-management/Implementation-Timeline.md) for dependencies.

---

## Payment Plan

| Milestone | % | Amount (EGP) | Trigger |
|-----------|---|-------------:|---------|
| Project start | 40% | 14,000 | Signed agreement + kickoff |
| Major milestone | 30% | 10,500 | Backend + admin complete on staging |
| Final delivery | 30% | 10,500 | Production go-live + client UAT sign-off |
| **Total** | 100% | **35,000 EGP** | |

---

## Client Responsibilities

To keep the project on schedule, the client will provide:

- Odoo instance access (URL, credentials, test environment)  
- SMS provider selection, account, and sender ID registration  
- Hosting and domain (or approval of recommended provider)  
- Product images, descriptions, and pricing  
- Timely feedback on staging reviews (within 3 business days)  
- UAT sign-off within agreed window  

---

## Out of Scope

Additional features require a formal Change Request. Out of scope items include:

- New pages or major redesign beyond agreed sitemap  
- Additional payment gateways (unless added via CR)  
- Full ERP / inventory synchronization  
- Accounting, invoicing, POS modules  
- WhatsApp or marketing automation  
- Content creation, photography, copywriting, data entry  
- Hosting fees, domain fees, SMS usage fees  
- Ongoing maintenance after handover period (separate agreement)  

See [Out-of-Scope.md](../11-project-management/Out-of-Scope.md).

---

## Acceptance

Upon completion, the platform will be accepted when:

1. Customer can complete a purchase end-to-end on production  
2. Order appears in Odoo within agreed timeframe  
3. Customer receives order confirmation SMS  
4. Admin can manage products and orders  
5. Client completes UAT checklist and provides written sign-off  

---

## Next Steps

1. Review and approve this Scope of Work  
2. Confirm open decisions (backend stack, Odoo version, SMS provider, payment method)  
3. Issue first payment (40% — 14,000 EGP) to commence Phase 1  
4. Schedule kickoff meeting  

---

*This document represents a complete custom software delivery at 35,000 EGP — engineered for RAWAQA's operational needs, not a template website.*

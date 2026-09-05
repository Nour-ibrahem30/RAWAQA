# Product Overview — RAWAQA

## Product Summary

**RAWAQA** is a custom e-commerce website for selling premium bean bags and relaxed seating in Egypt. The brand positioning is *"Crafted Comfort. Designed for Life."* — emphasizing quality materials, everyday durability, and locally crafted comfort.

The commercial project delivers a **full-stack custom website** (not a mobile app) valued at **35,000 EGP**, including frontend, backend, Odoo ERP integration, SMS notifications, and production deployment.

---

## Product Vision

To become Egypt's trusted online destination for thoughtfully designed bean bag seating — where customers discover, configure, and purchase comfort products with confidence, while the business operates efficiently through integrated order and inventory workflows.

---

## Business Goals

| Goal | Description | Success Indicator |
|------|-------------|-------------------|
| **Sell online** | Enable customers to browse and purchase bean bags 24/7 | Completed orders via website |
| **Brand presence** | Present a premium, modern brand experience | Engagement, return visits |
| **Operational efficiency** | Sync orders to Odoo for fulfillment | Successful Odoo order records |
| **Customer communication** | Confirm orders via SMS | SMS delivery rate > 98% |
| **Manage catalog** | Admin controls products without code changes | Admin CRUD operational |
| **Scale locally** | Serve Egyptian market (EGP, Cairo/Alexandria delivery) | Delivery completion rate |

---

## Project Scope (Commercial)

### In Scope — 35,000 EGP

| Component | Value (EGP) | Deliverable |
|-----------|------------:|-------------|
| Frontend Development | 12,000 | Customer-facing website (all core pages) |
| Backend Development | 10,000 | API, database, auth, business logic |
| Odoo Integration | 7,000 | Customer, product, order sync (agreed scope) |
| SMS Integration | 3,000 | Transactional order SMS |
| Testing, Deployment & Integration | 3,000 | QA, staging, production go-live |

### Current vs Target

| Area | Today | Target |
|------|-------|--------|
| Customer website | UI prototype (~15–20%) | Production-ready connected SPA |
| Backend | None | Full REST API + database |
| Admin | None | Dashboard for products & orders |
| Integrations | None | Odoo + SMS |

---

## Target Users

| User Type | Description |
|-----------|-------------|
| **Retail customer** | Egyptian consumers purchasing bean bags for home, gaming, kids, outdoor |
| **Guest shopper** | Browse and checkout without account (if supported) |
| **Registered customer** | Account with order history |
| **Store admin** | Manages products, orders, and operational data |
| **Operations staff** | Fulfills orders (via Odoo, outside website) |

---

## Core User Flows

### Browse & Purchase (Primary)
Home → Shop → Product Detail → Cart → Checkout → Confirmation → SMS

### Track Order (Secondary)
Track Order page → Enter order number → View status timeline

### Admin Operations
Login → Dashboard → Manage Products / Orders → Update status

---

## Feature Inventory

| Feature | Status | Location / Notes |
|---------|--------|------------------|
| SPA routing | Implemented | `js/main.js` `go()` |
| Product catalog (8 items) | Implemented (static) | `PRODUCTS` array |
| Product detail page | Implemented (static) | `#page-product` |
| Colour/size/quantity selectors | Partial (PDP only) | Client-side only |
| Add to cart (badge) | Partial | Increments count only |
| Cart page UI | Partial | Static HTML lines |
| Checkout | Not Yet Implemented | Toast placeholder |
| Order tracking UI | Partial | Mock demo data |
| User auth | Not Yet Implemented | — |
| Customer account | Not Yet Implemented | — |
| Admin dashboard | Not Yet Implemented | — |
| Search | Not Yet Implemented | Button only |
| Shop filters/sort | Not Yet Implemented | UI only |
| Language toggle | Partial | RTL dir only |
| Reviews section | Implemented (static) | Homepage testimonials |
| Mobile responsive | Implemented | CSS breakpoints |
| Odoo sync | Integration Required | — |
| SMS notifications | Integration Required | — |

---

## MVP Scope (Production Launch)

**Must have for go-live:**

1. Connected product catalog from database  
2. Functional cart with persistence  
3. Checkout with customer info, address, phone validation  
4. Order creation and confirmation page  
5. Customer registration/login (minimum: order lookup)  
6. Admin: product CRUD, order view, status update  
7. Odoo: push new orders with customer + line items  
8. SMS: order confirmation message  
9. HTTPS deployment on client-approved hosting  
10. Smoke-tested critical paths  

**Deferred post-MVP (Future Scope):**

- Online card payment gateway  
- Full Arabic content translation (i18n)  
- Advanced inventory sync from Odoo  
- Product reviews submission  
- Wishlist, coupons, loyalty  
- WhatsApp notifications  
- SEO optimization pass  
- Analytics dashboard  

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Checkout completion rate | > 60% of carts started | Analytics |
| Order sync success (Odoo) | > 99% | Integration logs |
| SMS delivery rate | > 98% | Provider dashboard |
| Page load (LCP) | < 2.5s on 4G | Lighthouse |
| Admin task time (add product) | < 5 minutes | Usability test |
| Zero critical bugs at launch | 0 P0 open | QA sign-off |

---

## Assumptions

1. Client provides Odoo instance URL, credentials, and API access.  
2. Client selects and funds SMS provider (credits separate from dev cost).  
3. Cash on Delivery (COD) is primary payment method at launch unless client specifies gateway.  
4. Product images and copy provided by client or approved placeholders used initially.  
5. Single admin role sufficient for MVP (no multi-role RBAC).  
6. Website is Arabic/English capable; full translation may be phased.  
7. Hosting and domain are client responsibilities.  

---

## Open Questions (Client Decisions Required)

1. **Backend stack preference** — Node.js/Express, Python/FastAPI, or PHP/Laravel?  
2. **Database preference** — PostgreSQL or MySQL?  
3. **Odoo version and modules** — Which Odoo edition (Community/Enterprise)? Existing product catalog?  
4. **SMS provider** — Which Egyptian provider (e.g., Twilio, local gateway)?  
5. **Payment** — COD only at launch, or integrate Paymob/Fawry/etc.?  
6. **Guest checkout** — Allow orders without registration?  
7. **Hosting** — Client server, VPS, or cloud (AWS/DigitalOcean)?  

See also [Risks-Assumptions.md](Risks-Assumptions.md) and [Roadmap.md](Roadmap.md).

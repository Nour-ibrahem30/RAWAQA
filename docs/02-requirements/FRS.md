# Functional Requirements Specification (FRS) — RAWAQA

**Document ID:** RAWAQA-FRS-001  
**Version:** 1.0

---

## Document Overview

This FRS documents every major system capability for the RAWAQA e-commerce platform. Status labels reflect the **current codebase** unless marked as Required/Planned for delivery.

**Status legend:** Implemented | Partial | Not Yet Implemented | Required | Integration Required

---

## 1. Home

### 1.1 Hero Section
**Status:** Implemented  
**Evidence:** `#page-home .hero` in `index.html`  
**Purpose:** Brand introduction and primary CTA  
**Acceptance:** Hero visible on load; CTAs route to Shop  

### 1.2 Navigation
**Status:** Implemented  
**Evidence:** `.nav`, `#mmenu`, `go()` router  
**Functions:** Shop, Collections, Why Rawaqa, About, Track Order, Cart  
**Gap:** No account/login links (Required)

### 1.3 Featured Products
**Status:** Partial  
**Evidence:** `featuredGrid` populated from `PRODUCTS.slice(0,3)`  
**Required:** API-driven; admin can mark featured  

### 1.4 Categories / Discover Tiles
**Status:** Partial  
**Evidence:** Relax, Game, Kids, Outdoor tiles route to shop  
**Required:** Filter shop by category on click  

### 1.5 Promotions
**Status:** Not Yet Implemented  
**Required:** Banner/discount display when configured in admin  

### 1.6 Footer
**Status:** Implemented  
**Evidence:** `footer` with Shop, Support, Rawaqa columns  
**Gap:** Shipping, Privacy, Terms pages are placeholder links  

---

## 2. Product Catalog

### 2.1 Product Listing
**Status:** Partial  
**UI:** Implemented (`#page-shop`, `#shopGrid`)  
**Data:** Static JS array — **Required:** GET `/api/products`  

### 2.2 Product Cards
**Status:** Implemented  
**Evidence:** `productCard()` function  
**Fields:** Name, description, price, colour swatches, SVG image  

### 2.3 Categories
**Status:** Partial  
**Categories in data:** Relax, Game, Kids, Outdoor (`cat` field)  
**Filter UI:** Present but not wired  

### 2.4 Search
**Status:** Not Yet Implemented  
**Evidence:** Search button has no handler in `main.js`  
**Required:** GET `/api/products?q=` + results UI  

### 2.5 Filters
**Status:** Not Yet Implemented  
**UI:** Category checkboxes, price range, colour dots, in-stock checkbox  
**Required:** Query params + backend filter support  

### 2.6 Sort
**Status:** Not Yet Implemented  
**UI:** Dropdown present (`Sort: Recommended`, price, newest)  
**Required:** Wire to API `sort` parameter  

### 2.7 Product Availability
**Status:** Partial  
**Evidence:** Static "In stock — ships in 2–4 days" on PDP  
**Required:** Stock quantity from database  

---

## 3. Product Details

### 3.1 Images
**Status:** Partial — SVG placeholders + colour swatches  
**Required:** Multi-image gallery from admin uploads  

### 3.2 Product Information
**Status:** Partial  
**Implemented:** Name, description, price via `fillProduct()`  
**Static:** Accordion content (Description, Features, Materials, etc.)  

### 3.3 Variants (Colour, Size)
**Status:** Partial — client-side selection only  
**Required:** Variant SKUs, price adjustments, stock per variant  

### 3.4 Quantity
**Status:** Implemented on PDP (`qtyPlus`, `qtyMinus`)  

### 3.5 Add to Cart
**Status:** Partial  
**Current:** Increments `#cartCount`, shows toast  
**Required:** POST `/api/cart/items` with product_id, variant, qty  

### 3.6 Buy Now
**Status:** Not Yet Implemented — button present, no handler  

### 3.7 Related Products
**Status:** Implemented — `relatedGrid` shows products 3–6  

---

## 4. Cart

### 4.1 Add Product — Partial (badge only)  
### 4.2 Remove Product — Not Yet Implemented (UI link present)  
### 4.3 Update Quantity — Not Yet Implemented on cart page  
### 4.4 Subtotal / Total — Partial (static EGP 5,100)  
### 4.5 Order Summary — Partial (UI only)  
**Required API:** GET/PATCH/DELETE `/api/cart`  

---

## 5. Checkout

**Status:** Not Yet Implemented  

### 5.1 Customer Information (Required)
- Full name (required)  
- Phone (required, Egyptian format validation)  
- Email (optional or required — client decision)  

### 5.2 Address (Required)
- Governorate, city, street address  
- Delivery notes (optional)  

### 5.3 Order Summary (Required)
- Line items, subtotal, shipping, total  

### 5.4 Order Confirmation (Required)
- Confirmation page with order number `RWQ-XXXXX`  
- Trigger Odoo sync + SMS  

### 5.5 Validation (Required)
- Client and server-side validation  
- Clear error messages  

### 5.6 Error Handling (Required)
- Network errors, stock conflicts, integration failures  

**Current placeholder:** `checkout-note` route shows toast in `main.js` line 157–159  

---

## 6. Authentication

**Status:** Not Yet Implemented — entirely Required  

| Function | Requirement |
|----------|-------------|
| Registration | Email/phone + password |
| Login | Credentials → JWT or session |
| Logout | Clear token/session |
| Auth state | Protected routes, nav state |
| Password reset | Planned post-MVP |

---

## 7. Customer Account

**Status:** Not Yet Implemented — Required  

| Function | Requirement |
|----------|-------------|
| Profile | View/edit name, phone, addresses |
| Order history | List past orders |
| Order details | Items, status, total, tracking |

---

## 8. Track Order

**Status:** Partial  

| Aspect | Current | Required |
|--------|---------|----------|
| Input form | Implemented | Validate format |
| Results | Mock `RWQ-10482` | GET `/api/orders/track/:number` |
| Timeline | Static HTML | Dynamic from order status history |

---

## 9. Admin Dashboard

**Status:** Not Yet Implemented — Required  

### 9.1 Dashboard Overview
- Orders count (today, pending, total)  
- Products count  
- Recent orders list  

### 9.2 Product Management (CRUD)
- Create, read, update, delete products  
- Images, pricing, categories, availability  

### 9.3 Order Management
- View orders, details, customer info  
- Update status: pending → confirmed → preparing → shipped → delivered  

### 9.4 Customer Management
- View customer list and order history  

### 9.5 Admin Security
- Admin-only routes  
- Role: admin (single role MVP)  

---

## 10. Global Rules

| Rule | Description |
|------|-------------|
| GR-01 | All monetary values in EGP, stored as decimal/minor units in DB |
| GR-02 | API returns JSON with consistent error format |
| GR-03 | Frontend must not contain API secrets |
| GR-04 | Orders immutable after creation (status updates only) |
| GR-05 | Idempotent Odoo push per order ID |

---

## Acceptance Criteria (MVP)

- [ ] Customer completes purchase end-to-end on staging  
- [ ] Cart persists across sessions (logged-in) or session (guest)  
- [ ] Admin adds product visible on shop within 1 minute  
- [ ] Order appears in Odoo within 60 seconds of confirmation  
- [ ] Customer receives SMS within 2 minutes of confirmation  
- [ ] Track order returns real data for valid order number  
- [ ] All Partial UI controls either work or are hidden until ready  

See [FRS-Detailed.md](FRS-Detailed.md) for per-function deep specs and [Requirements-Traceability-Matrix.md](Requirements-Traceability-Matrix.md).

<div align="center">

<img src="frontend/public/logo.png" alt="RAWAQA Logo" width="110" />

# RAWAQA — رواقة

### راحة حرفية. مصممة للحياة.

### Crafted Comfort. Designed for Life.

**A production-ready bilingual e-commerce platform for premium bean bag chairs in Egypt.**

<br />

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org)
[![Express](https://img.shields.io/badge/Express-4.18-black?logo=express)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-green?logo=mongodb)](https://www.mongodb.com)
[![Vercel](https://img.shields.io/badge/Frontend-Vercel-black?logo=vercel)](https://vercel.com)
[![License](https://img.shields.io/badge/License-Private-red)](.)

<br />

**[🌐 Live Website](https://rawaqa.vercel.app)**

</div>

---

# نظرة عامة | Overview

**RAWAQA** is a full-stack e-commerce platform built for the Egyptian market, focused on premium bean bag chairs and crafted comfort products.

The platform provides a bilingual **Arabic / English** shopping experience with RTL/LTR support, customer authentication, product and category management, cart functionality, checkout, order tracking, coupons, inventory handling, and a dedicated administrative dashboard.

The architecture is designed around a separate frontend and backend, allowing the system to scale independently and integrate with external business services such as ERP, shipping, and notification providers.

> **Current payment method:** Cash on Delivery (COD)
> **Current ERP status:** Odoo integration is architecturally prepared but not enabled in the current production flow.

---

# ✨ Core Features

### Customer Experience

* 🛍️ Product browsing and category navigation
* 🔎 Product details and availability
* 🛒 Guest and authenticated shopping cart
* 🔄 Automatic cart merge after authentication
* 🔐 Secure customer authentication
* 📦 Checkout and order creation
* 💵 Cash on Delivery
* 📍 Order tracking
* 🌐 Arabic / English localization
* ↔️ Full RTL / LTR support
* 📱 Responsive mobile-first UI
* 🖨️ Printable order / shipping documents

### Administration

* 📊 Admin dashboard
* 📦 Product management
* 🗂️ Category management
* 🧾 Order management
* 🎟️ Coupon management
* 📢 Advertisement / banner management
* 📝 Content management
* ⚙️ Site settings
* 👤 Role-protected administrative operations

### Backend & Business Logic

* Atomic inventory operations
* Inventory reservation during order creation
* Server-side price validation
* Coupon validation on the server
* Idempotent order operations
* Authentication and authorization
* Ownership checks for customer resources
* Input validation
* Rate limiting
* Security headers
* NoSQL injection protection
* Centralized error handling
* Structured logging

---

# 🏗️ Architecture

RAWAQA follows a separated frontend/backend architecture.

```text
                         ┌──────────────────────┐
                         │       Customer       │
                         │    Arabic / English  │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │    Next.js Frontend  │
                         │        Vercel        │
                         └──────────┬───────────┘
                                    │
                              HTTPS / REST
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │    Express Backend   │
                         │       Abasthan       │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │     MongoDB Atlas    │
                         │   Persistent Data    │
                         └──────────────────────┘

                    Future / Optional Integrations
                                    │
                    ┌───────────────┼────────────────┐
                    ▼               ▼                ▼
                  Odoo          Shipping            SMS
                   ERP           Provider          Provider
```

### Architecture Principles

* Frontend and backend are independently deployable.
* The backend is the source of truth for business validation.
* Client-side values are never trusted for prices, discounts, permissions, or inventory.
* Authentication is handled through secure HTTP-only cookies.
* Database operations enforce business invariants server-side.
* External integrations are isolated behind service layers.

---

# 📁 Project Structure

```text
RAWAQA/
│
├── frontend/
│   ├── public/
│   │   └── logo.png
│   │
│   ├── src/
│   │   ├── app/
│   │   │   ├── [locale]/
│   │   │   └── admin/
│   │   │
│   │   ├── components/
│   │   │   └── Reusable UI components
│   │   │
│   │   ├── context/
│   │   │   ├── Auth
│   │   │   ├── Cart
│   │   │   └── Toast
│   │   │
│   │   └── lib/
│   │       ├── API client
│   │       ├── types
│   │       └── utilities
│   │
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── workers/
│   │   └── utils/
│   │
│   ├── seed-prod.js
│   └── package.json
│
├── ai/
│   └── AI context and project documentation
│
├── docs/
│   └── Project documentation
│
└── README.md
```

---

# 🧰 Tech Stack

## Frontend

| Technology   | Purpose                       |
| ------------ | ----------------------------- |
| Next.js 14   | React framework + App Router  |
| React        | UI development                |
| TypeScript   | Type safety                   |
| Tailwind CSS | Styling                       |
| next-intl    | Arabic / English localization |
| Cairo        | Arabic typography             |
| Fraunces     | Display typography            |
| Manrope      | Interface typography          |

## Backend

| Technology | Purpose            |
| ---------- | ------------------ |
| Node.js    | Runtime            |
| Express    | REST API           |
| TypeScript | Type safety        |
| MongoDB    | Database           |
| Mongoose   | ODM                |
| JWT        | Authentication     |
| bcryptjs   | Password hashing   |
| Zod        | Input validation   |
| Winston    | Structured logging |

## Infrastructure

| Service       | Purpose          |
| ------------- | ---------------- |
| Vercel        | Frontend hosting |
| Abasthan      | Backend hosting  |
| MongoDB Atlas | Database         |
| GitHub        | Source control   |

---

# 🔐 Security

Security is treated as a backend responsibility rather than a frontend feature.

The frontend is considered **untrusted input**.

## Authentication

* Short-lived access tokens
* Refresh token rotation
* HTTP-only cookies
* Secure cookie configuration in production
* Password hashing using `bcryptjs`
* Authentication middleware on protected routes
* Invalid credential handling
* Protected administrative routes

### Token Model

```text
Customer
   │
   ├── Login
   │
   ▼
Backend
   │
   ├── Validate credentials
   ├── Verify password hash
   └── Issue tokens
          │
          ├── Short-lived access token
          └── Refresh token
                    │
                    ▼
             HTTP-only Cookie
```

Tokens are not intended to be exposed to JavaScript through `localStorage`.

---

## Authorization

Authentication alone is not sufficient.

Every protected operation performs server-side authorization checks.

Examples:

* Customer resources require authenticated ownership.
* Admin operations require administrative privileges.
* Customers cannot modify another customer's order.
* Administrative endpoints cannot be accessed by normal customer accounts.
* Resource IDs are never treated as proof of ownership.

This helps mitigate **IDOR / Broken Access Control** vulnerabilities.

---

## Input Validation

All sensitive API input is validated server-side.

Validation covers areas such as:

* Authentication payloads
* Product data
* Categories
* Orders
* Coupons
* Query parameters
* IDs
* Administrative operations

The application uses **Zod** schemas to reject malformed or unexpected input before business logic executes.

---

## NoSQL Injection Protection

MongoDB queries are protected against malicious operator injection.

The backend applies sanitization and validation so user-controlled objects cannot directly become MongoDB query operators.

Examples of potentially dangerous input such as:

```text
$gt
$ne
$where
```

must never be blindly passed into database queries.

---

## Rate Limiting

Sensitive endpoints are rate-limited to reduce abuse and brute-force attempts.

Especially important for:

* Login
* Registration
* Authentication
* Password-related operations
* Other abuse-sensitive endpoints

---

## HTTP Security Headers

The backend uses security middleware such as **Helmet** to provide appropriate HTTP security headers.

This helps reduce exposure to common browser-based attacks.

---

## CORS

Cross-Origin Resource Sharing is explicitly configured.

The API does not rely on permissive wildcard CORS in production.

Only trusted frontend origins should be allowed to communicate with the production API.

```text
Production Frontend
        │
        │ HTTPS
        ▼
   Express API
        │
        ├── Origin validation
        └── Credentials handling
```

---

## Server-Side Price Validation

Prices received from the browser are **not trusted**.

The backend retrieves authoritative product information before creating an order.

```text
Browser
   │
   │ product ID / quantity
   ▼
Backend
   │
   ├── Fetch product
   ├── Validate availability
   ├── Resolve current price
   ├── Validate coupon
   ├── Calculate totals
   └── Create order
```

This prevents a customer from manipulating the frontend and submitting an arbitrary price.

---

## Inventory Protection

Inventory operations are performed server-side.

The system is designed to avoid overselling through atomic inventory operations and reservation logic.

```text
Available Stock
      │
      ▼
Atomic Reservation
      │
      ├── Success → Continue Order
      │
      └── Failure → Reject / Out of Stock
```

The frontend is never treated as the authority for stock quantity.

---

## Idempotency

Order-related operations use idempotency protection to reduce the risk of duplicate requests creating duplicate business operations.

This is especially important for:

* Network retries
* Browser refreshes
* Double-click submissions
* Client-side request retries
* Unstable connections

---

## Error Handling

Production API responses avoid exposing internal implementation details.

The system should not return:

* Database connection strings
* Stack traces
* Internal file paths
* Secrets
* Authentication credentials
* Environment variables
* Internal infrastructure information

Errors are logged server-side while clients receive safe, structured responses.

---

# 🛡️ Security Testing

The project includes automated security and authentication testing covering scenarios such as:

* Valid admin authentication
* Valid customer authentication
* Invalid password handling
* Empty credential validation
* NoSQL injection attempts
* Unauthorized admin access
* Forbidden customer access
* Protected endpoint behavior
* Authentication status handling

Security is continuously checked as part of the release process.

---

# 🌍 Localization

RAWAQA supports two languages:

```text
Arabic
  └── RTL

English
  └── LTR
```

Localized routes follow the application's locale structure:

```text
/ar
/en
```

The UI, navigation, forms, product experience, and major customer-facing flows are designed to work in both directions.

---

# 🛒 Customer Routes

| Route                              | Description        | Access        |
| ---------------------------------- | ------------------ | ------------- |
| `/ar` / `/en`                      | Homepage           | Public        |
| `/[locale]/shop`                   | Shop               | Public        |
| `/[locale]/product/[id]`           | Product details    | Public        |
| `/[locale]/cart`                   | Shopping cart      | Public        |
| `/[locale]/checkout`               | Checkout           | Authenticated |
| `/[locale]/order-confirmation/[n]` | Order confirmation | Controlled    |
| `/[locale]/track`                  | Order tracking     | Public        |
| `/[locale]/login`                  | Login              | Public        |
| `/[locale]/register`               | Registration       | Public        |
| `/[locale]/account`                | Customer account   | Authenticated |

---

# 👨‍💼 Admin Routes

| Route               | Purpose                  |
| ------------------- | ------------------------ |
| `/admin`            | Dashboard                |
| `/admin/products`   | Product management       |
| `/admin/categories` | Category management      |
| `/admin/orders`     | Order management         |
| `/admin/coupons`    | Coupon management        |
| `/admin/ads`        | Advertisements & banners |
| `/admin/content`    | Content management       |
| `/admin/settings`   | Site settings            |

> Admin routes are protected by server-side authentication and authorization. Hiding a route in the frontend is not considered a security boundary.

---

# 🎨 Design System

RAWAQA uses a premium, warm visual identity designed around comfort and craftsmanship.

```css
--charcoal:   #15130F;
--ivory:      #F7F4EC;
--gold-light: #D2B56A;
--gold:       #AD8A4C;
--ink:        #262117;
```

### Typography

* **Cairo** — Arabic
* **Fraunces** — Display headings
* **Manrope** — Interface / body text

---

# ⚙️ Local Development

## Prerequisites

* Node.js ≥ 18
* npm ≥ 9
* MongoDB local instance or MongoDB Atlas
* Git

---

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend:

```text
http://localhost:3000
```

---

## Backend

```bash
cd backend
npm install
npm run dev
```

Backend:

```text
http://localhost:5002
```

---

# 🔑 Environment Variables

## Frontend

Create:

```text
frontend/.env.local
```

Example:

```env
NEXT_PUBLIC_API_URL=http://localhost:5002/api
```

---

## Backend

Create:

```text
backend/.env
```

Example:

```env
NODE_ENV=development
PORT=5002

MONGODB_URI=your-mongodb-connection-string

JWT_ACCESS_SECRET=your-long-random-secret
JWT_REFRESH_SECRET=your-long-random-secret

JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

### Production-only variables

Production integrations should be configured through the hosting provider's environment-variable system.

**Never commit production secrets to Git.**

Do not place real values for:

* JWT secrets
* MongoDB credentials
* API keys
* SMS credentials
* Admin passwords
* OAuth secrets
* Third-party credentials

inside the repository.

---

# 🌱 Database Seeding

For development environments:

```bash
cd backend
node seed-prod.js
```

The seed process may create initial:

* Admin account
* Categories
* Products

Production seeding should only be performed intentionally and with the correct environment configuration.

---

# 🚀 Deployment

## Frontend — Vercel

The frontend is deployed as a standalone Next.js application.

Project root:

```text
frontend/
```

Required production variable:

```env
NEXT_PUBLIC_API_URL=https://your-production-backend/api
```

---

## Backend — Abasthan

The backend is deployed independently from the frontend.

Build:

```bash
npm run build
```

Start:

```bash
npm start
```

Expected production entry:

```text
node dist/server.js
```

Required production environment variables should be configured directly in the hosting provider.

---

# 🔄 Order Flow

The current order flow is intentionally simple and reliable:

```text
Customer
   │
   ▼
Browse Products
   │
   ▼
Add to Cart
   │
   ▼
Login / Authentication
   │
   ▼
Checkout
   │
   ▼
Server Validation
   │
   ├── Product validation
   ├── Price validation
   ├── Coupon validation
   ├── Inventory validation
   └── Idempotency protection
   │
   ▼
Order Created
   │
   ▼
Admin Dashboard
   │
   ▼
Shipping Workflow
   │
   ▼
Customer receives order
```

The customer does **not** create orders through the admin/chat interface.

Orders are created through the normal customer checkout flow and then become available to the administration workflow.

---

# 📦 External Integrations

The architecture is designed to support external business integrations without coupling the core shopping experience to them.

### Current

* MongoDB Atlas
* Vercel
* Abasthan
* Cash on Delivery

### Prepared / Planned

* Odoo ERP
* Shipping provider integration
* SMS notifications
* Additional business automation

These integrations should be enabled only after their production credentials, failure handling, and operational workflows are properly configured.

---

# 🧪 Quality Assurance

RAWAQA uses a release-gate approach rather than relying only on manual browsing.

Testing includes:

### Authentication

* Admin login
* Customer login
* Invalid credentials
* Empty credentials
* Authentication failures
* Protected admin endpoints

### Security

* NoSQL injection attempts
* Unauthorized access
* Authorization checks
* Ownership validation
* Rate-limit behavior

### Business Logic

* Product validation
* Inventory behavior
* Coupon validation
* Order creation
* Duplicate request protection

### Build & Type Safety

* TypeScript validation
* Production builds
* Backend compilation
* Frontend compilation

> Automated API/security testing does not replace real browser testing. Visual RTL/LTR behavior, responsive layouts, printing, and real-user interaction should still be verified before final client handoff.

---

# 📚 Documentation

Additional project documentation:

```text
docs/
├── ...
```

Important technical references may include:

```text
backend/API-DOCUMENTATION.md
backend/DEPLOYMENT.md
```

The `ai/` directory contains project context and documentation intended to support AI-assisted development and maintenance.

---

# 🔒 Production Security Checklist

Before production release:

* [ ] No `.env` files committed
* [ ] No production secrets in source code
* [ ] Strong random JWT secrets configured
* [ ] Production CORS origin configured
* [ ] HTTPS enabled
* [ ] Secure HTTP-only cookies enabled
* [ ] Authentication endpoints rate-limited
* [ ] Admin authorization verified
* [ ] Ownership checks verified
* [ ] Server-side price validation verified
* [ ] Inventory race conditions tested
* [ ] Idempotency behavior tested
* [ ] NoSQL injection tests passed
* [ ] Production error responses sanitized
* [ ] Database credentials restricted
* [ ] Production database backups configured
* [ ] Debug mode disabled
* [ ] Production logs reviewed
* [ ] Build passes successfully
* [ ] Browser QA completed
* [ ] Mobile responsive QA completed
* [ ] Arabic RTL QA completed
* [ ] English LTR QA completed

---

# 🗺️ Roadmap

### Phase 1 — Core Commerce

* [x] Bilingual storefront
* [x] Product management
* [x] Cart
* [x] Authentication
* [x] Checkout
* [x] Cash on Delivery
* [x] Order management
* [x] Admin dashboard

### Phase 2 — Production Hardening

* [x] API validation
* [x] Authentication security
* [x] Authorization
* [x] Rate limiting
* [x] NoSQL injection protection
* [x] Idempotency
* [x] Ownership checks
* [x] Production deployment
* [x] Automated security testing

### Phase 3 — Business Integrations

* [ ] Odoo ERP integration
* [ ] Shipping provider integration
* [ ] SMS notification provider
* [ ] Automated order synchronization
* [ ] Advanced operational reporting

---

# 📄 License

This project is proprietary software developed for **RAWAQA**.

Unauthorized copying, redistribution, commercial reuse, or modification is not permitted without permission from the project owner.

---

<div align="center">

### RAWAQA — رواقة

**راحة حرفية. مصممة للحياة.**

**Crafted Comfort. Designed for Life.**

🇪🇬 **Made in Egypt**

</div>

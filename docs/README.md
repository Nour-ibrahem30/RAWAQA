# RAWAQA Project Documentation

**Project:** Custom E-Commerce Website — Bean Bag Retail (Egypt)  
**Status:** ✅ **PRODUCTION LIVE**  
**Documentation Version:** 2.0  
**Last Updated:** 2026-10-07

---

## Production Status

| Component | Status | URL / Details |
|-----------|--------|---------------|
| **Frontend** | ✅ Live | [rawaqa-ruby.vercel.app](https://rawaqa-ruby.vercel.app) |
| **Backend** | ✅ Live | Cloudflare Workers (noisy-sun-5690.nouribrahem207.workers.dev) |
| **Database** | ✅ Live | Neon PostgreSQL (serverless) |
| **Payments** | ✅ Integrated | Kashier (TEST mode) |
| **Images** | ✅ Live | Cloudinary CDN |

---

## Architecture Overview

```
┌─────────────────────────────────────┐
│     Next.js 15 (App Router)         │
│     Vercel — ISR revalidate 60s     │
└──────────────────┬──────────────────┘
                   │ HTTPS / REST
                   ▼
┌─────────────────────────────────────┐
│   Express on Cloudflare Workers     │
│   Prisma 7 + @prisma/adapter-neon   │
└──────────────────┬──────────────────┘
                   │ WebSocket / 443
                   ▼
┌─────────────────────────────────────┐
│   Neon PostgreSQL (serverless)      │
└─────────────────────────────────────┘
       ┌──────────┴──────────┐
       ▼                     ▼
┌─────────────┐       ┌─────────────┐
│ Cloudinary  │       │  Kashier    │
│ (images)    │       │ (payments)  │
└─────────────┘       └─────────────┘
```

---

## Implemented Features

### Storefront
- ✅ Bilingual (Arabic/English) with full RTL/LTR support
- ✅ Product browsing with categories and search
- ✅ Shopping cart with inventory protection
- ✅ Checkout with Cash on Delivery + Kashier online payments
- ✅ Order tracking with real-time status
- ✅ User authentication (JWT + Google OAuth)
- ✅ Wishlist functionality

### Admin Dashboard
- ✅ Product management (CRUD, images, variants)
- ✅ Order management with status workflow
- ✅ Category management
- ✅ Coupon system
- ✅ Ad/banner management
- ✅ CMS content editing (Hero, About, Why, Stats, CTA, Footer)
- ✅ Site settings and theme configuration
- ✅ 7 colour theme presets + light theme

### Payments (Kashier Integration)
- ✅ Card payments
- ✅ Mobile wallet payments
- ✅ Installment payments
- ✅ Webhook handling for payment status
- ✅ Payment retry for failed transactions
- ⏳ Currently in TEST mode — production activation pending

### Security
- ✅ Server-side price validation
- ✅ Atomic inventory reservation
- ✅ JWT access (15 min) + refresh (7 days) rotation
- ✅ Rate limiting on auth endpoints
- ✅ Ownership checks on customer resources
- ✅ Idempotency keys on order creation
- ✅ Zod schema validation on all inputs
- ✅ CORS restricted to production origin

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, next-intl |
| Backend | Cloudflare Workers, Express, TypeScript, Prisma 7 |
| Database | Neon PostgreSQL (serverless) |
| Auth | JWT + Google OAuth |
| Images | Cloudinary (direct browser upload) |
| Payments | Kashier (card, wallet, installments) |
| Hosting | Vercel (frontend), Cloudflare Workers (backend) |

---

## Documentation Map

| Folder | Contents |
|--------|----------|
| [01-product/](01-product/) | Vision, scope, personas, journeys |
| [02-requirements/](02-requirements/) | BRS, FRS, NFR, traceability |
| [03-architecture/](03-architecture/) | System and component architecture |
| [04-api/](04-api/) | API design, OpenAPI spec |
| [05-database/](05-database/) | ERD, data dictionary |
| [06-integrations/](06-integrations/) | Odoo, SMS, Kashier specs |
| [07-ux/](07-ux/) | IA, sitemap, UI flows |
| [08-security/](08-security/) | Security specification |
| [09-testing/](09-testing/) | Testing strategy |
| [10-deployment/](10-deployment/) | Deployment guides |
| [11-project-management/](11-project-management/) | Timeline, gap analysis |
| [12-client-proposal/](12-client-proposal/) | Scope of Work |

---

## Repository Structure

```
RAWAQA/
├── frontend/                # Next.js 15 application
│   └── src/
│       ├── app/            # App Router pages
│       │   ├── [locale]/   # Storefront (AR/EN)
│       │   └── admin/      # Admin dashboard
│       ├── components/     # UI components
│       ├── context/        # Auth, Cart, Toast providers
│       └── lib/            # API client, utilities
│
├── backend/                 # Cloudflare Workers API
│   └── src/
│       ├── controllers/    # Route handlers
│       ├── services/       # Business logic
│       ├── repositories/   # Data access
│       ├── routes/         # Express routes
│       └── middleware/     # Auth, rate limiting
│
├── docs/                    # This documentation
└── README.md               # Project overview
```

---

## Remaining Roadmap

| Item | Status |
|------|--------|
| Kashier production mode | ⏳ Pending activation |
| Odoo ERP integration | 📋 Planned |
| SMS notifications | 📋 Planned |
| Shipping provider integration | 📋 Planned |

---

## Quick Links

- **Production Site:** [rawaqa-ruby.vercel.app](https://rawaqa-ruby.vercel.app)
- **API Documentation:** [04-api/API-Design.md](04-api/API-Design.md)
- **Backend Deployment:** [backend/DEPLOYMENT.md](../backend/DEPLOYMENT.md)
- **Final Production Report:** [FINAL-PRODUCTION-CUTOVER-REPORT.md](../FINAL-PRODUCTION-CUTOVER-REPORT.md)

---

<div align="center">

### RAWAQA — رواقة
**راحة حرفية. مصممة للحياة.**  
**Crafted Comfort. Designed for Life.**

🇪🇬 Made in Egypt

</div>

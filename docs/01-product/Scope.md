# Scope — RAWAQA

| Area | Phase-One Scope (35,000 EGP) | Out of Scope | Future |
|------|------------------------------|--------------|--------|
| **Customer website** | Home, shop, product, cart, checkout, track, account | New pages without CR | Blog, loyalty |
| **Frontend** | Connect existing UI to API | Major redesign | PWA |
| **Backend API** | Products, cart, orders, auth, admin | Extra APIs without CR | GraphQL |
| **Database** | PostgreSQL schema for e-commerce | Multi-tenant | Analytics warehouse |
| **Admin** | Products CRUD, orders, dashboard | Multi-role RBAC | Advanced analytics |
| **Odoo** | Customer + order push | Accounting, POS, full ERP | Inventory sync |
| **SMS** | Order confirmation | Marketing SMS, WhatsApp | Status SMS |
| **Payment** | COD (default) | Extra gateways | Paymob/Fawry |
| **Testing** | QA, E2E, UAT | Load testing at scale | Continuous perf |
| **Deployment** | Staging + production setup | Managed hosting fees | Auto-scale |
| **Content** | Seed 8 products | Photography, copywriting | Full catalog import |
| **i18n** | RTL layout toggle | Full Arabic copy | Complete translation |

**Current implementation:** Frontend UI prototype only (~15–20% of customer scope).

See [../11-project-management/Out-of-Scope.md](../11-project-management/Out-of-Scope.md).

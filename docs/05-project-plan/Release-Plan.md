# Release Plan — RAWAQA

## Release 1.0 — MVP Launch

**Target:** Week 5–6  
**Scope:** Full commercial deliverable (35,000 EGP)

### Included
- Customer storefront (connected to API)
- Cart, checkout, order confirmation
- Customer auth + order history
- Admin dashboard
- Odoo order sync
- SMS order confirmation
- Production deployment + SSL

### Exit Criteria
- UAT sign-off
- Zero P0 bugs
- E2E smoke pass on production

---

## Post-Launch Releases (Future — CR)

| Release | Features |
|---------|----------|
| 1.1 | Payment gateway, full Arabic copy |
| 1.2 | Search/filter polish, SEO |
| 1.3 | Order status SMS, inventory hints |
| 2.0 | Advanced Odoo sync (inventory) |

---

## Release Process

1. Feature complete on `main`  
2. Deploy to staging  
3. QA + client UAT  
4. Production deploy (maintenance window if needed)  
5. Smoke tests  
6. Monitor 24h  

See [Deployment-Checklist.md](../03-architecture/Deployment-Checklist.md).

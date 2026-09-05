# Product Vision & Roadmap — RAWAQA

## Product Promise

Every RAWAQA seat is designed around real moments of rest — not spec sheets. The website should feel as calm and intentional as the products: easy to browse, confident to buy, and reliable after purchase.

---

## Differentiation

| Dimension | RAWAQA Approach |
|-----------|-----------------|
| **Design** | Premium editorial aesthetic; Egyptian-inspired palette |
| **Product range** | Lifestyle categories: Relax, Game, Kids, Outdoor |
| **Local focus** | EGP pricing, Egypt-wide delivery, COD support |
| **Operations** | Odoo-backed fulfillment; SMS order confirmation |
| **Craft story** | "Made with care in Egypt" brand narrative |

---

## Experience Principles

1. **Clarity over clutter** — Few steps to purchase  
2. **Trust at checkout** — Visible totals, delivery info, confirmation  
3. **Mobile-first** — Majority of Egyptian traffic on mobile  
4. **Honest availability** — Real stock status when backend connected  
5. **Post-purchase confidence** — Track order + SMS confirmation  

---

## Roadmap

### Phase 0 — Current State (Complete)
- Frontend UI prototype
- Static product catalog (8 products)
- Design system and responsive layout

### Phase 1 — Foundation (Week 1)
- Architecture finalization
- Backend scaffold + database schema
- Environment and deployment skeleton
- API contract (OpenAPI)

### Phase 2 — Frontend Integration (Week 2)
- Connect catalog, cart, checkout to API
- Auth pages (register/login)
- Customer account (orders)
- Wire filters, search (if in MVP)

### Phase 3 — Backend & Admin (Week 3)
- Order management APIs
- Admin dashboard (products, orders)
- Validation, error handling, logging

### Phase 4 — Odoo Integration (Week 4)
- Order push workflow
- Customer mapping
- Sync status logging
- Error/retry handling

### Phase 5 — SMS Integration (Week 4–5)
- Provider integration
- Order confirmation template
- Phone validation
- Duplicate prevention

### Phase 6 — Testing & Launch (Week 5–6)
- QA across flows
- Staging deployment
- Production go-live
- Handover documentation

### Future (Post-Launch)
- Payment gateway integration  
- Full Arabic i18n  
- Inventory sync from Odoo  
- Marketing integrations (Meta Pixel, etc.)  
- Customer reviews system  
- Advanced admin analytics  

---

## Risks & Assumptions

See [Risks-Assumptions.md](Risks-Assumptions.md).

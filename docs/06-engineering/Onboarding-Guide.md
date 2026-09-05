# Onboarding Guide — RAWAQA

## Project Overview

Custom e-commerce for RAWAQA bean bags — frontend prototype exists; backend and integrations to be built.

**Budget:** 35,000 EGP | **Timeline:** 4–6 weeks

---

## Before Day One

- [ ] Read [docs/README.md](../README.md)  
- [ ] Read [Gap-Analysis.md](../11-project-management/Gap-Analysis.md)  
- [ ] Clone repo; run frontend locally  
- [ ] Access to staging credentials (when available)  

---

## Tech Stack

| Layer | Current | Target |
|-------|---------|--------|
| Frontend | HTML, CSS, Vanilla JS | Same + API client |
| Backend | — | TBD (Node/Python recommended) |
| Database | — | PostgreSQL |
| ERP | — | Odoo API |
| SMS | — | Client-selected provider |

---

## Documentation Map

| Task | Read First |
|------|------------|
| Product context | [01-product/PRD.md](../01-product/PRD.md) |
| What to build | [02-requirements/FRS.md](../02-requirements/FRS.md) |
| Architecture | [03-architecture/System-Architecture.md](../03-architecture/System-Architecture.md) |
| API contract | [04-api/API-Design.md](../04-api/API-Design.md) + [openapi.yaml](../04-api/openapi.yaml) |
| Database | [05-database/ERD.md](../05-database/ERD.md) |
| Integrations | [06-integrations/](../06-integrations/) |

---

## Repo Tour

```text
RAWAQA/
├── index.html       # SPA: home, shop, product, cart, track
├── css/styles.css   # Design system
├── js/main.js       # Router, PRODUCTS array, UI logic
├── public/          # Logo.png
└── docs/            # Full documentation pack
```

---

## Local Setup (Current — Frontend Only)

```bash
cd RAWAQA
python -m http.server 8000
# Open http://localhost:8000
```

**Target (with backend):**
```bash
docker-compose up -d    # PostgreSQL + API
npm run dev           # or equivalent
```

See [Local-Development.md](Local-Development.md).

---

## Environment Variables

See [Environment-Variables.md](Environment-Variables.md) and [../10-deployment/Environment-Configuration.md](../10-deployment/Environment-Configuration.md).

**Never commit `.env` files.**

---

## Critical Flows to Understand

1. **Router:** `data-route` clicks → `go()` in `main.js`  
2. **Products:** Static `PRODUCTS` array — will move to API  
3. **Cart:** Partial — badge only; static HTML on cart page  
4. **Checkout:** Toast placeholder — must be replaced  

---

## First Tasks (Suggested)

1. Backend scaffold + `.env.example`  
2. Database migrations M001–M005  
3. GET `/products` + seed 8 products  
4. Wire `shopGrid` to API  
5. Cart API + dynamic cart page  

---

## Working Rules

- Match existing CSS/JS conventions  
- No secrets in frontend  
- Update docs when API/schema changes  
- Mark features: Implemented / Partial / Not Yet Implemented  

---

## PR Checklist

See [Code-Review-Checklist.md](Code-Review-Checklist.md) and [Definition-of-Done.md](Definition-of-Done.md).

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS errors | Configure `CORS_ORIGINS` on API |
| Cart out of sync | Replace static HTML with API-driven render |
| Products empty | Run seed migration |

---

## Contacts

| Role | Responsibility |
|------|----------------|
| Client (RAWAQA) | Odoo, SMS, hosting, content, UAT |
| Dev lead | Architecture, delivery, integrations |

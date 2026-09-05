# RAWAQA Project Documentation

**Project:** Custom E-Commerce Website — Bean Bag Retail (Egypt)  
**Commercial Value:** 35,000 EGP  
**Duration:** 4–6 Weeks  
**Documentation Version:** 1.1  
**Last Updated:** 2026-09-02  
**Total documents:** 118+ markdown files + OpenAPI YAML

---

## Purpose

This documentation pack describes the RAWAQA e-commerce platform from product intent through commercial delivery. It is grounded in the **actual codebase** as of September 2026 and clearly distinguishes **implemented** features from **planned/required** work.

---

## Current Implementation Snapshot

| Layer | Status | Evidence |
|-------|--------|----------|
| Frontend UI (SPA prototype) | **Implemented** | `index.html`, `css/styles.css`, `js/main.js` |
| Backend API | **Not Yet Implemented** | No server code in repository |
| Database | **Not Yet Implemented** | No MongoDB instance, no Mongoose models (schema documented in `docs/05-database/`) |
| Authentication | **Not Yet Implemented** | No login/register pages or auth logic |
| Admin Dashboard | **Not Yet Implemented** | No admin UI or routes |
| Checkout | **Not Yet Implemented** | Placeholder toast in `main.js` |
| Odoo Integration | **Integration Required** | Not in codebase; in commercial scope |
| SMS Integration | **Integration Required** | Not in codebase; in commercial scope |
| Automated Tests | **Not Yet Implemented** | No test files or CI |
| Deployment Config | **Not Yet Implemented** | No Docker, CI/CD, or hosting config |

---

## Documentation Map

| Folder | Audience | Contents |
|--------|----------|----------|
| [01-product/](01-product/) | Product, client, engineering | Vision, scope, personas, journeys, roadmap |
| [02-requirements/](02-requirements/) | BA, engineering, QA | BRS, FRS, NFR, traceability matrix |
| [03-architecture/](03-architecture/) | Engineering, DevOps | System, component, domain architecture |
| [04-api/](04-api/) | Backend, frontend, QA | API design, OpenAPI, admin dashboard spec |
| [05-database/](05-database/) | Backend, DBA | ERD, data dictionary, migration plan |
| [06-integrations/](06-integrations/) | Backend, client | Odoo and SMS integration specifications |
| [07-ux/](07-ux/) | Design, frontend | IA, sitemap, flows, UI states |
| [08-security/](08-security/) | Engineering, DevOps | Security specification, auth plan |
| [09-testing/](09-testing/) | QA, engineering | Testing strategy, test plans |
| [10-deployment/](10-deployment/) | DevOps, client | Deployment, env config, production checklist |
| [11-project-management/](11-project-management/) | PM, client | Gap analysis, timeline, payment plan, CR process |
| [12-client-proposal/](12-client-proposal/) | Client | Scope of Work, commercial summary |

---

## Recommended Reading Order

### For the client
1. [12-client-proposal/Scope-of-Work.md](12-client-proposal/Scope-of-Work.md)
2. [01-product/Product-Overview.md](01-product/Product-Overview.md)
3. [11-project-management/Implementation-Timeline.md](11-project-management/Implementation-Timeline.md)
4. [11-project-management/Gap-Analysis.md](11-project-management/Gap-Analysis.md)

### For developers
1. [11-project-management/Gap-Analysis.md](11-project-management/Gap-Analysis.md)
2. [03-architecture/System-Architecture.md](03-architecture/System-Architecture.md)
3. [02-requirements/FRS.md](02-requirements/FRS.md)
4. [04-api/API-Design.md](04-api/API-Design.md)
5. [05-database/ERD.md](05-database/ERD.md)
6. [06-integrations/Odoo-Integration-Specification.md](06-integrations/Odoo-Integration-Specification.md)

### For QA
1. [02-requirements/Requirements-Traceability-Matrix.md](02-requirements/Requirements-Traceability-Matrix.md)
2. [09-testing/Testing-Strategy.md](09-testing/Testing-Strategy.md)
3. [09-testing/QA-Test-Plans.md](09-testing/QA-Test-Plans.md)

---

## Repository Structure (Code)

```text
RAWAQA/
├── index.html          # SPA shell: Home, Shop, Product, Cart, Track
├── css/styles.css      # Design system and page styles
├── js/main.js          # Router, product data, UI interactions
├── public/Logo.png     # Brand asset
├── README.md           # Developer readme (Arabic/English)
└── docs/               # This documentation pack
```

---

## Canonical Terminology

| Term | Definition |
|------|------------|
| **Implemented** | Exists and works in the current codebase |
| **Partial** | UI or logic exists but is incomplete or non-functional |
| **Planned** | In agreed scope; design documented; not yet built |
| **Required** | Must be delivered for production per commercial agreement |
| **Integration Required** | External system connection specified but not built |
| **Not Yet Implemented** | No code exists; may or may not be in scope |

---

## AI Agent Entry Point

**If you are an AI coding agent (Cursor, Codex, Claude Code, Kiro, or similar), start here:**

```
docs/00-ai/README.md
```

Do not read all 118+ files. The AI context layer tells you exactly what to read for your task.

| AI Context File | Purpose |
|----------------|---------|
| [00-ai/AI-Context.md](00-ai/AI-Context.md) | Concise project overview and current implementation status |
| [00-ai/AI-Rules.md](00-ai/AI-Rules.md) | Strict rules for AI agents — read before writing code |
| [00-ai/Current-State.md](00-ai/Current-State.md) | Evidence-based implementation status table |
| [00-ai/Source-of-Truth.md](00-ai/Source-of-Truth.md) | Authoritative source for every type of information |
| [00-ai/Context-Index.md](00-ai/Context-Index.md) | Task → required documents navigation map |
| [00-ai/Task-Routing.md](00-ai/Task-Routing.md) | Decision trees for common AI agent tasks |
| [00-ai/Architecture-Summary.md](00-ai/Architecture-Summary.md) | AI-readable architecture with Mermaid diagrams |
| [00-ai/Decision-Log.md](00-ai/Decision-Log.md) | Accepted and open architectural decisions |
| [00-ai/Known-Issues.md](00-ai/Known-Issues.md) | Known problems, gaps, and contradictions |
| [00-ai/Constraints.md](00-ai/Constraints.md) | All business, technical, security, and commercial constraints |
| [00-ai/Change-Protocol.md](00-ai/Change-Protocol.md) | Safe modification workflow |
| [00-ai/Documentation-Sync-Protocol.md](00-ai/Documentation-Sync-Protocol.md) | How to keep docs and code in sync |

---

## Related Artifacts

- Scaffolded architecture docs under `docs/03-architecture/` (from Project-Docs-Builder) supplement this pack.
- OpenAPI skeleton: [04-api/openapi.yaml](04-api/openapi.yaml)
- Mermaid diagrams embedded in architecture and integration documents.

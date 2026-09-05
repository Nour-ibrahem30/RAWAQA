# Source-of-Truth — RAWAQA

**Last updated:** 2026-09-02 (v2.0 — MongoDB + i18n sync)
**Defines which document is authoritative for each type of information.**

---

## Authority Matrix

| Information Type | Authoritative Source | Secondary Reference | Notes |
|-----------------|---------------------|---------------------|-------|
| Product scope (in/out) | `docs/01-product/Scope.md` | `docs/01-product/PRD.md` | |
| Business requirements | `docs/02-requirements/BRS.md` | `docs/01-product/PRD.md` | |
| Functional requirements | `docs/02-requirements/FRS.md` | `docs/02-requirements/Acceptance-Criteria.md` | FRS is canonical for feature scope |
| Non-functional requirements | `docs/02-requirements/NFR.md` | `docs/03-architecture/System-Architecture.md` | |
| System architecture | `docs/03-architecture/System-Architecture.md` | `docs/03-architecture/Component-Architecture.md` | v2.0 — MongoDB + TS stack |
| API contract (endpoints, payloads) | `docs/04-api/API-Design.md` + `docs/04-api/openapi.yaml` | `docs/03-architecture/API-Design.md` | `openapi.yaml` is machine-readable authority |
| **Database schema (collections, fields)** | **`docs/05-database/ERD.md`** | `docs/05-database/Data-Dictionary.md` | **MongoDB document model — v2.0. No SQL/Prisma.** |
| Data field semantics | `docs/05-database/Data-Dictionary.md` | `docs/05-database/ERD.md` | |
| **Database engine** | **`docs/00-ai/Decision-Log.md` DEC-003-MONGODB** | `docs/05-database/ERD.md` | **MongoDB. PostgreSQL is superseded (DEC-003).** |
| UX flows and page behavior | `docs/04-ux-and-flows/UX-Flows.md` | `docs/04-ux-and-flows/High-Fidelity-Wireframes.md` | |
| UX information architecture | `docs/04-ux-and-flows/Information-Architecture.md` | `docs/04-ux-and-flows/UX-Flows.md` | |
| Authentication design | `docs/03-architecture/Auth-Security.md` | `docs/08-security/Security-Specification.md` | JWT 15m/7d — resolved conflict |
| Security requirements | `docs/08-security/Security-Specification.md` | `docs/03-architecture/Auth-Security.md` | v2.0 — NoSQL injection section |
| **Localization architecture** | **`docs/03-architecture/Localization-Architecture.md`** | `docs/00-ai/AI-Context.md` | **New in v2.0. Arabic+English, RTL/LTR.** |
| Odoo integration scope | `docs/06-integrations/Odoo-Integration-Specification.md` | `docs/03-architecture/Integration-Architecture.md` | |
| SMS integration scope | `docs/06-integrations/SMS-Integration-Specification.md` | `docs/03-architecture/Integration-Architecture.md` | |
| Environment variables | `docs/10-deployment/Environment-Configuration.md` | `.env.example` | v2.0 — MONGODB_URI, REDIS_URL (not DATABASE_URL) |
| Deployment procedure | `docs/10-deployment/Deployment-Operations.md` | `docs/03-architecture/Deployment-Checklist.md` | |
| Commercial scope and budget | `docs/12-client-proposal/Commercial-Summary.md` | `docs/12-client-proposal/Scope-of-Work.md` | |
| Project timeline | `docs/11-project-management/Implementation-Timeline.md` | `docs/05-project-plan/Milestones.md` | |
| Current implementation status | `docs/00-ai/Current-State.md` | `docs/11-project-management/Gap-Analysis.md` | |
| Architectural decisions | `docs/00-ai/Decision-Log.md` | `docs/03-architecture/README.md` | |
| Known problems and gaps | `docs/00-ai/Known-Issues.md` | `docs/11-project-management/Gap-Analysis.md` | |
| Constraints | `docs/00-ai/Constraints.md` | Multiple docs | v2.0 — TC-004, TC-011, TC-016, TC-017 updated |
| Testing strategy | `docs/09-testing/Testing-Strategy.md` | `docs/03-architecture/Testing-Strategy.md` | v2.0 — Jest+Supertest confirmed |
| Admin dashboard spec | `docs/04-api/Admin-Dashboard-Specification.md` | `docs/02-requirements/FRS.md` | |
| Personas | `docs/01-product/User-Personas.md` | `docs/01-product/Personas.md` | |
| Glossary | `docs/02-requirements/Glossary.md` | `docs/05-database/Data-Dictionary.md` | |
| **Guest checkout behavior** | **`docs/00-ai/Decision-Log.md` DEC-013** | `docs/04-api/API-Design.md` | **Enabled. userId nullable.** |
| **Language defaults** | **`docs/00-ai/Decision-Log.md` DEC-023** | `docs/03-architecture/Localization-Architecture.md` | **Default: Arabic** |

---

## Precedence Rules

### Rule 1 — Code beats undated docs for implementation facts
Code is ground truth for "what is currently implemented." Specs describe the target.

**Exception:** If a doc is a specification/requirement, the code must match it — not the other way around.

### Rule 2 — Requirements beat architecture for scope
If FRS includes a feature, it is in scope regardless of architecture doc.

### Rule 3 — `openapi.yaml` beats narrative API-Design.md for API contracts
Machine-readable spec is authoritative when both exist and disagree.

### Rule 4 — ERD beats Data-Dictionary for structure; Data-Dictionary beats ERD for semantics
Field name/type: ERD wins. Field meaning/usage: Data-Dictionary wins.

### Rule 5 — Current-State.md beats all docs for implementation status
If any doc claims a feature is implemented but Current-State.md says not, investigate and resolve. Current-State.md is the maintained record.

### Rule 6 — Decision-Log.md is authoritative for decisions
`Accepted` decisions in Decision-Log.md supersede any contradictory option elsewhere.

**Critical resolved conflicts:**
- DEC-003-MONGODB supersedes DEC-003 (PostgreSQL). Any reference to PostgreSQL is historically superseded.
- DEC-002 (Node.js + TypeScript + Express) supersedes the former "OPEN" state.
- DEC-015 (Arabic + English) supersedes the former "OPEN" state.
- DEC-013 (guest checkout enabled) supersedes the former "OPEN" state.
- JWT expiry: **15m access / 7d refresh** (DEC-006) supersedes the "24h" value in Auth-Security.md v1.0.

### Rule 7 — When no rule resolves, flag it
Add to Known-Issues.md. Do not pick a winner silently.

---

## Source Document Quick Reference

```
docs/
├── 01-product/
│   ├── Scope.md                    ← Product scope boundary
│   ├── PRD.md                      ← Product requirements overview
│   └── Roadmap.md                  ← Post-MVP (do not implement)
│
├── 02-requirements/
│   ├── FRS.md                      ← *** CANONICAL: Functional requirements ***
│   ├── BRS.md                      ← Business requirements
│   ├── NFR.md                      ← Non-functional requirements
│   └── Acceptance-Criteria.md      ← Definition of done per feature
│
├── 03-architecture/
│   ├── System-Architecture.md      ← *** CANONICAL: System design (v2.0 — MongoDB/TS) ***
│   ├── Localization-Architecture.md ← *** CANONICAL: i18n, RTL/LTR, bilingual ***
│   ├── Auth-Security.md            ← Auth design (JWT 15m/7d)
│   └── Data-Architecture.md        ← Data model approach
│
├── 04-api/
│   ├── API-Design.md               ← *** CANONICAL: API narrative spec (v2.0) ***
│   ├── openapi.yaml                ← *** CANONICAL: Machine-readable API contract ***
│   └── Admin-Dashboard-Specification.md
│
├── 05-database/
│   ├── ERD.md                      ← *** CANONICAL: MongoDB document model (v2.0) ***
│   └── Data-Dictionary.md          ← *** CANONICAL: Field semantics (v2.0 — MongoDB) ***
│
├── 06-integrations/
│   ├── Odoo-Integration-Specification.md ← *** CANONICAL: Odoo scope ***
│   └── SMS-Integration-Specification.md  ← *** CANONICAL: SMS scope ***
│
├── 08-security/
│   └── Security-Specification.md   ← *** CANONICAL: Security (v2.0 — NoSQL) ***
│
├── 09-testing/
│   └── Testing-Strategy.md         ← *** CANONICAL: Testing (v2.0 — Jest+Supertest) ***
│
├── 10-deployment/
│   └── Environment-Configuration.md ← *** CANONICAL: Env vars (v2.0 — MONGODB_URI) ***
│
└── 00-ai/
    ├── Current-State.md            ← *** CANONICAL: Implementation status ***
    ├── Decision-Log.md             ← *** CANONICAL: Decisions ***
    ├── Known-Issues.md             ← *** CANONICAL: Issues and gaps ***
    └── Constraints.md              ← *** CANONICAL: All constraints ***
```

---

## What Is NOT a Source of Truth

| Item | Why not authoritative |
|------|----------------------|
| `docs/05-project-plan/` | Historical planning artifacts |
| `docs/06-engineering/` | Team process guides |
| `CHANGELOG.md` | History log |
| `ai/` directory (root) | Original AI runbooks — superseded by `docs/00-ai/` |
| Comments in code | Code behavior is authoritative, not comments |
| The AI context layer itself | Navigates and describes other documents; does not override them |
| Any doc referencing "PostgreSQL" as active | DEC-003 superseded; such references are stale |

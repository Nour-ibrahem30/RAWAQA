# RAWAQA Documentation Hub

**Last reviewed:** 19 November 2026  
**Code reference:** `refactor/postgresql-prisma`

> **Important documentation correction:** Some older documents in this repository describe an earlier static prototype and an obsolete MongoDB/Mongoose target. They are historical planning material, not the source of truth for the current implementation. The current code uses a Next.js 15.5.26 / React 19 frontend and a TypeScript backend with PostgreSQL and Prisma 7.10. Always verify implementation claims against the current source code and deployment configuration.

## Start here

| Audience | Start with |
|---|---|
| Non-technical team members | [Arabic Team Guide](team-guide/README.md) |
| Business / product stakeholders | [Business Guide](team-guide/BUSINESS-GUIDE.md) |
| Understanding the customer journey | [System Walkthrough](team-guide/SYSTEM-WALKTHROUGH.md) |
| Understanding what is implemented | [Current Status & Glossary](team-guide/STATUS-AND-GLOSSARY.md) |
| Academic / BIS project planning | [Academic Project Baseline](team-guide/ACADEMIC-PROJECT-BASELINE.md) |
| Developers | Current source code, package manifests, Prisma schema, and the technical documents below |

## Current implementation reference

| Area | Current source of truth |
|---|---|
| Frontend framework versions | `frontend/package.json` |
| Backend dependencies and scripts | `backend/package.json` |
| Database entities and relations | `backend/prisma/schema.prisma` |
| Checkout pricing / shipping rules | `backend/src/services/checkout.service.ts` |
| API route registration | `backend/src/routes/` and `backend/src/app.ts` |
| Business logic | `backend/src/services/` |
| Data access | `backend/src/repositories/` |
| Deployment configuration | Vercel / Cloudflare project settings (not fully provable from repository files alone) |

## Technical documentation areas

The repository contains historical and technical documents organized by topic:

- `00-ai/` — AI-assisted development context and repository conventions.
- `01-product/` — product vision, requirements, scope and roadmap.
- `02-requirements/` — functional and non-functional requirements.
- `03-architecture/` — architecture, security, data flow and system design.
- `04-api/` — API reference and OpenAPI material.
- `05-database/` — database design and data dictionary.
- `06-integrations/` — Odoo and SMS integration specifications.
- `08-security/` — security controls and guidance.
- `09-testing/` — testing strategy and QA plans.
- `10-deployment/` — deployment notes.
- `11-project-management/` — planning and delivery documents.
- `12-client-proposal/` — historical commercial scope and proposal material.

Some of these files predate the current architecture. Treat specifications as intended behavior unless verified in code and the live environment.

## Current high-level stack

- **Frontend:** Next.js 15.5.26, React 19, TypeScript, Tailwind CSS, next-intl.
- **Backend:** TypeScript, Express-based API, Cloudflare Workers entry point.
- **Database:** PostgreSQL hosted through Neon; Prisma 7.10.
- **Media:** Cloudinary integration code.
- **Payments:** Kashier integration code; project context identifies the current setup as test mode.
- **External operations:** Odoo and SMS service code exist; production connectivity is not verified by source presence alone.
- **Observability:** Sentry and structured logging code exist; live activation depends on environment configuration.

## Integration status rule

Use the following language in reports and presentations:

- **Implemented in code:** relevant source code exists.
- **Tested in sandbox:** a test environment has been exercised and evidence is available.
- **Production verified:** a real production integration has been checked successfully with current evidence.
- **Not verified:** do not claim the integration is operational.

See [Current Status & Glossary](team-guide/STATUS-AND-GLOSSARY.md) for the team-friendly checklist.

## Academic use and data protection

RAWAQA is a commercial project developed for a client/company. Academic use requires appropriate permission, a separate academic copy where needed, test data instead of customer data, removal of secrets, and accurate contribution records. See [Academic Project Baseline](team-guide/ACADEMIC-PROJECT-BASELINE.md).

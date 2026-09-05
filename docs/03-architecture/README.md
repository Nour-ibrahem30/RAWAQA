# Architecture Documentation — RAWAQA

## Canonical vs Scaffolded Files

This folder contains architecture docs from Project-Docs-Builder scaffold **plus** project-specific content. Use these **canonical** paths first:

| Topic | Canonical Document |
|-------|-------------------|
| System architecture | [System-Architecture.md](System-Architecture.md) |
| Components | [Component-Architecture.md](Component-Architecture.md) |
| API design | [../04-api/API-Design.md](../04-api/API-Design.md) |
| OpenAPI | [../04-api/openapi.yaml](../04-api/openapi.yaml) |
| ERD | [../05-database/ERD.md](../05-database/ERD.md) |
| Data dictionary | [../05-database/Data-Dictionary.md](../05-database/Data-Dictionary.md) |
| Odoo integration | [../06-integrations/Odoo-Integration-Specification.md](../06-integrations/Odoo-Integration-Specification.md) |
| SMS integration | [../06-integrations/SMS-Integration-Specification.md](../06-integrations/SMS-Integration-Specification.md) |
| Security | [../08-security/Security-Specification.md](../08-security/Security-Specification.md) |
| Testing | [../09-testing/Testing-Strategy.md](../09-testing/Testing-Strategy.md) |
| Deployment | [../10-deployment/Deployment-Operations.md](../10-deployment/Deployment-Operations.md) |
| Gap analysis | [../11-project-management/Gap-Analysis.md](../11-project-management/Gap-Analysis.md) |

---

## Reading Order

1. [System-Architecture.md](System-Architecture.md)  
2. [Integration-Architecture.md](Integration-Architecture.md)  
3. [../04-api/API-Design.md](../04-api/API-Design.md)  
4. [../05-database/ERD.md](../05-database/ERD.md)  
5. [Auth-Security.md](Auth-Security.md) → [../08-security/Security-Specification.md](../08-security/Security-Specification.md)  
6. [Error-Handling-Strategy.md](Error-Handling-Strategy.md)  

---

## Diagrams

Mermaid diagrams are embedded in:
- `System-Architecture.md`
- `../05-database/ERD.md`
- `../06-integrations/*.md`
- `../07-ux/UX-Documentation.md`

Scaffold diagram sources: [diagrams/](diagrams/) (optional `.mmd` files).

---

## Current Implementation Status

**Frontend SPA:** Implemented (prototype)  
**Backend / DB / Integrations:** Not Yet Implemented  

See [../README.md](../README.md).

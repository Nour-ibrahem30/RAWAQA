# Team Workflow — RAWAQA

## Roles

| Role | Responsibility |
|------|----------------|
| Client (RAWAQA) | Content, Odoo, SMS, hosting, UAT |
| Dev lead | Architecture, backend, integrations |
| Frontend dev | SPA + API integration |
| QA | Test execution, UAT support |

## Branch Naming

```
feature/cart-api-integration
fix/checkout-validation
docs/update-api-spec
```

## PR Rules

- One feature per PR where possible  
- Link to backlog ID (B-xxx)  
- Update docs if API/schema changes  
- No secrets in commits  

## Contract-First

API changes: update OpenAPI → implement backend → integrate frontend.

## Activity Log

Record meaningful changes in `logs/ACTIVITY.md` when that file is initialized.

## Documentation Updates

When changing scope or APIs, update:
- FRS / traceability matrix  
- OpenAPI  
- Gap analysis status  

See [Code-Review-Checklist.md](Code-Review-Checklist.md).

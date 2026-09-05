# Git Branching Strategy — RAWAQA

## Branches

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready code |
| `develop` | Integration branch (optional) |
| `feature/*` | New features |
| `fix/*` | Bug fixes |
| `docs/*` | Documentation updates |

## Naming

```
feature/cart-api
feature/checkout-page
fix/cart-count-sync
docs/odoo-spec-update
```

## Flow

1. Branch from `main` (or `develop`)  
2. PR to `main` when ready  
3. Squash or merge commit per team preference  
4. Tag releases: `v1.0.0` at go-live  

## Rules

- No force push to `main`  
- PR required for all changes  
- CI must pass before merge (when CI exists)  

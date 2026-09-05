# Backup & Recovery — RAWAQA

## Goals

| Metric | Target |
|--------|--------|
| RPO (Recovery Point Objective) | 24 hours |
| RTO (Recovery Time Objective) | 4 hours |

## Backup Scope

| Asset | Method | Frequency |
|-------|--------|-----------|
| PostgreSQL | Automated dump / provider snapshot | Daily |
| Product images | Sync to backup storage | Daily |
| Environment config | Encrypted secure store | On change |

## Database Backup

- Daily full backup retained 30 days  
- Pre-deployment manual backup required  
- Test restore quarterly (recommended)

## Restore Procedure

1. Stop API to prevent writes  
2. Restore DB from latest clean backup  
3. Verify row counts (orders, products)  
4. Reconcile Odoo if orders lost during outage  
5. Restart API; run smoke tests  

## Disaster Recovery

Total host loss: provision new server → restore DB → redeploy API + frontend from git → update DNS if needed.

## Security

Backups encrypted at rest. Access restricted to ops/admin.

See [../10-deployment/Deployment-Operations.md](../10-deployment/Deployment-Operations.md).

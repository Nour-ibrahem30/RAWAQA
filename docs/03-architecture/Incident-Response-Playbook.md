# Incident Response Playbook — RAWAQA

## Severity Levels

| Level | Example | Response time |
|-------|---------|---------------|
| S1 | Site completely down | Immediate |
| S2 | Checkout failing | < 2 hours |
| S3 | Odoo sync failing | < 4 hours |
| S4 | Single product image broken | Next business day |

## First 15 Minutes

1. Confirm incident (uptime monitor, user report)  
2. Check API /health and server status  
3. Review recent deployments  
4. Notify client if customer-facing  
5. Assign owner  

## Runbooks

### Site Down
- Check hosting, SSL, API process, DB connection  
- Rollback last deploy if correlated  
- Restore from backup if data corruption  

### Checkout Failing
- Check API logs for 5xx  
- Verify DB connectivity and stock logic  
- Disable checkout banner if extended outage (optional)  

### Odoo Sync Failing
- Verify Odoo credentials and uptime  
- Check integration_logs for error pattern  
- Orders still saved — communicate to client ops  
- Manual retry or wait for automatic retry  

### SMS Failing
- Verify provider credits and API key  
- Orders still confirmed — ops can call customer if critical  

## Communication Template

```
Incident: [title]
Status: Investigating | Identified | Resolved
Impact: [customer-facing description]
ETA: [if known]
```

## Post-Incident

Document timeline, root cause, and preventive action within 5 business days.

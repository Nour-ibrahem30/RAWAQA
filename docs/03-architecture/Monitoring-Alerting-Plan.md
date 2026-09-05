# Monitoring & Alerting — RAWAQA

## Goals

Detect outages and integration failures before customers report them.

## Health Checks

| Check | Endpoint | Interval |
|-------|----------|----------|
| API alive | GET /health | 1 min |
| Frontend | GET / (homepage) | 1 min |
| Database | Connection pool ping | 1 min |

## Core Metrics

| Metric | Alert Threshold |
|--------|-----------------|
| API 5xx rate | > 1% over 5 min → P1 |
| Response time p95 | > 1s catalog, > 2s checkout → P2 |
| Odoo sync failures | > 3 in 1 hour → P2 |
| SMS failures | > 5 in 1 hour → P2 |
| Disk usage | > 85% → P2 |

## Alert Severity

| Level | Response |
|-------|----------|
| P1 | Site down — immediate |
| P2 | Degraded — within 4 hours |
| P3 | Warning — next business day |

## Tooling (Client/Dev choice)

- Uptime: UptimeRobot, Pingdom, or cloud provider  
- APM: Optional (Sentry, Datadog)  
- Logs: Structured JSON to file or cloud log service  

## Dashboards

1. Uptime + response time  
2. Orders per hour  
3. Failed Odoo/SMS sync count  

## MVP Minimum

External uptime monitor on production URL + daily review of integration_logs failures.

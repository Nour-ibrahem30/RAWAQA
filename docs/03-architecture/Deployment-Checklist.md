# Deployment Checklist — RAWAQA

> **Full ops doc:** [../10-deployment/Deployment-Operations.md](../10-deployment/Deployment-Operations.md)

## Pre-Deployment (Staging)

- [ ] All migrations run on staging
- [ ] Seed data verified (8 products)
- [ ] API health check passes
- [ ] E2E test pass on staging
- [ ] Odoo staging sync tested
- [ ] SMS staging test sent
- [ ] No secrets in git or frontend bundle

## Production Deployment

- [ ] Database backup taken
- [ ] DNS pointed to production
- [ ] SSL certificate active
- [ ] Environment variables set (JWT, DB, Odoo, SMS)
- [ ] CORS limited to production domain
- [ ] Migrations applied
- [ ] Admin user created
- [ ] Rate limiting enabled

## Smoke Tests (Post-Deploy)

- [ ] Homepage loads (HTTPS)
- [ ] GET /products returns data
- [ ] Test checkout (COD) on production or staging mirror
- [ ] Admin login works
- [ ] Error monitoring active

## Rollback

- [ ] Previous API image/tag identified
- [ ] DB restore procedure documented
- [ ] Rollback tested on staging once

## Sign-Off

| Role | Name | Date |
|------|------|------|
| Dev lead | | |
| Client | | |

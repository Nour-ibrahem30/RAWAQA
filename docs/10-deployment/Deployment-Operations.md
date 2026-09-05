# Deployment & Operations — RAWAQA

**Status:** Not Yet Implemented

---

## 1. Deployment Architecture

```mermaid
flowchart TB
    subgraph Client Infrastructure
        DNS[Domain DNS]
        SSL[SSL Certificate]
    end
    
    subgraph Hosting
        WEB[Static Frontend Host<br/>Nginx / CDN]
        API[API Server<br/>Node/Python container]
        DB[(PostgreSQL)]
    end
    
    subgraph External
        ODOO[Odoo Cloud / Self-hosted]
        SMS[SMS Provider]
    end
    
    DNS --> WEB
    DNS --> API
    SSL --> WEB
    SSL --> API
    WEB --> API
    API --> DB
    API --> ODOO
    API --> SMS
```

---

## 2. Environment Configuration

| Environment | Frontend URL | API URL | Database |
|-------------|--------------|---------|----------|
| Development | localhost:8000 | localhost:3000 | Local PostgreSQL |
| Staging | staging.rawaqa.example.com | api-staging.rawaqa.example.com | Staging DB |
| Production | www.rawaqa.example.com | api.rawaqa.example.com | Production DB |

---

## 3. Environment Variables

See `.env.example` (to be created with backend):

```bash
# Application
NODE_ENV=production
PORT=3000
API_BASE_URL=https://api.rawaqa.example.com

# Database
DATABASE_URL=postgresql://user:pass@host:5432/rawaqa

# Auth
JWT_SECRET=<generate-secure-random>
JWT_EXPIRY=24h

# Frontend
FRONTEND_URL=https://www.rawaqa.example.com

# Odoo
ODOO_URL=https://odoo.client.example.com
ODOO_DB=rawaqa
ODOO_USERNAME=api_user
ODOO_API_KEY=<secret>

# SMS
SMS_PROVIDER=twilio
SMS_API_KEY=<secret>
SMS_SENDER_ID=RAWAQA
SMS_ENABLED=true

# Optional
LOG_LEVEL=info
SENTRY_DSN=
```

---

## 4. Deployment Steps

### Frontend
1. Build/static files to `dist/` or serve current HTML/CSS/JS  
2. Upload to CDN or Nginx static root  
3. Configure cache headers (HTML: no-cache; assets: long cache)  
4. Verify HTTPS  

### Backend
1. Run database migrations  
2. Deploy API container/process  
3. Health check `GET /health`  
4. Seed admin user if first deploy  

### Post-Deploy Smoke Tests
- [ ] Homepage 200  
- [ ] GET /products 200  
- [ ] Test checkout on staging first  
- [ ] Admin login works  

---

## 5. Production Checklist

### Hard Blockers
- [ ] SSL active on all domains  
- [ ] Secrets in env (not in code)  
- [ ] Database backups configured  
- [ ] Migrations applied  
- [ ] Odoo credentials tested  
- [ ] SMS sender ID approved  
- [ ] CORS restricted to production domain  
- [ ] Rate limiting enabled  

### Client Responsibilities
- Domain registration and DNS  
- Hosting fees (VPS/cloud)  
- SSL (Let's Encrypt or provider)  
- Odoo instance and credentials  
- SMS provider account and credits  
- Product content and images  

### Developer Responsibilities
- Application deployment  
- CI/CD pipeline  
- Migration execution  
- Integration configuration  
- Technical documentation handover  
- 30-day defect fix window (define in contract)  

### Third-Party Responsibilities
- Odoo uptime and API availability  
- SMS delivery and sender ID approval  
- Payment gateway (if added later)  

---

## 6. Logging

| Log Type | Destination | Retention |
|----------|-------------|-----------|
| Application | stdout / file / cloud | 30 days |
| Access | Nginx / load balancer | 90 days |
| Integration | DB `integration_logs` | 1 year |
| Errors | Sentry (optional) | 90 days |

---

## 7. Monitoring

| Check | Frequency | Alert |
|-------|-----------|-------|
| Uptime (homepage + API) | 1 min | Email/SMS if down |
| 5xx error rate | 5 min | > 1% |
| Odoo sync failures | Hourly | Any failed > 1 hour |
| Disk / DB connections | 5 min | Threshold breach |

---

## 8. Backup Strategy

| Asset | Frequency | RPO | RTO |
|-------|-----------|-----|-----|
| PostgreSQL | Daily automated + pre-deploy | 24h | 4h |
| Product images | Daily sync to backup storage | 24h | 4h |
| Env config | Encrypted secure store | — | 1h |

---

## 9. Recovery & Rollback

**Rollback procedure:**
1. Revert API to previous container/image tag  
2. Rollback DB migration if backward-compatible; else restore snapshot  
3. Revert frontend static files  
4. Run smoke tests  
5. Notify client  

**Disaster recovery:** Restore DB from latest backup; redeploy API; verify integrations.

---

## 10. Local Development (Current)

```bash
# Frontend only (current state)
python -m http.server 8000
# Open http://localhost:8000
```

**Target (with backend):**
```bash
docker-compose up  # API + PostgreSQL
cd frontend && python -m http.server 8000
```

See [Environment-Configuration.md](Environment-Configuration.md) for details.

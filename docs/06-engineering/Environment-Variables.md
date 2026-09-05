# Environment Variables — RAWAQA

> **Full reference:** [../10-deployment/Environment-Configuration.md](../10-deployment/Environment-Configuration.md)

## Required (Backend — Planned)

```bash
DATABASE_URL=
JWT_SECRET=
ODOO_URL=
ODOO_DB=
ODOO_USERNAME=
ODOO_API_KEY=
SMS_PROVIDER=
SMS_API_KEY=
SMS_SENDER_ID=
FRONTEND_URL=
CORS_ORIGINS=
```

## Rules

- Never commit `.env` to git  
- Provide `.env.example` with placeholders only  
- No secrets in frontend code  

**Current frontend:** No env vars required (static files).

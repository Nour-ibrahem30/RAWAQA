# Security Architecture — RAWAQA

> **Canonical:** [../08-security/Security-Specification.md](../08-security/Security-Specification.md)

## Layers

| Layer | Controls |
|-------|----------|
| Edge | HTTPS, TLS 1.2+, security headers |
| API | JWT auth, RBAC, rate limiting, input validation |
| Data | Parameterized queries, PII access control |
| Secrets | Env vars only; never in git or frontend |
| Integrations | Redacted logs; timeout + retry |

## Trust Boundaries

```mermaid
flowchart TB
    subgraph Untrusted
        Browser[Customer Browser]
    end
    subgraph DMZ
        CDN[Static Frontend]
        API[API Server]
    end
    subgraph Trusted
        DB[(Database)]
        Secrets[Secret Store / Env]
    end
    subgraph External
        Odoo[Odoo]
        SMS[SMS]
    end

    Browser --> CDN
    Browser --> API
    API --> DB
    API --> Secrets
    API --> Odoo
    API --> SMS
```

## Admin Isolation

Admin routes separate from public; require `role=admin`. No admin links in customer nav.

See [Auth-Security.md](Auth-Security.md) and [Threat-Model.md](Threat-Model.md).

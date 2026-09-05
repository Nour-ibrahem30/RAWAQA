# Threat Model — RAWAQA

**Method:** STRIDE (simplified) | **Status:** Pre-implementation review

## Assets

- Customer PII (phone, address, email)
- Order and payment data (COD)
- Admin credentials
- Odoo/SMS API keys
- Product catalog

## Trust Boundaries

Browser ↔ API ↔ Database ↔ External providers

## STRIDE Matrix

| Threat | Category | Mitigation |
|--------|----------|------------|
| SQL injection | Tampering | ORM / parameterized queries |
| Stolen JWT | Spoofing | Short expiry, HTTPS, secure storage |
| Admin bypass | Elevation | RBAC middleware |
| XSS in product name | Tampering | Output encoding, CSP |
| API key in frontend | Info disclosure | Server-side only |
| Order spam | DoS | Rate limit checkout |
| Fake Odoo responses | Spoofing | TLS, validate response IDs |
| SMS cost abuse | DoS | Rate limit + phone validation |

## Critical Scenarios

1. **Attacker accesses admin** → Strong passwords, RBAC, rate limit  
2. **Order data leak** → Auth on GET /orders; own-data only  
3. **Integration credential leak** → Env secrets, log redaction  

## Review Cadence

Re-review before production launch and after any auth/payment changes.

Derived requirements → [../08-security/Security-Specification.md](../08-security/Security-Specification.md)

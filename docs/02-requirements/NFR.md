# Non-Functional Requirements (NFR) — RAWAQA

**Document ID:** RAWAQA-NFR-001  
**Version:** 1.0

---

## 1. Performance

| ID | Requirement | Target | Verification |
|----|-------------|--------|--------------|
| NFR-P01 | Homepage LCP | < 2.5s on 4G | Lighthouse |
| NFR-P02 | API response (catalog) | < 300ms p95 | APM/load test |
| NFR-P03 | API response (checkout) | < 500ms p95 | Load test |
| NFR-P04 | Time to interactive (mobile) | < 4s | Lighthouse |
| NFR-P05 | Image optimization | WebP where supported; lazy load | Manual audit |

**Current state:** Static files — fast locally; no API baseline yet.

---

## 2. Scalability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-S01 | Concurrent users | 100 simultaneous shoppers (MVP) |
| NFR-S02 | Product catalog | Up to 500 products without redesign |
| NFR-S03 | Orders | 1,000 orders/month MVP capacity |
| NFR-S04 | Horizontal scaling | Stateless API behind load balancer (future) |

---

## 3. Security

| ID | Requirement | Reference |
|----|-------------|-----------|
| NFR-SEC01 | HTTPS only in production | [Security-Specification.md](../08-security/Security-Specification.md) |
| NFR-SEC02 | Password hashing (bcrypt/argon2) | Required |
| NFR-SEC03 | JWT expiry / session timeout | Required |
| NFR-SEC04 | Input validation server-side | Required |
| NFR-SEC05 | No secrets in frontend | Required |
| NFR-SEC06 | Admin routes protected | Required |
| NFR-SEC07 | OWASP Top 10 mitigations | Required |

---

## 4. Availability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-A01 | Uptime | 99.5% monthly (excluding planned maintenance) |
| NFR-A02 | Planned maintenance window | Off-peak, announced 24h ahead |
| NFR-A03 | Odoo/SMS failure | Order still saved; async retry |

---

## 5. Reliability

| ID | Requirement |
|----|-------------|
| NFR-R01 | Database daily backups |
| NFR-R02 | Odoo sync retry (3 attempts, exponential backoff) |
| NFR-R03 | SMS retry (2 attempts) |
| NFR-R04 | Idempotent order creation |

---

## 6. Maintainability

| ID | Requirement |
|----|-------------|
| NFR-M01 | API documented in OpenAPI |
| NFR-M02 | Environment variables for all config |
| NFR-M03 | Structured logging (JSON) |
| NFR-M04 | Migration-based schema changes |

---

## 7. Accessibility

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-AC01 | Focus visible states | Implemented in CSS (`:focus-visible`) |
| NFR-AC02 | Alt text on product images | Required when real images added |
| NFR-AC03 | Form labels | Required on checkout |
| NFR-AC04 | WCAG 2.1 Level AA | Target for MVP |

---

## 8. Responsive Behavior

| ID | Requirement | Status |
|----|-------------|--------|
| NFR-RB01 | Mobile breakpoint ≤880px | Implemented |
| NFR-RB02 | Touch-friendly controls | Implemented |
| NFR-RB03 | Readable typography (clamp) | Implemented |

---

## 9. Browser Compatibility

| Browser | Support |
|---------|---------|
| Chrome / Edge (last 2 versions) | Full |
| Firefox (last 2 versions) | Full |
| Safari iOS / macOS | Full |
| IE11 | Not supported |

---

## 10. Logging & Monitoring

| ID | Requirement |
|----|-------------|
| NFR-L01 | Request logging with correlation ID |
| NFR-L02 | Integration event log (Odoo, SMS) |
| NFR-L03 | Error alerting for 5xx rate > 1% |
| NFR-L04 | Uptime monitoring on production URL |

---

## 11. Error Recovery

| Scenario | Expected Behavior |
|----------|-------------------|
| API timeout | User-friendly message; retry button |
| Odoo down | Order saved; sync queued |
| SMS failure | Order confirmed; admin notified |
| DB connection loss | 503; no partial order corruption |

---

## 12. SEO (Future Scope)

- Meta descriptions, Open Graph tags  
- Sitemap.xml, robots.txt  
- Structured data (Product schema)  

**Status:** Not Yet Implemented — deferred post-MVP unless client prioritizes.

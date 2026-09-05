# Security Specification — RAWAQA

**Version:** 2.0
**Last Updated:** 2026-09-02
**Status:** Specification — Backend Not Yet Implemented

> **⚠️ ARCHITECTURE NOTE:** This document has been updated for MongoDB + Mongoose. References to SQL injection, parameterized SQL queries, and PostgreSQL-specific controls from v1.0 are replaced with MongoDB/NoSQL equivalents. The authentication stack (JWT + bcrypt) is unchanged.

---

## 1. Authentication

| Control | Requirement | Status |
|---------|-------------|--------|
| Password hashing | bcrypt, cost factor ≥ 12 | Not Yet Implemented |
| JWT access token expiry | **15 minutes** (authoritative — DEC-006) | Planned |
| JWT refresh token expiry | **7 days** | Planned |
| Refresh token storage | Hash stored in `users.refreshTokenHash` (MongoDB) | Planned |
| Session fixation | Issue new tokens on login | Planned |
| Brute force protection | Rate limit `/auth/login` to 10 req/min/IP | Planned |
| Logout | Clear `refreshTokenHash` in DB; remove cookie | Planned |

> **Resolved conflict:** Earlier versions of `Auth-Security.md` stated a 24h access token expiry. The authoritative expiry per DEC-006 is **15 minutes access / 7 days refresh**. Do not implement 24h access tokens.

---

## 2. Authorization Matrix

| Resource | Public | Guest (sessionId) | Customer (JWT) | Admin (JWT role:admin) |
|----------|--------|-------------------|---------------|----------------------|
| `GET /products` | ✅ | ✅ | ✅ | ✅ |
| `GET /categories` | ✅ | ✅ | ✅ | ✅ |
| `GET /orders/track/:num` | ✅ | ✅ | ✅ | ✅ |
| `POST /cart/items` | — | ✅ (sessionId) | ✅ (JWT) | — |
| `GET /cart` | — | ✅ (sessionId) | ✅ (JWT) | — |
| `POST /orders` | — | ✅ (sessionId) | ✅ (JWT) | — |
| `GET /orders` | — | — | ✅ own only | — |
| `GET /orders/:id` | — | — | ✅ own only | — |
| `/api/admin/*` | — | — | — | ✅ |

**Guest identification:** Requests without a JWT but with a valid `X-Session-ID` header (UUID v4) are treated as guest sessions. The backend creates a guest session identifier on first cart interaction and returns it to the client.

---

## 3. Password Security

- Minimum 8 characters
- No plaintext storage — bcrypt hash only
- bcrypt cost factor: minimum 12
- Password reset: planned post-MVP (not in current scope)
- `passwordHash` field is never included in any API response — enforced at repository layer

---

## 4. JWT Security

- Signed with `JWT_SECRET` (minimum 32 bytes, random, from environment)
- Algorithm: HS256 (minimum) or RS256 if key pair is available
- Access token payload: `{ userId, role, iat, exp }`
- Refresh token: opaque random string stored as bcrypt hash in `users.refreshTokenHash`
- Token rotation: new refresh token issued on each refresh; old hash replaced
- Admin claim: `role: 'admin'` checked by `adminOnly` middleware on all `/api/admin/*` routes
- JWT must never appear in frontend source code, logs, or URL parameters

---

## 5. Guest Session Security

- Session identifiers are UUID v4 generated server-side on first cart creation
- Session ID sent to client in response; client stores in `localStorage` or memory
- Session ID validated as UUID format on every request — reject non-UUID values
- Guest carts expire automatically via MongoDB TTL index (7 days — `cart.expiresAt`)
- Guest orders: `customerSnapshot.phone` is the primary fulfillment identifier
- Guest sessions cannot access order history — orders can only be looked up by `orderNumber`
- Rate limit guest cart creation per IP to prevent cart flooding

---

## 6. Environment Variables and Secrets

| Secret | Location | Never In |
|--------|----------|----------|
| `MONGODB_URI` | Server environment | Frontend, git, logs |
| `JWT_SECRET` | Server environment | Frontend, git, logs |
| `REDIS_URL` | Server environment | Frontend, git, logs |
| `ODOO_API_KEY` | Server environment | Frontend, git, logs |
| `SMS_API_KEY` | Server environment | Frontend, git, logs |

Rules:
- `.env` file must be in `.gitignore` — never committed
- `.env.example` contains placeholder names only — no real values
- All secrets loaded via typed env config (`src/config/env.ts` using Zod)
- Environment variable access is centralised — no `process.env` scattered through application code

---

## 7. Input Validation

| Layer | Tool | Responsibility |
|-------|------|----------------|
| Frontend | Inline JS validation | UX feedback only — never trusted by backend |
| API boundary | Zod schemas (DEC-018) | Authoritative — all requests validated before controller |
| Mongoose | Schema `required`, `enum`, `min` | Database-level guard |

**Rule:** Never trust client-provided data. Validate every API input server-side with Zod before it reaches a service or repository.

**Zod validation middleware** parses the request body against the route's schema. If validation fails, a `400 VALIDATION_ERROR` response is returned immediately — the request never reaches the service layer.

---

## 8. NoSQL Injection Prevention (MongoDB-specific)

> **Replaces v1.0 SQL injection section.** MongoDB does not use SQL, but has its own injection vectors.

### Threat: Operator Injection
MongoDB queries accept operators like `$where`, `$gt`, `$regex`. An attacker can inject these via JSON bodies if inputs are used directly in queries.

**Example attack:**
```json
{ "email": { "$gt": "" } }
```
This would match all users if passed directly to `User.findOne({ email: req.body.email })`.

**Prevention:**
1. **Zod validation** at the API boundary — schema declares `email: z.string().email()`. Any non-string value (like an object `{ $gt: "" }`) fails Zod validation before reaching the database.
2. **Never construct queries from raw user input** — the repository layer builds query objects explicitly, not by spreading request bodies.
3. **`mongoose-sanitize` or equivalent** middleware strips `$` and `.` from keys as a defense-in-depth measure.

### Threat: `$where` / JavaScript execution
Mongoose has `allowDiskUse` and `$where` query operators that execute JavaScript server-side.

**Prevention:**
- Never use `$where` operator in application code.
- Set `{ allowDiskUse: false }` unless explicitly required for analytics queries.

### Threat: Mass Assignment
If Mongoose model instances are populated directly from request bodies, unexpected fields may be written.

**Prevention:**
- Zod schema defines the exact allowed shape. Only validated, typed fields reach the repository.
- Repositories explicitly list fields in create/update operations — no `Object.assign(doc, req.body)` pattern.

### Rule (replaces v1.0 TC-011):
> **Never pass raw user input objects directly into Mongoose query methods or model constructors. Always validate with Zod first, then explicitly construct the query or document.**

---

## 9. CORS Configuration

```
Allowed origins: https://www.rawaqa.example.com (production)
                 http://localhost:8000 (development)
Methods: GET, POST, PATCH, DELETE, OPTIONS
Headers: Content-Type, Authorization, Accept-Language, X-Session-ID
Credentials: true (for HttpOnly refresh token cookie)
```

Configured in Express using the `cors` package with an explicit origin allowlist from `CORS_ORIGINS` environment variable.

---

## 10. Rate Limiting

| Endpoint Group | Limit | Rationale |
|----------------|-------|-----------|
| `POST /auth/login` | 10 req/min/IP | Brute force prevention |
| `POST /auth/register` | 10 req/min/IP | Account enumeration prevention |
| `POST /orders` | 5 req/min/IP | Checkout abuse prevention |
| Public catalog (`GET /products`) | 100 req/min/IP | Scraping mitigation |
| Admin APIs | 60 req/min/user | Reasonable operational limit |

Implemented with `express-rate-limit` using a Redis store (`rate-limit-redis`) for consistency across multiple process instances.

---

## 11. Sensitive Data Handling

| Data Type | Handling |
|-----------|---------|
| `passwordHash` | Never returned in API responses; excluded at repository level |
| Phone number | Partially masked in logs: `+2010****5678` |
| Full API keys (Odoo, SMS) | Never logged; loaded from env only |
| `refreshTokenHash` | Stored as bcrypt hash; original token never stored |
| `customerSnapshot` | Stored in order (required for fulfillment); access restricted to owning user and admin |
| Integration log payloads | API keys redacted; phones masked before storage |

---

## 12. Admin Security

- Admin login uses the same `/api/auth/login` endpoint
- Admin JWT contains `role: 'admin'` in payload
- `adminOnly` middleware validates `role === 'admin'` on every `/api/admin/*` request
- Admin panel not linked from customer-facing site (no `<a>` to admin from customer pages)
- Optional IP allowlist for admin routes — configurable, not implemented at MVP
- Audit log for admin order status changes: stored in `orders.statusHistory`

---

## 13. OWASP Top 10 — MongoDB Context

| Risk | Mitigation |
|------|------------|
| A01 Broken Access Control | Role check in middleware; user can only access own orders |
| A02 Cryptographic Failures | bcrypt passwords; HTTPS enforced; JWT HS256+ |
| A03 Injection | Zod validation at boundary; explicit query construction; no `$where` |
| A04 Insecure Design | Repository pattern prevents mass assignment; service layer enforces business rules |
| A05 Security Misconfiguration | `.env` not committed; CORS allowlist; secrets in env |
| A06 Vulnerable Components | Pin npm package versions; audit regularly |
| A07 Auth Failures | JWT expiry 15m; rate limiting; token rotation |
| A08 Software/Data Integrity | Mongoose schema validation; Zod input validation |
| A09 Logging Failures | Pino structured logs; sensitive field redaction |
| A10 SSRF | Odoo/SMS requests go to configured env URLs only; never to user-provided URLs |

---

## 14. Security Headers (Production)

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' fonts.googleapis.com; font-src fonts.gstatic.com
Referrer-Policy: strict-origin-when-cross-origin
```

---

## 15. Security Testing Checklist

- [ ] Auth bypass attempts on admin routes
- [ ] NoSQL operator injection on login (`{ "$gt": "" }`)
- [ ] NoSQL operator injection on product search
- [ ] Mass assignment attempt on user registration
- [ ] XSS in product names (admin-created content)
- [ ] Rate limit verification on login and checkout
- [ ] JWT tampering rejected
- [ ] Customer cannot access another customer's orders
- [ ] Guest sessionId cannot access authenticated order history
- [ ] Non-admin blocked from `/api/admin/*`
- [ ] Passwords never appear in Pino logs
- [ ] API keys redacted in integration logs
- [ ] `.env` not accessible via any HTTP route
- [ ] CORS rejects requests from disallowed origins

---

## Related Documents

- Auth design: `docs/03-architecture/Auth-Security.md`
- Environment variables: `docs/10-deployment/Environment-Configuration.md`
- Threat model: `docs/03-architecture/Threat-Model.md`
- API auth requirements: `docs/04-api/API-Design.md`

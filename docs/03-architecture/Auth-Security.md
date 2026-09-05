# Auth & Security — RAWAQA

> **Canonical security spec:** [../08-security/Security-Specification.md](../08-security/Security-Specification.md)

**Status:** Not Yet Implemented
**Last Updated:** 2026-09-02

> **⚠️ RESOLVED CONFLICT:** An earlier version of this document stated JWT expiry of "24 hours". The authoritative expiry per DEC-006 is **15 minutes (access token) / 7 days (refresh token)**. Do not implement 24h access tokens.

---

## Auth Decision

- **Method:** JWT Bearer tokens (15m access / 7d refresh) — DEC-006
- **Customer:** Register with email + phone + password
- **Admin:** Same `users` collection with `role: 'admin'`
- **Guest cart/checkout:** `X-Session-ID` header (UUID v4 issued by backend) — DEC-013

---

## Authentication Flows

### Register
`POST /auth/register` → Zod validate → bcrypt hash → save to MongoDB `users` → return access token

### Login
`POST /auth/login` → Zod validate → bcrypt.compare → issue JWT (15m) + refresh token (7d) → store refresh token hash in `user.refreshTokenHash`

### Protected Routes
Middleware verifies JWT, attaches `{ userId, role }` to request context, checks role for admin routes.

### Guest Routes
Middleware checks `X-Session-ID` header (UUID v4). Valid session → guest cart/checkout flow. Invalid/absent → 401 on protected endpoints.

---

## Session Security

| Control | Setting |
|---------|---------|
| JWT access token expiry | **15 minutes** (DEC-006 — authoritative) |
| JWT refresh token expiry | **7 days** (DEC-006) |
| Refresh token storage | Hash in `users.refreshTokenHash` (MongoDB) |
| Password hash | bcrypt cost ≥ 12 |
| HTTPS | Required in production |
| Refresh token cookie | HttpOnly, Secure, SameSite=Lax |

---

## RBAC Model (MVP)

| Role | Permissions |
|------|-------------|
| customer | Own cart, orders, profile |
| admin | All `/api/admin/*` routes |
| public | Catalog, track order |
| guest (sessionId) | Cart, checkout — no order history |

---

## Endpoint Authorization Matrix

| Endpoint | Public | Guest (X-Session-ID) | Customer (JWT) | Admin (JWT role:admin) |
|----------|--------|---------------------|---------------|----------------------|
| GET /products | ✓ | ✓ | ✓ | ✓ |
| POST /cart/items | — | ✓ | ✓ | — |
| POST /orders | — | ✓ | ✓ | — |
| GET /orders | — | — | own only | — |
| /api/admin/* | — | — | — | ✓ |

---

## CSRF

- JWT in Authorization header: CSRF not required for API-only SPA  
- If session cookies used for auth: add CSRF token  

---

## Security Testing Checklist

- [ ] Brute force login rate limited  
- [ ] JWT tampering rejected  
- [ ] Customer cannot access other user's orders  
- [ ] Non-admin blocked from /admin  
- [ ] Passwords never in logs  

---

## Audit Logging

**Planned:** Log admin order status changes with user ID and timestamp.

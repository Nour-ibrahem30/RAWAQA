# AI-Rules — RAWAQA

**Last updated:** 2026-09-02 (v2.0 — MongoDB + TypeScript + bilingual sync)
**These rules apply to every AI coding agent working on this project.**
**They are non-negotiable. Read them before writing a single line of code.**

---

## Rule Category 1 — Source of Truth

### STR-01 — Never invent functionality
Do not implement features not in `docs/02-requirements/FRS.md`.

### STR-02 — Never claim a feature is implemented without code evidence
Verify in the actual repository. UI existing ≠ feature working.

### STR-03 — Never invent API endpoints
Use only endpoints defined in `docs/04-api/API-Design.md`. No new routes without a documented decision.

### STR-04 — Never invent database fields
Use only fields in `docs/05-database/ERD.md` and `docs/05-database/Data-Dictionary.md`. No new fields without a documented schema change.

### STR-05 — Never invent integration behavior
Odoo and SMS scope is bounded. See `docs/06-integrations/`. Do not add out-of-scope modules.

### STR-06 — Never invent environment variables or credentials
Full variable reference: `docs/10-deployment/Environment-Configuration.md`. Add new variables to `.env.example` and that document.

### STR-07 — Never silently resolve contradictions
If documentation contradicts code, or two docs contradict each other, follow the Conflict Rule below.

### STR-08 — Never change architecture without documenting the decision
Any architectural change must be recorded in `docs/00-ai/Decision-Log.md`.

### STR-09 — Prefer existing project patterns
Use the confirmed stack: Node.js + TypeScript + Express + MongoDB + Mongoose. Do not introduce new frameworks or ORMs without a decision.

### STR-10 — Check documentation before implementing
Use `docs/00-ai/Context-Index.md` to find the minimum required documents for any task.

---

## Rule Category 2 — Implementation Process

```
1. IDENTIFY   — What exactly is the task?
2. LOCATE     — Find relevant documentation (Context-Index.md)
3. INSPECT    — Read the current implementation in the codebase
4. CLASSIFY   — IMPLEMENTED / PARTIAL / NOT_IMPLEMENTED
5. DEPEND     — Check architecture, API, DB, localization dependencies
6. PLAN       — State what will change and why, before changing it
7. IMPLEMENT  — Smallest correct change satisfying the requirement
8. VALIDATE   — Run tests; verify nothing breaks
9. DOCUMENT   — Update docs if behavior, API, schema, or architecture changed
```

### IMR-01 — Smallest correct change
Do not refactor unrelated code. Do not add unrequested features.

### IMR-02 — Respect implementation status
`NOT_IMPLEMENTED` features: implement fully or leave untouched. No partial broken states.

### IMR-03 — Do not break existing frontend behavior
Currently working: SPA routing (`go()`), product grid, cart badge, toast notifications, mobile menu, scroll animations, accordion, language direction toggle.

### IMR-04 — Wire, do not duplicate
When connecting frontend to API, replace the static `PRODUCTS[]` array. Do not maintain both.

---

## Rule Category 3 — Conflict Resolution

### The Conflict Rule

```
Documentation ≠ Code
  ↓
Identify the conflict precisely
  ↓
Report: "Documentation says X. Code does Y."
  ↓
Check Source-of-Truth.md for authoritative source
  ↓
If clear → follow it; document resolution
  ↓
If not clear → FLAG; do NOT silently choose
  ↓
Add to Known-Issues.md if not already there
  ↓
Ask for a decision before proceeding
```

### Two-Docs Conflict Rule
Check `Source-of-Truth.md` for precedence. If unclear, flag both versions. Never merge conflicting requirements silently.

---

## Rule Category 4 — Security

### SEC-01 — Never expose secrets in frontend code
Must never appear in `index.html`, `js/main.js`, or any frontend file:
`MONGODB_URI`, `JWT_SECRET`, `REDIS_URL`, `ODOO_API_KEY`, `SMS_API_KEY`, any bearer token.

### SEC-02 — Never hardcode credentials
All credentials read from environment variables via `src/config/env.ts`.

### SEC-03 — Never commit `.env`
`.env` must be in `.gitignore`. Only `.env.example` with placeholder names is committed.

### SEC-04 — Validate on the server, not only on the client
All API inputs validated with Zod before reaching service or repository layer.

### SEC-05 — Prevent NoSQL injection (MongoDB-specific)
**Never pass raw user-input objects directly into Mongoose query methods.**
Zod schemas enforce that inputs are typed primitives (strings, numbers, booleans) — not arbitrary objects. Do not pattern: `Model.findOne({ email: req.body.email })` without Zod validation first. Use `mongoose-sanitize` as defense-in-depth.

> **Note:** This replaces the former SEC-05 "Parameterize all SQL queries" which applied to PostgreSQL. MongoDB is not SQL — the equivalent protection is Zod validation + explicit query construction.

### SEC-06 — Never log sensitive data
No `passwordHash`, full API keys, or full phone numbers in Pino logs. Phone: `+2010****5678`.

### SEC-07 — Hash passwords with bcrypt, cost ≥ 12
Never store plaintext or reversible passwords.

### SEC-08 — Protect admin routes
Every `/api/admin/*` endpoint must verify JWT with `role: 'admin'`. Frontend routing is not security.

### SEC-09 — Validate guest session identifiers
`X-Session-ID` header values must be validated as UUID v4 format. Reject non-UUID values with 400.

---

## Rule Category 5 — Integration Rules

### INT-01 — Odoo sync is asynchronous and non-blocking
`POST /orders` returns 201 before Odoo sync starts. Never await Odoo in the checkout path.

### INT-02 — SMS is asynchronous and non-blocking
SMS failure must never prevent order confirmation.

### INT-03 — Idempotent Odoo push
Check `order.odooOrderId` before pushing. If already set → skip.

### INT-04 — Idempotent SMS
Check `order.smsStatus`. If `'sent'` → skip.

### INT-05 — Do not implement out-of-scope Odoo features
Scope: `res.partner` + `sale.order` creation only. See `docs/06-integrations/Odoo-Integration-Specification.md`.

### INT-06 — SMS is adapter-based (DEC-022)
Use `SmsAdapter` interface. `ConsoleSmsAdapter` in dev. Real provider plugged in when DEC-004 resolved.

### INT-07 — Odoo is adapter-based (DEC-021)
Use `OdooAdapter` interface. `XmlRpcOdooAdapter` is the initial implementation.

---

## Rule Category 6 — Database Rules (MongoDB-specific)

### DB-01 — MongoDB is the only database
No PostgreSQL, no SQL, no Prisma, no `DATABASE_URL`. Use `MONGODB_URI`. (DEC-003-MONGODB)

### DB-02 — All DB access goes through repositories
Controllers and services must not import Mongoose models directly. Use the repository layer.

### DB-03 — Never pass raw request objects to Mongoose
Explicitly construct query objects and document objects. No `new Model(req.body)` without Zod validation.

### DB-04 — Embedded vs referenced follows the ERD
Do not embed what ERD says to reference, and vice versa. See `docs/05-database/ERD.md` Section 2 for the decision rationale of each collection.

### DB-05 — Order documents are immutable after creation
Only `status`, `odooSyncStatus`, `smsStatus`, `odooOrderId`, and `statusHistory` may change. Line items, snapshots, and totals are frozen.

### DB-06 — Monetary values are numbers
Store and transmit prices as numeric EGP (`3450`). Never formatted strings (`"EGP 3,450"`).

---

## Rule Category 7 — Localization Rules

### L10N-01 — Arabic + English from MVP — not optional
Both languages must be supported at launch (DEC-015). Do not ship English-only or Arabic-only.

### L10N-02 — Use the LocalizedString pattern
All human-readable fields that differ between languages use `{ ar: string, en: string }` in MongoDB. Never duplicate documents per language.

### L10N-03 — Customer API returns resolved string; admin API returns both
`GET /api/products` with `Accept-Language: ar` returns `name: "الكرسي السحابي"`.
`GET /api/admin/products` returns `name: { ar: "...", en: "..." }`.

### L10N-04 — Default language is Arabic (DEC-023)
When `Accept-Language` is absent or unsupported, return Arabic content.

### L10N-05 — RTL is a layout requirement, not just a text attribute
Changing `dir="rtl"` alone is insufficient. See `docs/03-architecture/Localization-Architecture.md` for full RTL requirements covering navigation, forms, icons, pagination, and spacing.

### L10N-06 — Language persistence is OPEN (DEC-024)
Do not invent a persistence mechanism. Use `localStorage` as the interim default until DEC-024 is resolved.

---

## Rule Category 8 — Frontend Rules

### FE-01 — Preserve the design system
CSS variables (`--charcoal`, `--ivory`, `--gold`, typography) must not change without client approval.

### FE-02 — API base URL must be configurable
`window.RAWAQA_CONFIG.API_BASE_URL` — not hardcoded.

### FE-03 — No secrets in frontend ever
Restated: anything in frontend JS is visible to any user.

### FE-04 — Dead UI controls must be wired or hidden
Filters, sort, search, cart quantity controls, "Buy Now" — wire correctly or hide until ready.

### FE-05 — Replace static data, do not duplicate it
Remove `PRODUCTS[]` array when API is connected. Do not maintain both.

### FE-06 — Send Accept-Language on all API requests
The frontend `api.js` fetch wrapper must attach `Accept-Language: ar` or `Accept-Language: en` based on current language state.

### FE-07 — Send X-Session-ID on cart and checkout requests (guest flow)
Store `sessionId` returned by first cart response. Send as `X-Session-ID` header on subsequent cart/checkout requests.

---

## Rule Category 9 — Documentation Rules

### DOC-01 — Update docs when behavior changes
API, schema, architecture, env vars, or major UX flow changes → update relevant docs in same PR.

### DOC-02 — Do not modify canonical docs without necessity
`docs/01-product/` through `docs/12-client-proposal/` are client-facing. Update only when facts change.

### DOC-03 — Record architectural decisions
Backend stack, DB, auth, caching, deployment, integration → `docs/00-ai/Decision-Log.md`.

### DOC-04 — Record new known issues
New gap, contradiction, or problem → `docs/00-ai/Known-Issues.md`.

---

## Rule Category 10 — Scope Rules

### SCO-01 — COD is the only payment method at launch
No Paymob, Fawry, Stripe. Payment gateway requires a Change Request.

### SCO-02 — Single admin role for MVP
No multi-role RBAC.

### SCO-03 — Do not add features not in FRS
Post-MVP features are in `docs/01-product/Roadmap.md` — do not implement during current engagement.

### SCO-04 — Backend stack is confirmed
Node.js + TypeScript + Express (DEC-002). Do not scaffold in Python, PHP, or any other language.

> **Note:** SCO-04 is updated. The former version stated "backend stack is not decided." DEC-002 is now Accepted.

---

## Quick Violation Check

Before submitting any change:

- [ ] Read relevant documentation for this task
- [ ] Inspected actual current code
- [ ] No invented API endpoints, DB fields, or integration behavior
- [ ] No hardcoded credentials or secrets
- [ ] No `.env` added to git
- [ ] No broken existing frontend behavior
- [ ] No features outside agreed scope
- [ ] No raw user-input objects passed directly to Mongoose
- [ ] Monetary values are numeric, not formatted strings
- [ ] Localized fields use `{ ar, en }` pattern
- [ ] `Accept-Language` and `X-Session-ID` handled correctly
- [ ] Updated docs if behavior or architecture changed
- [ ] New conflicts or issues added to Known-Issues.md

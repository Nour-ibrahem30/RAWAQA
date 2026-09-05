# Task-Routing — RAWAQA

**Decision trees and routing logic for AI coding agents.**
**Last updated:** 2026-09-02 (v2.0 — MongoDB + bilingual + guest checkout)

---

## Master Decision Tree

```
Receive a task
       ↓
Is it in docs/02-requirements/FRS.md?
    ┌──┴──┐
   YES    NO
    ↓      ↓
Proceed  In docs/01-product/Roadmap.md (post-MVP)?
              ┌──┴──┐
             YES    NO
              ↓      ↓
           STOP   STOP — not in scope
           post-  Add to Known-Issues.md
           MVP    Do not implement
    ↓
Currently implemented? (check Current-State.md)
    ┌──────────────┬──────────────┐
   YES          PARTIAL        NO
    ↓               ↓              ↓
Working?    Find the gap      Check Decision-Log.md
 YES  NO    Read relevant     for blockers
  ↓    ↓    docs; implement   All stacks decided?
Done  Fix   the gap                ↓ YES
it    it                     Use Context-Index.md
                              Read minimum docs
                              Implement
```

---

## Backend Task Routing

```
Backend task received
       ↓
Stack confirmed (DEC-002: Node.js + TypeScript + Express) ← YES
       ↓
Read: docs/04-api/API-Design.md
       ↓
Read: docs/05-database/ERD.md  (MongoDB collections)
       ↓
Read: docs/08-security/Security-Specification.md
       ↓
Does task involve localized content?
    ↓ YES → Also read:
    docs/03-architecture/Localization-Architecture.md
       ↓
Does task involve orders?
    ↓ YES → Also read:
    docs/06-integrations/Odoo-Integration-Specification.md
    docs/06-integrations/SMS-Integration-Specification.md
       ↓
Implement → Test → Update docs if API/schema/behavior changed
```

---

## Database Task Routing (MongoDB)

```
Database task received
       ↓
Read: docs/05-database/ERD.md        ← MongoDB schema authority
       ↓
Read: docs/05-database/Data-Dictionary.md
       ↓
Confirm: DEC-003-MONGODB (MongoDB confirmed — no SQL, no Prisma)
       ↓
Is this a schema change?
    ┌──┴──┐
   YES    NO
    ↓      ↓
Must update:  Proceed
docs/05-database/ERD.md
docs/05-database/Data-Dictionary.md
       ↓
Does localized field change? → Also update Localization-Architecture.md
Does API shape change? → Also update API-Design.md
```

---

## Frontend Task Routing

```
Frontend task received
       ↓
Read: docs/04-ux-and-flows/UX-Flows.md
       ↓
Read: docs/02-requirements/FRS.md
       ↓
Read: docs/00-ai/Current-State.md
       ↓
Inspect: index.html, css/styles.css, js/main.js
       ↓
Does task involve language / RTL?
    ↓ YES → Read:
    docs/03-architecture/Localization-Architecture.md
       ↓
Does task involve API connection?
    ↓ YES → Does the API exist yet?
    ┌──┴──┐
   YES    NO
    ↓      ↓
Wire it  Flag in Known-Issues.md
         Use static data as interim
```

---

## Localization Task Routing

```
Localization task received
       ↓
Read: docs/03-architecture/Localization-Architecture.md  ← COMPLETE SPEC
       ↓
Read: docs/05-database/ERD.md  ← LocalizedString pattern
       ↓
Read: docs/04-api/API-Design.md ← Language Negotiation section
       ↓
Check: DEC-015 (ar+en from MVP), DEC-023 (default=ar), DEC-024 (persistence OPEN)
       ↓
Is this a database field change?
    ↓ YES → Update ERD.md + Data-Dictionary.md
       ↓
Is this an API response change?
    ↓ YES → Update API-Design.md + openapi.yaml
       ↓
Is this an SMS template change?
    ↓ YES → Update SMS-Integration-Specification.md
       ↓
Is this a frontend direction/font change?
    ↓ YES → Review Localization-Architecture.md Section 6 (RTL requirements)
    Do not change CSS design system variables
```

---

## Guest Checkout Task Routing

```
Guest checkout / cart task received
       ↓
Read: docs/00-ai/Decision-Log.md → DEC-013 (guest checkout enabled)
       ↓
Read: docs/04-api/API-Design.md → Guest Session Pattern section
       ↓
Read: docs/05-database/ERD.md → carts (userId nullable, sessionId, TTL)
       ↓
Read: docs/05-database/ERD.md → orders (userId nullable, customerSnapshot)
       ↓
Is this a security concern about session IDs?
    ↓ YES → Read: docs/08-security/Security-Specification.md Section 5
       ↓
Implement:
  - Backend issues sessionId UUID on first guest cart creation
  - Client stores sessionId, sends as X-Session-ID header
  - Cart endpoints accept JWT or X-Session-ID
  - POST /orders accepts JWT or X-Session-ID
  - Guest orders: userId=null, customerSnapshot required
```

---

## Integration Task Routing (Odoo)

```
Odoo task received
       ↓
Read: docs/06-integrations/Odoo-Integration-Specification.md (fully)
       ↓
Check: docs/00-ai/Known-Issues.md → ISSUE-012
Are Odoo credentials available? (DEC-016 OPEN)
    ┌──┴──┐
   YES    NO
    ↓      ↓
Proceed  Build against OdooAdapter interface
to full  (XmlRpcOdooAdapter scaffolded without real connection)
impl.    Flag DEC-016 as pending blocker
       ↓
Check: In Odoo integration scope?
(scope = res.partner + sale.order only — IC-001)
    ┌──┴──┐
   YES    NO
    ↓      ↓
Proceed  STOP — out of scope
         Add to Known-Issues as Change Request
       ↓
Implement with:
  - OdooAdapter interface (DEC-021)
  - Idempotency check (odooOrderId — IC-002)
  - BullMQ async queue (DEC-017)
  - Max 4 retries, exponential backoff (IC-003)
```

---

## Integration Task Routing (SMS)

```
SMS task received
       ↓
Read: docs/06-integrations/SMS-Integration-Specification.md (fully)
       ↓
Read: docs/03-architecture/Localization-Architecture.md → SMS templates section
       ↓
Check: DEC-022 (ConsoleSmsAdapter for dev — unblocked)
       ↓
SMS_ENABLED env var: false in dev → ConsoleSmsAdapter logs to stdout
       ↓
Implement with:
  - SmsAdapter interface (IC-007)
  - ConsoleSmsAdapter (dev/test)
  - Phone normalization: 01x → +20x (IC-006)
  - Idempotency: check smsStatus (INT-04)
  - Language selection: ar or en template
  - BullMQ async queue (DEC-017)
       ↓
Real provider adapter: implement when DEC-004 resolved
```

---

## Security Task Routing

```
Security task received
       ↓
Read: docs/08-security/Security-Specification.md (v2.0 — NoSQL section)
       ↓
Read: docs/03-architecture/Auth-Security.md
       ↓
Read: docs/00-ai/AI-Rules.md → SEC-01 to SEC-09
       ↓
Read: docs/00-ai/Constraints.md → SC-001 to SC-008
       ↓
Is this an auth change?
    ↓ YES → Read: docs/03-architecture/Threat-Model.md
       ↓
Does this touch Mongoose queries?
    ↓ YES → Verify NoSQL injection prevention (SEC-05, DB-03)
    Confirm Zod validation before any Mongoose call
       ↓
Does this add/change environment secrets?
    ↓ YES → Update:
    docs/10-deployment/Environment-Configuration.md
    .env.example
```

---

## Conflict Resolution Routing

```
Conflict detected (doc A ≠ doc B, or doc ≠ code)
       ↓
Read: docs/00-ai/Source-of-Truth.md
       ↓
Is it a PostgreSQL vs MongoDB conflict?
    ↓ YES → MongoDB wins (DEC-003-MONGODB). Update stale doc.
       ↓
Is it a JWT expiry conflict (24h vs 15m)?
    ↓ YES → 15m access / 7d refresh wins (DEC-006). Update stale doc.
       ↓
Is it a general conflict?
    ↓
Authority clear in Source-of-Truth.md?
    ┌──┴──┐
   YES    NO
    ↓      ↓
Follow it  FLAG both versions
Note in    Add to Known-Issues.md
Known-     Ask for human decision
Issues     Do NOT choose silently
```

---

## Quick Classification

| Question | Route |
|----------|-------|
| What's in scope? | FRS.md → Scope.md |
| What does the endpoint look like? | API-Design.md → openapi.yaml |
| What does the collection look like? | ERD.md → Data-Dictionary.md |
| Is this implemented? | Current-State.md |
| Which language to use? | Localization-Architecture.md |
| Has this decision been made? | Decision-Log.md |
| Is this a known problem? | Known-Issues.md |
| Which doc is authoritative? | Source-of-Truth.md |
| What docs do I need? | Context-Index.md |
| Is this post-MVP? | Roadmap.md |
| Is guest checkout supported? | DEC-013 — YES |
| Is Arabic required at MVP? | DEC-015 — YES |
| What database? | MongoDB (DEC-003-MONGODB) |
| What backend stack? | Node.js + TypeScript + Express (DEC-002) |

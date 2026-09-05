# Known-Issues — RAWAQA

**Central registry of known problems, gaps, and documentation conflicts.**
**Last updated:** 2026-09-02 (v2.0 — architecture sync; ISSUE-007, ISSUE-009, ISSUE-010, ISSUE-014 resolved)

---

## Open Issues

---

## ISSUE-001

**Issue ID:** ISSUE-001
**Title:** Cart badge initializes at 2 (hardcoded) instead of 0
**Severity:** Medium | **Status:** Open
**Current Behavior:** Cart counter always starts at `2` on page load.
**Expected Behavior:** Start at `0`; initialize from `GET /api/cart` when backend exists.
**Related Code:** `js/main.js` — `let cartCount = 2;`
**Related Documentation:** `docs/02-requirements/FRS.md` FR-007

---

## ISSUE-002

**Issue ID:** ISSUE-002
**Title:** Checkout button shows toast placeholder — no checkout flow exists
**Severity:** Critical | **Status:** Open
**Current Behavior:** Clicking checkout shows a toast message only.
**Expected Behavior:** Full checkout form + `POST /api/orders` integration.
**Related Code:** `js/main.js` checkout handler
**Related Documentation:** `docs/02-requirements/FRS.md` FR-009, FR-010

---

## ISSUE-003

**Issue ID:** ISSUE-003
**Title:** Track order shows hardcoded demo data only (RWQ-10482)
**Severity:** High | **Status:** Open
**Current Behavior:** Only `RWQ-10482` works; always shows "Out for delivery."
**Expected Behavior:** Real API call to `GET /api/orders/track/:orderNumber`.
**Related Code:** `js/main.js` `trackOrder()`
**Related Documentation:** `docs/02-requirements/FRS.md` FR-015

---

## ISSUE-004

**Issue ID:** ISSUE-004
**Title:** Shop filters and sort controls are dead UI (no JS handler)
**Severity:** High | **Status:** Open
**Current Behavior:** Category checkboxes and sort dropdown have no event handlers.
**Expected Behavior:** Filter product grid; wire to `GET /api/products?category=...&sort=...`
**Related Code:** `index.html #page-shop`; `js/main.js` — no filter handler
**Related Documentation:** `docs/02-requirements/FRS.md` FR-005

---

## ISSUE-005

**Issue ID:** ISSUE-005
**Title:** Product search button has no handler
**Severity:** High | **Status:** Open
**Current Behavior:** Search button present; zero click handler.
**Expected Behavior:** Wire to `GET /api/products?q=...` or interim client-side search.
**Related Code:** `index.html`; `js/main.js`
**Related Documentation:** `docs/02-requirements/FRS.md` FR-004
**Recommended Resolution:** Hide button until backend search is implemented.

---

## ISSUE-006

**Issue ID:** ISSUE-006
**Title:** Cart page quantity controls and remove buttons not wired
**Severity:** High | **Status:** Open
**Current Behavior:** +/− quantity buttons and remove links have no handlers.
**Expected Behavior:** Wire to `PATCH /api/cart/items/:id` and `DELETE /api/cart/items/:id`.
**Related Code:** `index.html #page-cart`
**Related Documentation:** `docs/02-requirements/FRS.md` FR-008

---

## ISSUE-008

**Issue ID:** ISSUE-008
**Title:** Product prices in static JS array are formatted strings — not parseable for calculations
**Severity:** High | **Status:** Open
**Current Behavior:** `PRODUCTS[]` stores prices as `"EGP 3,450"`.
**Expected Behavior:** Prices stored as numbers (`3450`). API and MongoDB use numeric EGP. Display formatting is a frontend concern.
**Impact:** Any cart total arithmetic currently produces NaN.
**Related Code:** `js/main.js` `PRODUCTS` array
**Related Documentation:** `docs/05-database/ERD.md`, `docs/04-api/API-Design.md` (money standard)
**Recommended Resolution:** Fix static array to `3450` as interim; replace with API when backend exists.

---

## ISSUE-009

**Issue ID:** ISSUE-009
**Title:** No backend exists — 8 of 10 FRS feature groups are blocked
**Severity:** Critical | **Status:** Open
**Current Behavior:** No server-side code, no database, no API.
**Recommended Resolution:** Scaffold Node.js + TypeScript + Express backend per DEC-002. DEC-002 is now resolved — backend stack is confirmed. Implementation can begin.
**Note:** Stack decision resolved. This issue is now a work-item, not a decision blocker.

---

## ISSUE-011

**Issue ID:** ISSUE-011
**Title:** SMS provider not selected — real SMS delivery cannot begin
**Severity:** High | **Status:** Open
**Current Behavior:** No provider selected.
**Impact:** Real SMS delivery blocked. Development is unblocked via `ConsoleSmsAdapter` (DEC-022).
**Recommended Resolution:** Resolve DEC-004. Client must select provider and supply API key + sender ID.

---

## ISSUE-012

**Issue ID:** ISSUE-012
**Title:** Odoo credentials not provided — Odoo integration cannot connect
**Severity:** High | **Status:** Open
**Current Behavior:** No Odoo URL, DB name, username, or API key from client.
**Impact:** Integration development can proceed against adapter interface; real connection blocked until credentials arrive.
**Recommended Resolution:** Resolve DEC-016. Client must provide Odoo test environment access.

---

## ISSUE-013

**Issue ID:** ISSUE-013
**Title:** Real product images do not exist
**Severity:** Medium | **Status:** Open
**Current Behavior:** All product images are inline SVG shapes.
**Impact:** Cannot launch. Marketing and UX quality blocked.
**Recommended Resolution:** Client to supply product images. Object storage must be configured.

---

## ISSUE-015

**Issue ID:** ISSUE-015
**Title:** `.env.example` is empty — environment variable reference is missing
**Severity:** Medium | **Status:** Open
**Current Behavior:** `.env.example` exists but contains no variables.
**Impact:** Any developer setting up the backend has no reference.
**Recommended Resolution:** Populate `.env.example` per `docs/10-deployment/Environment-Configuration.md`. Template is now defined in that document — can be applied when backend is scaffolded.

---

## ISSUE-016

**Issue ID:** ISSUE-016
**Title:** Language persistence mechanism not decided (DEC-024 OPEN)
**Severity:** Medium | **Status:** Open
**Current Behavior:** `toggleLang()` in `main.js` changes `dir`/`lang` attributes. No persistence between sessions.
**Expected Behavior:** User's language choice persists across visits.
**Impact:** Without persistence, language resets to Arabic on every page load; English users have a degraded experience.
**Related Documentation:** `docs/03-architecture/Localization-Architecture.md`
**Recommended Resolution:** Resolve DEC-024. Recommended interim: `localStorage`. Implement when frontend API client is built.

---

## ISSUE-017

**Issue ID:** ISSUE-017
**Title:** Arabic product content does not exist — seed data is English-only
**Severity:** High | **Status:** Open
**Current Behavior:** All 8 products in `js/main.js` `PRODUCTS[]` have English names and descriptions only.
**Expected Behavior:** All products require Arabic (`ar`) and English (`en`) content for `name`, `description`, and `longDescription` fields (DEC-015).
**Impact:** Cannot seed the MongoDB database with correct bilingual content without Arabic copy. Cannot go live with Arabic-only placeholder content.
**Related Documentation:** `docs/05-database/ERD.md` (LocalizedString pattern), `docs/03-architecture/Localization-Architecture.md`
**Recommended Resolution:** Client must provide Arabic product names, descriptions, and category names for all 8 products before seeding the database.

---

## Resolved Issues

---

### ISSUE-007 — RESOLVED (2026-09-02)

**Issue ID:** ISSUE-007
**Title:** Language toggle changes direction only — no Arabic content exists
**Previous Status:** Open
**Resolution:** DEC-015 accepted — Arabic + English are required from MVP. DEC-023 establishes Arabic as default. Full localization architecture documented in `docs/03-architecture/Localization-Architecture.md`. The `toggleLang()` function in `main.js` is the UI hook — it will be wired to proper language state and API `Accept-Language` when the frontend API client is built. New tracking issues: ISSUE-016 (language persistence) and ISSUE-017 (Arabic content from client).

---

### ISSUE-010 — RESOLVED (2026-09-02)

**Issue ID:** ISSUE-010
**Title:** Backend stack decision unresolved
**Previous Status:** Open — Critical blocker
**Resolution:** DEC-002 accepted on 2026-09-02 — Node.js + TypeScript + Express. Backend scaffolding can begin. See Decision-Log.md DEC-002.

---

### ISSUE-014 — RESOLVED (2026-09-02)

**Issue ID:** ISSUE-014
**Title:** Guest checkout policy unresolved — database design could not be finalized
**Previous Status:** Open — High severity
**Resolution:** DEC-013 accepted on 2026-09-02 — Guest checkout is enabled. `userId` is nullable on `carts` and `orders`. Guest sessions identified by `X-Session-ID` UUID. Schema finalized in `docs/05-database/ERD.md`. Checkout API updated in `docs/04-api/API-Design.md`.

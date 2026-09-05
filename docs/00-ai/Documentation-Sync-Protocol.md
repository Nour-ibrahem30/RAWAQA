# Documentation-Sync-Protocol — RAWAQA

**Rules preventing documentation from becoming stale. Last updated:** 2026-09-02

---

## The Core Problem

Documentation becomes stale when code changes faster than docs are updated. In an AI-assisted project this is especially dangerous because AI agents make decisions based on documentation — stale docs lead to wrong implementations.

**This protocol defines exactly when and how documentation must be updated.**

---

## Trigger 1 — Code Changes → Documentation Must Update

### API Changes

If any of these occur:

| Code Change | Required Doc Updates |
|-------------|---------------------|
| New endpoint added | `docs/04-api/API-Design.md` → add endpoint section<br>`docs/04-api/openapi.yaml` → add path |
| Endpoint path changed | Update both files above. Update `docs/00-ai/Context-Index.md` if routing references it. |
| HTTP method changed | Update both files above. |
| Request body changed | Update `openapi.yaml` schema. Update API-Design.md example. |
| Response schema changed | Update `openapi.yaml` schema. Update API-Design.md example. |
| Endpoint removed | Remove from both files. Add deprecation note if it was public. |
| Auth requirement changed on endpoint | Update `API-Design.md`, `openapi.yaml` security section, `Auth-Security.md` |
| New error code added | Update `API-Design.md` error section, `openapi.yaml` responses |

**Verification step:** After any backend route change, run: `diff your openapi.yaml against actual implemented routes`. If they differ, update `openapi.yaml`.

---

### Database Changes

| Code Change | Required Doc Updates |
|-------------|---------------------|
| New table | `docs/05-database/ERD.md` → add entity and relationships<br>`docs/05-database/Data-Dictionary.md` → add all fields |
| New column | `docs/05-database/ERD.md` → add to entity<br>`docs/05-database/Data-Dictionary.md` → add field entry |
| Column renamed | Both files above. Check `docs/04-api/API-Design.md` for field references. |
| Column type changed | Both files above. Note migration implications. |
| Table removed | Both files above. Note which FRs it served. |
| New index added | `docs/03-architecture/Indexing-Strategy.md` |
| Enum value added/removed | `docs/05-database/Data-Dictionary.md` |

---

### Authentication / Security Changes

| Code Change | Required Doc Updates |
|-------------|---------------------|
| New auth mechanism | `docs/03-architecture/Auth-Security.md`<br>`docs/08-security/Security-Specification.md`<br>`docs/00-ai/Architecture-Summary.md` (auth section) |
| Token expiry changed | `docs/03-architecture/Auth-Security.md` |
| New protected route | `docs/04-api/API-Design.md` (auth requirement)<br>`docs/04-api/openapi.yaml` (security field) |
| Password policy changed | `docs/08-security/Security-Specification.md` |

---

### Integration Changes

| Code Change | Required Doc Updates |
|-------------|---------------------|
| Odoo field mapping changed | `docs/06-integrations/Odoo-Integration-Specification.md` |
| Odoo retry policy changed | `docs/06-integrations/Odoo-Integration-Specification.md` |
| SMS template changed | `docs/06-integrations/SMS-Integration-Specification.md` |
| SMS provider changed | `docs/06-integrations/SMS-Integration-Specification.md`<br>`docs/00-ai/Decision-Log.md` (DEC-004) |
| New integration added | New spec file in `docs/06-integrations/`<br>`docs/00-ai/Context-Index.md` entry<br>`docs/00-ai/Architecture-Summary.md` |

---

### Environment Variable Changes

| Code Change | Required Doc Updates |
|-------------|---------------------|
| New env var | `docs/10-deployment/Environment-Configuration.md` → add row<br>`.env.example` → add placeholder |
| Env var renamed | Both files above. Search codebase for old name. |
| Env var removed | Both files above. |
| Default value changed | `docs/10-deployment/Environment-Configuration.md` |

---

### Deployment / Infrastructure Changes

| Code Change | Required Doc Updates |
|-------------|---------------------|
| New deployment step | `docs/10-deployment/Deployment-Operations.md` |
| Docker config changed | `docs/10-deployment/Deployment-Operations.md` |
| Hosting provider selected | `docs/00-ai/Decision-Log.md` (DEC-014 → mark Accepted)<br>`docs/10-deployment/Deployment-Operations.md` |
| CI/CD pipeline added | `docs/10-deployment/Deployment-Operations.md` |

---

### Implementation Status Changes

Whenever a feature transitions status:

```
NOT_IMPLEMENTED → PARTIALLY_IMPLEMENTED
NOT_IMPLEMENTED → IMPLEMENTED
PARTIALLY_IMPLEMENTED → IMPLEMENTED
INTEGRATION_REQUIRED → IMPLEMENTED
```

Update: `docs/00-ai/Current-State.md` — update the Status and Evidence columns.

---

## Trigger 2 — Requirements Change → Find All Affected Layers

When a functional or technical requirement changes:

```
Requirement changed (docs/02-requirements/FRS.md)
       ↓
Find affected implementation
       ↓
Find affected API endpoints (docs/04-api/API-Design.md)
       ↓
Find affected database tables/columns (docs/05-database/ERD.md)
       ↓
Find affected tests (docs/09-testing/)
       ↓
Find affected integrations (Odoo or SMS specs)
       ↓
Find affected UX flows (docs/04-ux-and-flows/UX-Flows.md)
       ↓
Update all affected layers simultaneously
       ↓
Update docs/00-ai/Current-State.md
```

**Do not update requirements without tracing the impact forward.** A requirement change without an impact analysis creates undetected contradictions.

---

## Trigger 3 — Decisions Made → Decision-Log.md Must Update

When any open decision from `Decision-Log.md` is resolved:

```
Decision resolved
       ↓
Update Decision-Log.md: Status → Accepted
Add: Date, Reason, Impact
       ↓
Find all documents that referenced the open decision
       ↓
Update those documents to reflect the confirmed choice
       ↓
If it was a CONFLICTING decision: resolve the conflict in Source-of-Truth.md
       ↓
Update Known-Issues.md if the decision resolves a known issue
```

---

## Trigger 4 — Issues Resolved → Known-Issues.md Must Update

When a known issue is fixed:

```
Issue resolved
       ↓
Update docs/00-ai/Known-Issues.md
  → Change Status to: Resolved
  → Add: Resolution description, date
       ↓
Update docs/00-ai/Current-State.md if implementation status changed
       ↓
Verify no other Known Issues reference this as a dependency
```

---

## Staleness Detection

When starting a new task, check for staleness:

```
1. Read Current-State.md
2. Inspect the actual code for the feature area
3. If status in Current-State.md ≠ actual code state:
   → Current-State.md is stale
   → Update it before proceeding
   → Do not use stale status as a basis for decisions
```

---

## Documentation Review Points

At these milestones, do a full documentation sync check:

| Milestone | Check |
|-----------|-------|
| Backend scaffolding complete | Verify Architecture-Summary.md matches actual stack |
| First API endpoint deployed | Verify openapi.yaml matches actual routes |
| Database schema created | Verify ERD.md matches actual schema |
| First integration working | Verify integration spec matches actual behavior |
| Feature complete (per FRS) | Update Current-State.md status |
| Pre-launch | Full audit: every doc vs actual code |

---

## The Sync Checklist (per PR)

Before merging any PR that touches implementation:

```
□ Does this change affect any API? → Update API-Design.md + openapi.yaml
□ Does this change affect the database? → Update ERD.md + Data-Dictionary.md
□ Does this change affect auth? → Update Auth-Security.md
□ Does this change affect any integration? → Update relevant spec
□ Does this change add/remove an env var? → Update env docs + .env.example
□ Does this change affect deployment? → Update Deployment-Operations.md
□ Does this change affect business rules? → Update FRS.md + AI-Context.md
□ Does this change resolve a Known Issue? → Update Known-Issues.md
□ Does this change complete a feature? → Update Current-State.md
□ Does this change make an implicit decision? → Update Decision-Log.md
□ Does this change introduce a new conflict? → Add to Known-Issues.md
```

If all boxes are unchecked → no documentation update needed for this PR.  
If any box is checked → update the relevant docs in the same PR.

# Change-Protocol — RAWAQA

**How AI agents must safely modify the project. Non-negotiable workflow.**  
**Last updated:** 2026-09-02

---

## The Change Workflow

Every modification to the codebase must follow this sequence:

```
┌─────────────────────────────────────────────────────────┐
│ 1. TASK                                                  │
│    Understand what is being asked. Be specific.          │
└──────────────────────────┬──────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ 2. CLASSIFY                                              │
│    What type of change is this?                          │
│    → Frontend UI fix                                     │
│    → New API endpoint                                    │
│    → Database schema change                              │
│    → Authentication change                               │
│    → Integration change (Odoo / SMS)                     │
│    → Security change                                     │
│    → Deployment / config change                          │
│    → Documentation update only                           │
└──────────────────────────┬──────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ 3. READ CONTEXT                                          │
│    Use Context-Index.md to find minimum required docs.   │
│    Read them. Do not skip this step.                     │
└──────────────────────────┬──────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ 4. CHECK SOURCE OF TRUTH                                 │
│    Verify the authoritative source for this information  │
│    type in Source-of-Truth.md.                           │
│    Check Decision-Log.md for any relevant decisions.     │
│    Check Known-Issues.md for any related open issues.    │
└──────────────────────────┬──────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ 5. INSPECT CODE                                          │
│    Read the actual current implementation.               │
│    Determine current status (IMPLEMENTED / PARTIAL /     │
│    NOT_IMPLEMENTED).                                     │
│    Do not assume. Verify.                                │
└──────────────────────────┬──────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ 6. PLAN                                                  │
│    State what files will be changed and why.             │
│    State what the change will and will not do.           │
│    Identify dependencies and potential side effects.     │
│    If the plan deviates from spec → STOP and flag.       │
└──────────────────────────┬──────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ 7. IMPLEMENT                                             │
│    Make the smallest correct change.                     │
│    Do not refactor unrelated code.                       │
│    Do not add unrequested features.                      │
│    Follow AI-Rules.md throughout.                        │
└──────────────────────────┬──────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ 8. VALIDATE                                              │
│    Run available tests.                                  │
│    Verify the change does what it claims.                │
│    Verify it does not break currently working features.  │
│    Check the violation list in AI-Rules.md.             │
└──────────────────────────┬──────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ 9. UPDATE DOCS                                           │
│    See "When to Update Documentation" section below.     │
│    Update Current-State.md if implementation status      │
│    changed.                                              │
└──────────────────────────┬──────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ 10. CHECK FOR CONTRADICTIONS                             │
│    Does the change introduce any new conflicts between   │
│    code and documentation?                               │
│    If yes → add to Known-Issues.md.                     │
│    If a decision was implicitly made → add to            │
│    Decision-Log.md.                                      │
└─────────────────────────────────────────────────────────┘
```

---

## When to Update Documentation (Mandatory)

Documentation MUST be updated in the same PR/commit as the code change when:

| Change Type | Documents to Update |
|-------------|---------------------|
| New API endpoint added | `docs/04-api/API-Design.md`, `docs/04-api/openapi.yaml` |
| API endpoint modified (method, path, payload, response) | `docs/04-api/API-Design.md`, `docs/04-api/openapi.yaml` |
| API endpoint removed | `docs/04-api/API-Design.md`, `docs/04-api/openapi.yaml` |
| New database table added | `docs/05-database/ERD.md`, `docs/05-database/Data-Dictionary.md` |
| Database column added/removed/renamed/retyped | `docs/05-database/ERD.md`, `docs/05-database/Data-Dictionary.md` |
| Authentication mechanism changed | `docs/03-architecture/Auth-Security.md`, `docs/08-security/Security-Specification.md` |
| New environment variable added | `docs/10-deployment/Environment-Configuration.md`, `.env.example` |
| Environment variable renamed/removed | `docs/10-deployment/Environment-Configuration.md`, `.env.example` |
| Architecture layer added or changed | `docs/03-architecture/System-Architecture.md`, `docs/00-ai/Architecture-Summary.md` |
| Odoo integration behavior changed | `docs/06-integrations/Odoo-Integration-Specification.md` |
| SMS integration behavior changed | `docs/06-integrations/SMS-Integration-Specification.md` |
| Deployment procedure changed | `docs/10-deployment/Deployment-Operations.md` |
| Business rule changed or added | `docs/02-requirements/FRS.md`, `docs/00-ai/AI-Context.md` |
| Major UX behavior changed (new page, flow change) | `docs/04-ux-and-flows/UX-Flows.md` |
| Feature implemented for the first time | `docs/00-ai/Current-State.md` (update status) |
| Architectural decision confirmed | `docs/00-ai/Decision-Log.md` |
| New problem discovered | `docs/00-ai/Known-Issues.md` |
| Problem resolved | `docs/00-ai/Known-Issues.md` (mark Resolved) |

---

## When Documentation Update is Optional

| Change Type | Notes |
|-------------|-------|
| Bug fix with no behavior change | No doc update required unless the bug was documented as expected behavior |
| Refactor (same behavior, different code structure) | No doc update unless architecture changed |
| CSS tweak (spacing, color fix) | No doc update unless design system changed |
| Test addition | Update test documentation if test coverage changes significantly |
| Comment improvement | No doc update required |

---

## Change Size Guidelines

### Small change (< 5 files affected)
- Proceed directly after Steps 1–5.
- No extended planning needed.
- Still must follow Steps 6–10.

### Medium change (5–15 files, new feature or significant behavior change)
- Write a brief plan before implementing.
- State which files change and what they change to.
- Get plan confirmed if working with a human.

### Large change (new system layer, new integration, breaking change)
- Write a full plan with:
  - Affected components
  - Database changes
  - API changes
  - Documentation changes
  - Migration or data concerns
  - Rollback approach
- Must be reviewed before implementation.
- Architectural change requires Decision-Log.md entry.

---

## Breaking Changes

A breaking change is any change that:
- Renames or removes an API endpoint
- Changes an API request or response shape non-backwards-compatibly
- Changes a database column name or type in a way that requires data migration
- Changes authentication behavior
- Changes how environment variables are named or structured

**Before making a breaking change:**
1. Check if there are existing consumers (frontend code, mobile apps, integrations).
2. Document the breaking change in the PR description.
3. Update all affected documentation.
4. If the frontend is already using the old API shape, update the frontend in the same PR.

---

## Forbidden Changes (without explicit human approval)

- Changing the payment method (COD is the only accepted method — BC-001)
- Adding a new authentication mechanism without updating Security-Specification.md
- Adding out-of-scope Odoo modules (IC-001 strictly defines scope)
- Adding a payment gateway (requires formal Change Request)
- Adding post-MVP features from Roadmap.md
- Changing the CSS design system colours, fonts, or scale
- Committing `.env` or any real credentials
- Making production database changes without a tested migration
- Deleting any database table without explicit instruction and data migration plan

---

## Emergency Fixes

For urgent production bugs (when backend exists):

```
1. Identify the issue (read error logs)
2. Find the affected code (do not guess)
3. Make the minimal fix
4. Run relevant tests
5. Deploy
6. Update Known-Issues.md with root cause and resolution
7. Follow up with proper documentation update
```

Do not skip Steps 4 and 6 even under time pressure.

# RAWAQA — AI Agent Entry Point

**START HERE. Read this file before touching any code or documentation.**

---

## Onboarding Sequence (mandatory)

```
Step 1 → Read AI-Context.md          — What this project is and what exists right now
Step 2 → Read AI-Rules.md            — The rules you must follow without exception
Step 3 → Read Current-State.md       — Exact implementation status with evidence
Step 4 → Read Source-of-Truth.md     — Which document is authoritative for each topic
Step 5 → Identify your task
Step 6 → Use Context-Index.md        — Find the minimum docs to read for your task
Step 7 → Read only the relevant docs
Step 8 → Inspect the actual code
Step 9 → Implement the smallest correct change
Step 10 → Validate (run tests if available)
Step 11 → Update documentation if behavior or architecture changed
```

---

## The Single Most Important Fact

The frontend prototype **looks functional** but is almost entirely static mock data. There is **no backend, no database, no authentication, no real cart, no real checkout, and no integrations**. Do not assume a feature works because UI exists for it.

---

## Quick Reference

| File | Purpose |
|------|---------|
| [AI-Context.md](AI-Context.md) | Concise project overview, stack, current state |
| [AI-Rules.md](AI-Rules.md) | Strict rules for AI coding agents |
| [Project-Context.md](Project-Context.md) | Detailed product, business, and technical context |
| [Current-State.md](Current-State.md) | Implementation status table with evidence |
| [Architecture-Summary.md](Architecture-Summary.md) | System architecture with Mermaid diagrams |
| [Decision-Log.md](Decision-Log.md) | Accepted decisions and open decisions |
| [Known-Issues.md](Known-Issues.md) | Known problems, gaps, and contradictions |
| [Constraints.md](Constraints.md) | Business, technical, security, and commercial constraints |
| [Source-of-Truth.md](Source-of-Truth.md) | Authoritative source for every type of information |
| [Context-Index.md](Context-Index.md) | Task → required docs navigation map |
| [Task-Routing.md](Task-Routing.md) | Decision trees for common AI agent tasks |
| [Change-Protocol.md](Change-Protocol.md) | Safe modification workflow |
| [Documentation-Sync-Protocol.md](Documentation-Sync-Protocol.md) | How to keep docs and code in sync |

---

## Where the Canonical Docs Live

```
docs/
├── 00-ai/           ← YOU ARE HERE (AI context layer)
├── 01-product/      ← Vision, scope, personas, roadmap
├── 02-requirements/ ← FRS, BRS, NFR, traceability matrix
├── 03-architecture/ ← System, component, auth, data flow diagrams
├── 04-api/          ← API design, OpenAPI spec
├── 05-database/     ← ERD, data dictionary
├── 06-integrations/ ← Odoo and SMS specifications
├── 07-ux/           ← UX documentation
├── 08-security/     ← Security specification
├── 09-testing/      ← Test strategy and plans
├── 10-deployment/   ← Deployment and environment config
├── 11-project-management/ ← Timeline, gaps, payments
└── 12-client-proposal/    ← Commercial docs
```

---

## If You Are Blocked

If documentation is missing, contradictory, or insufficient for a task:

1. Do not invent behavior.
2. Flag the gap explicitly.
3. Reference [Known-Issues.md](Known-Issues.md) to check if it is already recorded.
4. Add it to [Known-Issues.md](Known-Issues.md) if not already there.
5. Ask for a decision before proceeding.

---

*This AI context layer was created 2026-09-02 based on full repository and documentation audit.*

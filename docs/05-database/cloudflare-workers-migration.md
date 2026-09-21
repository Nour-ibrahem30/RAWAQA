# Cloudflare Workers Migration — Backend Compatibility Audit

Status: **Phase 1 (Audit) complete — awaiting approval before implementation**
Branch: `cloudflare-workers-migration`
Scope: Adapt the existing Express + TypeScript + Prisma + Neon backend to run on Cloudflare Workers **without changing business logic, schema, or the REST API contract**.

> This is an **adaptation**, not a rewrite. Express, Prisma, Neon, the schema, all routes, controllers, services, repositories, auth, cookies, COD checkout, cart, reviews, wishlist, admin, and idempotency behavior are preserved.

---

## 1. Current architecture

```
Next.js (Vercel)
   ↓  HTTPS + credentials (HTTP-only JWT cookies)
Express (Node.js) — currently deployable to Render
   ↓
Prisma 7.10 + @prisma/adapter-neon (Neon serverless driver, WebSocket/WSS :443)
   ↓
PostgreSQL (Neon — rwaqa/production)
```

- Entry: `backend/src/server.ts` builds the Express `app` at module scope, exports it as `default`, and calls `startServer()` (which runs `app.listen()`) unless `NODE_ENV === 'test'`.
- Prisma client generated at `backend/src/generated/prisma/`.
- Neon serverless adapter already in use (WebSocket over 443) — this is the single most important fact that makes Workers viable.

## 2. Target architecture

```
Next.js (Vercel)
   ↓
Cloudflare Worker  (entry: httpServerHandler from "cloudflare:node")
   ↓
Express application (unchanged app + routes/middleware/controllers)
   ↓
Prisma + @prisma/adapter-neon (WebSocket/WSS :443)
   ↓
PostgreSQL (Neon)
```

Confirmed approach (official Cloudflare docs, 2026): with `nodejs_compat` + a recent `compatibility_date`, the Workers runtime provides real `node:http`, `node:net`, `node:tls`, `node:crypto`, `node:buffer`, and `node:stream`. Express is wrapped by `httpServerHandler({ port })` from `cloudflare:node`, so `app.listen(port)` is kept as-is and every HTTP header (including `Set-Cookie`) is preserved. Content rephrased for compliance with licensing restrictions.

References:
- Deploy an Express.js application on Cloudflare Workers — https://developers.cloudflare.com/workers/tutorials/deploy-an-express-app/
- Node.js compatibility — https://developers.cloudflare.com/workers/runtime-apis/nodejs/
- Bringing Node.js HTTP servers to Cloudflare Workers — https://blog.cloudflare.com/bringing-node-js-http-servers-to-cloudflare-workers
- Workers Best Practices (background work via Queues/Workflows/Cron) — https://developers.cloudflare.com/workers/best-practices/workers-best-practices

## 3. Compatibility audit (per file)

Classification key:
- **A** — Stays in Node-only startup code (not imported by the Worker)
- **B** — Must be adapted for Workers
- **C** — Must be replaced by Cloudflare functionality
- **D** — Incompatible; remains outside the Worker (deferred/other runtime)
- **OK** — Works as-is on Workers

| File | Node-specific usage | Class | Decision |
|---|---|---|---|
| `src/server.ts` | `app.listen`, `process.pid/uptime/exit/on`, SIGTERM/SIGINT, uncaught/unhandled handlers, per-request `setTimeout`, `express.static(__dirname/../uploads)`, first line `import './config/dns'`, top-level worker imports | A + B | Split into pure app vs Node startup (see §5). |
| `src/config/dns.ts` | Imports `node:dns` + `node:net`, monkey-patches `dns.lookup`, auto-runs on import | A / D | **Not imported by the Worker.** Irrelevant to Neon serverless (fetch/WSS, not `getaddrinfo`). Stays Node-only. |
| `src/lib/prisma.ts` | `import 'dotenv/config'`, `PrismaNeon` adapter, `global` singleton | B (tiny) | Adapter is Worker-compatible. Remove hard `dotenv/config` import at module top (make it Node-only). Per-isolate singleton is fine. |
| `src/config/env.ts` | `dotenv.config()`, `process.exit(1)` on default secrets, dangerous all-defaults fallback | B | `dotenv.config()` is a harmless no-op on Workers (env comes from bindings). Harden: fail safe (no insecure localhost DB / default JWT) at Worker runtime instead of `process.exit`. |
| `src/config/sentry.ts` | `@sentry/node`, `Sentry.Handlers.*` | B | `@sentry/node` is Node-only. Lazy `require` already no-ops when uninstalled/no DSN. Worker path should use `@sentry/cloudflare` or run with Sentry disabled (DSN optional). No behavior change when DSN unset. |
| `src/config/logger.ts` | `winston`, `winston-daily-rotate-file`, `path`, filesystem `logs/` | B | Console transport works. File transport only activates when `LOG_FILE_ENABLED=true` — must stay **false** on Worker (production already sets `false`). Keep console logging. |
| `src/middleware/upload.middleware.ts` | `multer` disk/memory storage, `fs.mkdirSync/existsSync/unlinkSync`, `path`, `cloudinary` SDK, `req.protocol/get` | C | **Biggest incompatibility.** Local-disk storage cannot run on Workers. Uploads move to **Cloudflare R2** in a dedicated later phase. See §7. |
| `src/controllers/upload.controller.ts` | Depends on upload middleware helpers | C | Prisma persistence parts are fine; storage parts blocked until R2 adapter exists. |
| `src/workers/outbox.worker.ts` | `setInterval` 5s loop, `process.pid` | C | Must NOT run in the request Worker. Move to Cron Trigger / Queue. See §6. |
| `src/workers/auto-cancel.worker.ts` | `node-cron` `*/30 * * * *` | C | Same — Cron Trigger. See §6. |
| `src/workers/inventory-reconciliation.worker.ts` | `node-cron` (cron from env) | C | Same — Cron Trigger. See §6. |
| Routes / controllers / services / repositories (non-upload) | Prisma, express-validator, jsonwebtoken, bcryptjs | OK | Run unchanged under `nodejs_compat`. No edits. |
| CORS + cookie handling (`server.ts` middleware, `cookie-parser`) | Web-standard `URL`, header setters | OK | Preserved. `httpServerHandler` keeps `Set-Cookie`. No edits. |
| `helmet`, `morgan`, `express-rate-limit` | Express middleware | OK / note | Function under `nodejs_compat`. Rate limiter caveat in §10. |

## 4. Environment variable matrix

| Variable | Class | Worker handling |
|---|---|---|
| `DATABASE_URL` | SECRET | `wrangler secret put`. Must NOT default to localhost in Worker runtime. |
| `JWT_ACCESS_SECRET` | SECRET | `wrangler secret put`. Must NOT use built-in default. |
| `JWT_REFRESH_SECRET` | SECRET | `wrangler secret put`. Must NOT use built-in default. |
| `SMTP_PASS`, `SMTP_USER`, `SMTP_HOST` | SECRET | `wrangler secret put` (email). |
| `CLOUDINARY_API_SECRET`, `_API_KEY` | SECRET | Secret — but see §8 (moving to R2). |
| `SENTRY_DSN` | SECRET (optional) | Optional; if unset, monitoring disabled cleanly. |
| `NODE_ENV`, `PORT` | PUBLIC | `[vars]` in wrangler config. |
| `CORS_ORIGIN`, `CORS_CREDENTIALS` | PUBLIC | `[vars]`. |
| `CLIENT_URL`, `CLIENT_URL_AR`, `CLIENT_URL_EN` | PUBLIC | `[vars]`. |
| `COOKIE_SECURE`, `COOKIE_SAME_SITE`, `COOKIE_DOMAIN`, `TRUST_PROXY` | PUBLIC | `[vars]`. |
| `FEATURE_*`, rate-limit knobs, `HELMET_CSP_ENABLED` | PUBLIC | `[vars]`. |
| `SMS_*`, `VONAGE_*`, `ODOO_*` | PUBLIC/SECRET | Currently disabled flags; set only if enabled. |
| `LOG_FILE_ENABLED` | NODE-ONLY | Must be `false` on Worker (no filesystem). |
| `DNS_*` (`DNS_FALLBACK_*`, `DNS_RESOLVER_STRATEGY`, `DNS_SERVERS`) | NOT-APPLICABLE-TO-WORKER | `dns.ts` not loaded on Worker. |
| `UPLOAD_DESTINATION`, `UPLOAD_*` | NODE-ONLY (until R2) | Local-disk-only; superseded by R2 config later. |

Secrets are never written to source or committed. `.env` / `.env.local` remain gitignored.

## 5. App / startup separation (Phase 2)

Problem: importing `server.ts` today drags in `./config/dns` (node:dns/net monkey-patch), `@sentry/node`, and the three background workers at module load — all Node-only — because they sit at the top of `server.ts`.

Plan (smallest safe change):
- **New `src/app.ts`** — pure Express app: all middleware, CORS, health handlers, routes, error handlers, and `export default app`. Contains **no** `dns` import, **no** worker imports, **no** `app.listen`, **no** process signal handlers.
- **`src/server.ts`** (Node entry, unchanged behavior) — imports `./config/dns`, `initSentry()`, `app` from `./app`, the workers, then runs `startServer()` with `app.listen`, DB check, `ensureDefaultCategories()`, workers, and graceful shutdown. Render/local keep working exactly as today.
- **New `src/worker.ts`** (Cloudflare entry) — imports `app` from `./app`, calls `app.listen(PORT)`, and `export default httpServerHandler({ port: PORT })`. No dns, no workers, no signal handlers.

This is a mechanical extraction. No route, controller, or middleware code changes.

## 6. Background workers strategy

Current: `outbox` (5s `setInterval`), `auto-cancel` (`node-cron` every 30m), `inventory-reconciliation` (`node-cron`). Persistent loops are not allowed inside a request Worker.

For this migration phase, HTTP API has priority; workers are **not deleted** and continue to run on the Node deployment (Render) as today. Target Cloudflare-native design (later phase):
- **Cron Triggers** → a `scheduled(event, env, ctx)` handler invokes the outbox drain, auto-cancel sweep, and reconciliation on a schedule (e.g. every 1–5 min for outbox, 30 min for auto-cancel).
- **Queues** → optionally push outbox events to a Cloudflare Queue for fan-out delivery (SMS/email/Odoo) instead of DB polling.
- The worker classes' core methods (`processEvents`, `cancelExpiredOrders`, reconciliation) are already separated from their `start()/setInterval` scheduling, so a scheduled handler can call the method directly with no business-logic change.

**Decision needed from you:** run workers on Cron Triggers now, or keep them on the Node/Render deployment during the transition? (Recommended: keep on Node until the Worker HTTP path is proven, then port to Cron Triggers.)

## 7. Uploads / R2 strategy

Current upload paths: local disk (`multer.diskStorage` + `fs`) for dev, Cloudinary for production. Both are Node-coupled.

- Local-disk branch and `express.static('/uploads')` **cannot** run on Workers (no persistent filesystem).
- Cloudinary branch uses the Node SDK + Node streams.

Plan: keep the **API contract** (`POST /api/upload/...` request/response shapes) identical. Introduce an R2 storage adapter behind the same `resolveUploadedFile` / `removeImageFromStorage` interface in a dedicated phase:
- Parse multipart via a Worker-compatible parser (Web `Request.formData()`), not `multer` disk storage.
- Store objects in an **R2 bucket binding**; return public URLs.
- Persist image rows via Prisma exactly as today.

Until the R2 adapter lands, upload endpoints are the one area that will not function on the Worker. All non-upload endpoints are unaffected. This is called out explicitly so it is a conscious, staged decision — not a silent regression.

## 8. Cloudinary

No new Cloudinary functionality will be added. The architecture is being prepared for R2 (see §7). The Cloudinary code stays in place for the Node deployment; the Worker upload adapter will target R2. `CLOUDINARY_*` vars remain classified as secret while still in use on Node.

## 9. Sentry / logging

- `@sentry/node` is Node-only. It already no-ops cleanly when the DSN is unset or the package is unavailable, so the Worker can run with Sentry disabled without code changes. Optional later step: add `@sentry/cloudflare` for Worker error reporting.
- Winston console logging works; the daily-rotate **file** transport (filesystem) must stay disabled on the Worker via `LOG_FILE_ENABLED=false` (production already does this). No monitoring is silently removed.

## 10. Rate limiting

`express-rate-limit` uses an in-memory store. On Workers, memory is **per-isolate** and short-lived, so in-memory counters do **not** provide global production rate limiting. This is a known limitation to document, not fix blindly. Options for a later phase: Cloudflare's built-in Rate Limiting rules (edge) or a Durable Object / KV-backed limiter. No auth or business behavior changes as part of this.

## 11. CORS + cookies (critical — preserved)

- The existing CORS middleware uses Web-standard `URL` parsing and allows `*.vercel.app`, `rawaqa.com` (+ subdomains), localhost, and configured origins — unchanged.
- HTTP-only JWT access/refresh cookies, cookie names, `SameSite=None; Secure`, and `credentials` semantics are unchanged.
- `httpServerHandler` preserves `Set-Cookie` and all response headers because it runs the real Express response through `node:http`. No cookie/token behavior is modified.

## 12. Files to be created / modified (proposed — see §14 for the exact list)

Nothing is modified during the audit phase. Implementation changes are listed in §14 and require approval first.

## 13. Known limitations (this phase)

1. Upload endpoints require the R2 adapter (§7) before they work on the Worker.
2. Background workers do not run inside the request Worker; they stay on Node until ported to Cron Triggers (§6).
3. In-memory rate limiting is not global on Workers (§10).
4. Sentry error reporting is disabled on the Worker unless `@sentry/cloudflare` is added later (§9).

## 14. Testing checklist (Phase 8+)

- `npm run db:validate`
- `npm run db:generate`
- `npx tsc --noEmit`
- `npm run build`
- Existing Jest tests (report any that cannot run and why; tests are not modified to force a pass).
- Local Worker (`wrangler dev`): `GET /`, `/health`, `/health/live`, `/health/ready`, `/api/docs`.
- DB-backed: `GET /api/products` against real Neon.
- CORS + `OPTIONS` preflight, cookies, login, authenticated request, admin authorization, a Prisma query, and error handling.

## 15. Rollback plan

- Do **not** delete the Render backend, its env vars, or the Vercel `NEXT_PUBLIC_API_URL` until the Worker passes all tests.
- The Node/Render deployment remains the live backend and the rollback target throughout.
- The Vercel API URL is switched to the Worker **only** after production Worker verification (Phase 11).
- All work is isolated on branch `cloudflare-workers-migration`; `.env`/secrets are never committed.

---

## Proposed file changes (require approval before Phase 2)

**New files**
- `backend/src/app.ts` — extracted pure Express app (moved from `server.ts`, no behavior change).
- `backend/src/worker.ts` — Cloudflare entry: imports `app`, `httpServerHandler({ port })`.
- `backend/wrangler.toml` (or `wrangler.jsonc`) — Worker config: `main`, recent `compatibility_date`, `compatibility_flags = ["nodejs_compat"]`, `[vars]`, and documented secrets.

**Modified files**
- `backend/src/server.ts` — import `app` from `./app`; keep dns import, Sentry init, workers, `startServer()`, and signal handlers here (Node-only). Net behavior identical on Node/Render.
- `backend/src/lib/prisma.ts` — remove the top-level `import 'dotenv/config'` (make env loading Node-only); keep the Neon adapter and singleton.
- `backend/src/config/env.ts` — replace `process.exit`-based guard with a fail-safe that also rejects the insecure localhost `DATABASE_URL` default and default JWT secrets at Worker runtime; keep Node behavior.
- `backend/package.json` — add `@cloudflare/workers-types` (dev), wrangler scripts (`cf:dev`, `cf:deploy`), and `wrangler` (dev). No runtime dependency removed.

**Intentionally NOT changed**
- Prisma schema, models, migrations, generated client.
- All routes, controllers, services, repositories (except the eventual R2 upload adapter, separate phase).
- Auth/JWT/cookie behavior, COD checkout, cart, guest-cart merge, reviews, wishlist, admin permissions, idempotency, validation, feature flags.
- `config/dns.ts` and `workers/*` source (isolated, not ported yet).
- Frontend code (the Vercel API URL switch is a final, separate step).

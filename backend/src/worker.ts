/**
 * worker.ts — Cloudflare Workers entry point
 * =============================================================================
 * Runs the shared Express application (./app) on the Cloudflare Workers runtime
 * using the official Node-compatibility bridge.
 *
 *   Worker fetch
 *     ↓  cloudflare:node httpServerHandler
 *   node:http server (provided by nodejs_compat)
 *     ↓
 *   Express app (./app) — same routes/middleware/controllers as Node
 *     ↓
 *   Prisma + @prisma/adapter-neon (Neon serverless, WSS :443)
 *
 * What this entry intentionally does NOT do (Node-only, lives in server.ts):
 *   - import ./config/dns (Node dns monkey-patch)
 *   - initialize @sentry/node
 *   - start background workers (outbox / auto-cancel / reconciliation)
 *   - register process signal / uncaught-exception handlers
 *
 * Known Phase-2 limitations (see docs/05-database/cloudflare-workers-migration.md):
 *   - Upload endpoints require the deferred R2 adapter and are NOT Worker-ready.
 *   - Background jobs continue to run on the Node/Render deployment.
 *   - express-rate-limit is per-isolate (not a global limiter) on Workers.
 * =============================================================================
 */

// `cloudflare:node` is only resolvable inside the Workers runtime; the ambient
// module declaration in worker-env.d.ts lets TypeScript type-check this import.
import { httpServerHandler } from 'cloudflare:node';

import app from './app';

// Port is arbitrary within the isolate — httpServerHandler bridges the Worker
// fetch event to this in-process node:http server. Keep it aligned with the
// value passed to httpServerHandler below.
const PORT = Number(process.env.PORT) || 10000;

app.listen(PORT);

export default httpServerHandler({ port: PORT });

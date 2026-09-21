/**
 * worker-runtime.ts — Cloudflare Workers runtime detection + Worker-only shims.
 * =============================================================================
 * This module isolates the small runtime-specific adaptations needed so the
 * SAME Express app can run on both Node (server.ts) and Cloudflare Workers
 * (worker.ts). It changes NOTHING on Node — every helper here is a no-op unless
 * the code is actually executing inside a Worker isolate.
 * =============================================================================
 */

import { MemoryStore } from 'express-rate-limit';
import type { Store, Options } from 'express-rate-limit';

/**
 * Detect the Cloudflare Workers runtime.
 *
 * Cloudflare sets `navigator.userAgent === 'Cloudflare-Workers'` inside the
 * Worker global scope. This is the officially documented signal and does NOT
 * exist on Node/Render, so this returns false there.
 */
export const isCloudflareWorker = (): boolean => {
  // Accessed via globalThis so this type-checks under Node's lib (no DOM lib)
  // without widening global types. Use several Workers-only signals so detection
  // is robust at module-init scope (navigator.userAgent alone can be unset at the
  // exact moment module top-level runs under some compat configurations).
  const g = globalThis as {
    navigator?: { userAgent?: string };
    WebSocketPair?: unknown;
    caches?: unknown;
    process?: { versions?: { node?: string } };
  };
  if (g.navigator?.userAgent === 'Cloudflare-Workers') return true;
  // WebSocketPair + caches are Workers-runtime globals that do not exist on Node.
  if (typeof g.WebSocketPair !== 'undefined' && typeof g.caches !== 'undefined') return true;
  return false;
};

/**
 * Worker-safe MemoryStore for express-rate-limit.
 *
 * The stock MemoryStore.init() creates a `setInterval` to periodically sweep
 * expired keys. Cloudflare Workers forbid creating timers in global scope
 * (rateLimit() constructs + init()s the store at module load), which crashes
 * the Worker on startup with:
 *   "Disallowed operation called within global scope ... setting a timeout".
 *
 * This subclass keeps ALL counting/get/increment/reset logic identical to the
 * stock store — it only skips creating the background sweep timer. Expired
 * counters are still reset lazily on the next request for that key via the
 * store's normal resetTime handling, so per-window limiting still works. The
 * only difference is that idle keys are not proactively reclaimed, which is
 * acceptable for a per-isolate Worker (isolates are short-lived).
 *
 * NOTE: This store is used ONLY on the Worker. Node/Render keeps the default
 * store and the periodic sweep, unchanged.
 */
export class WorkerMemoryStore extends MemoryStore {
  override init(options: Options): void {
    // Replicate the essential part of MemoryStore.init WITHOUT setInterval.
    // The base class only needs windowMs recorded for reset-time math.
    (this as unknown as { windowMs: number }).windowMs = options.windowMs;
  }
}

/**
 * Returns a Worker-safe rate-limit store on the Worker, or `undefined` on Node
 * (so express-rate-limit uses its default MemoryStore with the normal timer).
 */
export const getRuntimeRateLimitStore = (): Store | undefined => {
  return isCloudflareWorker() ? new WorkerMemoryStore() : undefined;
};

/**
 * Worker-safe keyGenerator for express-rate-limit.
 *
 * The default express-rate-limit keyGenerator calls `validations.ip(req.ip)`,
 * which throws `ERR_ERL_UNDEFINED_IP_ADDRESS` on Cloudflare Workers because
 * `req.ip` is `undefined` there (the Worker runtime's node:http layer does not
 * populate `socket.remoteAddress` / `X-Forwarded-For` the same way Node does).
 *
 * On Workers the real client IP is provided by Cloudflare's edge in the
 * `CF-Connecting-IP` request header.  We fall back to the standard Express
 * `req.ip` and then to the sentinel `"unknown"` so the key is always a non-empty
 * string and the limiter never throws.
 *
 * On Node/Render this function returns `undefined`, so express-rate-limit keeps
 * using its own default keyGenerator (req.ip populated by Express proxy logic)
 * — Node behavior is completely unchanged.
 */
export const getWorkerRateLimitKeyGenerator = ():
  | ((req: import('express').Request) => string)
  | undefined => {
  if (!isCloudflareWorker()) return undefined;

  return (req: import('express').Request): string => {
    // Cloudflare sets CF-Connecting-IP to the visitor's real IP on every request.
    const cfIp = req.headers['cf-connecting-ip'];
    if (cfIp && typeof cfIp === 'string' && cfIp.trim()) return cfIp.trim();
    // Fallback: Express req.ip (may be set if X-Forwarded-For is present).
    if (req.ip && req.ip.trim()) return req.ip.trim();
    // Final fallback: X-Forwarded-For first entry.
    const xff = req.headers['x-forwarded-for'];
    if (xff) {
      const xffStr = Array.isArray(xff) ? (xff[0] ?? '') : xff;
      const first = xffStr.split(',')[0]?.trim();
      if (first) return first;
    }
    return 'unknown';
  };
};

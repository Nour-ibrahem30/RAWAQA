// Environment loading is Node-only. On Cloudflare Workers there is no dotenv and
// env vars arrive via Worker bindings (process.env is populated by the runtime),
// so we must NOT hard-import 'dotenv/config' at module top. Load it lazily only
// when running under Node. This preserves the previous local/Render behavior
// (standalone scripts importing prisma.ts still get .env loaded).
if (typeof process !== 'undefined' && process.versions?.node) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('dotenv').config();
  } catch {
    /* dotenv not present (e.g. Worker bundle) — ignore */
  }
}

import { AsyncLocalStorage } from 'node:async_hooks';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { logInfo, logError, logWarn } from '../config/logger';
import { isCloudflareWorker } from './worker-runtime';

// ---------------------------------------------------------------------------
// Build the Neon serverless adapter. Reused for the Node singleton and created
// fresh per-request on Cloudflare Workers (see the connection-lifecycle note
// below).
//
// We use the Neon serverless driver (WebSocket over 443) instead of the plain
// pg TCP driver, and keep it for BOTH runtimes so interactive transactions
// (prisma.$transaction(async (tx) => ...)) remain fully supported — checkout,
// order, and auto-cancel flows depend on them. The Prisma Client API, schema,
// and queries are unchanged.
// ---------------------------------------------------------------------------
function createAdapter(): PrismaNeon | null {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    // Allow the app to start without a DB configured. Prisma operations will
    // fail at runtime, not at import time.
    logWarn('DATABASE_URL is not set — Prisma (PostgreSQL) is disabled.');
    return null;
  }
  return new PrismaNeon({ connectionString });
}

function createPrismaClient(): PrismaClient {
  const adapter = createAdapter();
  if (!adapter) {
    // No DATABASE_URL — return a stub so imports don't fail.
    // Actual Prisma queries will throw at runtime, as intended during migration period.
    return new PrismaClient({ adapter: null as any } as any);
  }

  const client = new PrismaClient({
    adapter,
    log: [
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
  } as any);

  // Bind structured logging (same events as before).
  (client as any).$on?.('error', (e: any) => {
    logError('Prisma Client Error', e);
  });
  (client as any).$on?.('warn', (e: any) => {
    logWarn(`Prisma Client Warning: ${e.message}`);
  });
  if (process.env.NODE_ENV === 'development' && process.env.LOG_SQL_QUERIES === 'true') {
    (client as any).$on?.('query', (e: any) => {
      logInfo(`[SQL] ${e.query} — ${e.duration}ms`);
    });
  }

  return client;
}

// ---------------------------------------------------------------------------
// Node singleton — dev-safe (avoids hot-reload multi-instances). This is the
// EXISTING behavior and is what Node/Render uses, unchanged. On the Worker it is
// only used as a fallback for code paths that run outside a request context
// (e.g. module init); real request traffic uses the per-request client below.
// ---------------------------------------------------------------------------
const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

function getSingleton(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

// ---------------------------------------------------------------------------
// Worker-only per-request connection lifecycle.
//
// Problem: on Cloudflare Workers a module-scope Prisma/Neon client holds a
// WebSocket (neon.Pool) that is torn down between unrelated request contexts in
// the isolate, so a reused client fails intermittently with
// "Error: Connection terminated" (PrismaNeonAdapter.performIO/queryRaw).
//
// Fix (Worker-only): run each HTTP request inside an AsyncLocalStorage context
// carrying a FRESH PrismaClient, and disconnect it when the request ends. This
// never reuses a dead socket across requests, while keeping the WebSocket
// adapter (and therefore interactive transactions) intact. Node does NOT use
// this path — see the Proxy resolution below.
// ---------------------------------------------------------------------------
const requestClientStore = new AsyncLocalStorage<PrismaClient>();

/**
 * Worker-only: execute `fn` with a fresh per-request Prisma client bound to the
 * async context, disposing it afterward. On Node this is never called (the
 * request middleware that invokes it is mounted only on the Worker).
 */
export const runWithRequestPrisma = async <T>(fn: () => Promise<T>): Promise<T> => {
  if (!process.env.DATABASE_URL) {
    // No DB configured — run without a scoped client; the proxy falls back to
    // the (stub) singleton and Prisma calls will throw as before.
    return fn();
  }
  const client = createPrismaClient();
  return requestClientStore.run(client, async () => {
    try {
      return await fn();
    } finally {
      // Close the per-request Neon WebSocket so nothing stale is ever reused.
      try {
        await client.$disconnect();
      } catch (err) {
        logError('Error disconnecting per-request Prisma client', err);
      }
    }
  });
};

/**
 * Resolve the active Prisma client:
 *   - Worker + inside a request context → the fresh per-request client
 *   - otherwise (Node, or Worker module-init / non-request path) → singleton
 */
function resolveClient(): PrismaClient {
  const scoped = requestClientStore.getStore();
  if (scoped) return scoped;
  return getSingleton();
}

// ---------------------------------------------------------------------------
// Exported `prisma` — a transparent Proxy so the ~22 existing
// `import { prisma } from '../lib/prisma'` call sites need NO changes.
//   - Node: always forwards to the module-scope singleton (identical behavior).
//   - Worker: forwards to the per-request client when in a request, else singleton.
// Property access and method binding are forwarded to the resolved client.
// ---------------------------------------------------------------------------
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = resolveClient();
    const value = Reflect.get(client as object, prop, receiver);
    return typeof value === 'function' ? value.bind(client) : value;
  },
  has(_target, prop) {
    return prop in (resolveClient() as object);
  },
}) as PrismaClient;

// ---------------------------------------------------------------------------
// Health check — lightweight SELECT 1. On the Worker this must NOT reuse a
// possibly-stale singleton socket, so use a short-lived fresh client there.
// On Node it uses the singleton (unchanged behavior).
// ---------------------------------------------------------------------------
export const checkPrismaConnection = async (): Promise<boolean> => {
  if (!process.env.DATABASE_URL) return false;

  // Worker: use a fresh client for the probe and dispose it, so /health/ready
  // does not depend on (or poison) a reused connection.
  if (isCloudflareWorker() && !requestClientStore.getStore()) {
    const probe = createPrismaClient();
    try {
      await (probe as any).$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logError('Prisma connection health check failed', error);
      return false;
    } finally {
      try { await probe.$disconnect(); } catch { /* ignore */ }
    }
  }

  try {
    await (prisma as any).$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logError('Prisma connection health check failed', error);
    return false;
  }
};

// ---------------------------------------------------------------------------
// Graceful disconnect on process termination (Node). Disconnects the singleton.
// ---------------------------------------------------------------------------
export const disconnectPrisma = async (): Promise<void> => {
  try {
    if (globalForPrisma.prisma) {
      await globalForPrisma.prisma.$disconnect();
      logInfo('Prisma Client disconnected cleanly');
    }
  } catch (error) {
    logError('Error disconnecting Prisma Client', error);
  }
};

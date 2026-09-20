import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { logInfo, logError, logWarn } from '../config/logger';

// ---------------------------------------------------------------------------
// Build the Neon serverless adapter once and reuse it.
//
// We use the Neon serverless driver (WebSocket over 443) instead of the plain
// pg TCP driver. The host platform's container resolver cannot resolve the Neon
// endpoint over the normal TCP path (getaddrinfo EAI_AGAIN on :5432), so a
// standard TCP connection fails. The serverless driver connects over HTTPS/WSS
// on 443, which the platform allows, bypassing that DNS/TCP failure.
// The Prisma Client API, schema, and queries are unchanged.
// ---------------------------------------------------------------------------
function createAdapter() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    // Allow the app to start without a DB configured. Prisma operations will
    // fail at runtime, not at import time.
    logWarn('DATABASE_URL is not set — Prisma (PostgreSQL) is disabled.');
    return null;
  }
  return new PrismaNeon({ connectionString });
}

// ---------------------------------------------------------------------------
// Singleton Prisma Client — dev-safe (avoids hot-reload multi-instances)
// ---------------------------------------------------------------------------
const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const adapter = createAdapter();
  if (!adapter) {
    // No DATABASE_URL — return a stub so imports don't fail.
    // Actual Prisma queries will throw at runtime, as intended during migration period.
    return new PrismaClient({ adapter: null as any } as any);
  }

  return new PrismaClient({
    adapter,
    log: [
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
  } as any);
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Bind structured logging
(prisma as any).$on?.('error', (e: any) => {
  logError('Prisma Client Error', e);
});

(prisma as any).$on?.('warn', (e: any) => {
  logWarn(`Prisma Client Warning: ${e.message}`);
});

if (process.env.NODE_ENV === 'development' && process.env.LOG_SQL_QUERIES === 'true') {
  (prisma as any).$on?.('query', (e: any) => {
    logInfo(`[SQL] ${e.query} — ${e.duration}ms`);
  });
}

// ---------------------------------------------------------------------------
// Health check — lightweight SELECT 1
// ---------------------------------------------------------------------------
export const checkPrismaConnection = async (): Promise<boolean> => {
  if (!process.env.DATABASE_URL) return false;
  try {
    await (prisma as any).$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logError('Prisma connection health check failed', error);
    return false;
  }
};

// ---------------------------------------------------------------------------
// Graceful disconnect on process termination
// ---------------------------------------------------------------------------
export const disconnectPrisma = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    logInfo('Prisma Client disconnected cleanly');
  } catch (error) {
    logError('Error disconnecting Prisma Client', error);
  }
};

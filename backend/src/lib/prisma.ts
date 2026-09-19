import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { logInfo, logError, logWarn } from '../config/logger';

// ---------------------------------------------------------------------------
// Build the pg adapter once and reuse it.
// In Prisma 7 the driver adapter is required for direct-TCP connections.
// ---------------------------------------------------------------------------
function createAdapter() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    // Allow the app to start without Postgres in environments where only
    // Mongoose is in use (migration period). Prisma operations will fail at
    // runtime, not at import time.
    logWarn('DATABASE_URL is not set — Prisma (PostgreSQL) is disabled. Mongoose-backed features still work.');
    return null;
  }
  return new PrismaPg({ connectionString });
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

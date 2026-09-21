/**
 * server.ts — Node.js entry point
 * =============================================================================
 * This is the traditional Node/Render/local runtime entry. It owns all
 * Node-specific concerns and keeps the exact startup behavior it had before the
 * Cloudflare Workers split:
 *   - DNS resolver monkey-patch (./config/dns) — Node-only, imported FIRST
 *   - Sentry (@sentry/node) initialization BEFORE the app is built
 *   - Background workers (outbox / inventory-reconciliation / auto-cancel)
 *   - app.listen() on 0.0.0.0
 *   - PostgreSQL connectivity check + ensureDefaultCategories()
 *   - Graceful shutdown + process signal/exception handlers
 *
 * The pure Express application lives in ./app and is shared with the Cloudflare
 * Worker entry (./worker.ts), which does NOT import this file.
 * =============================================================================
 */

// DNS resolver workaround (Node-only). MUST stay the first import so the
// dns.lookup monkey-patch is installed before any network client is created.
import './config/dns';

console.log('🚀 [STARTUP] server.ts initializing... PID:', process.pid, 'PORT:', process.env.PORT);

// ⚠️  Sentry MUST be initialised before the app/route modules are imported so it
// can instrument them. initSentry() is a no-op when SENTRY_DSN is unset.
import { initSentry, captureException } from './config/sentry';
initSentry();

import { env } from './config/env';
import { logError, logInfo } from './config/logger';
import logger from './config/logger';
import { outboxWorker } from './workers/outbox.worker';
import { inventoryReconciliationWorker } from './workers/inventory-reconciliation.worker';
import { autoCancelWorker } from './workers/auto-cancel.worker';
import { ensureDefaultCategories } from './services/category.service';
import { checkPrismaConnection, disconnectPrisma } from './lib/prisma';

// The fully-configured Express app (middleware, routes, error handlers).
import app from './app';

// Re-export health handlers and gatekeeper for backward compatibility with any
// external importer of server.ts (kept identical to the pre-split surface).
export {
  liveHealthHandler,
  readyHealthHandler,
  dbDiagnosticHandler,
  standardHealthHandler,
  dbGatekeeper,
} from './app';

// =============================================================================
// SERVER STARTUP & SHUTDOWN
// =============================================================================

const startServer = async () => {
  // Read PORT from process.env.PORT or env.PORT, strictly defaulting to 10000
  const PORT = Number(process.env.PORT) || env.PORT || 10000;

  console.log('='.repeat(60));
  console.log('🚀 RAWAQA Backend Starting...');
  console.log(`PORT from process.env.PORT: ${process.env.PORT}`);
  console.log(`PORT from env.PORT: ${env.PORT}`);
  console.log(`Final PORT: ${PORT}`);
  console.log(`Binding to: 0.0.0.0:${PORT}`);
  console.log('='.repeat(60));

  // 1. Start HTTP Server immediately on 0.0.0.0 so platform port discovery succeeds instantly
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server listening on 0.0.0.0:${PORT}`);
    console.log(`🌍 Environment: ${env.NODE_ENV}`);
    console.log(`🩺 Health endpoint: /health`);
    logInfo(`🚀 Server listening on 0.0.0.0:${PORT}`, {
      environment: env.NODE_ENV,
      port: PORT,
      nodeVersion: process.version,
      pid: process.pid,
    });
  });

  server.on('error', (err: any) => {
    console.error(`❌ HTTP Server Error on 0.0.0.0:${PORT}:`, err);
    logError(`HTTP Server Error on port ${PORT}`, err);
    if (err.code === 'EADDRINUSE') {
      process.exit(1);
    }
  });

  let workerLifecycleBound = false;
  let workerRestartTimer: NodeJS.Timeout | null = null;
  let workersRunning = false;

  const stopBackgroundWorkers = () => {
    if (workerRestartTimer) {
      clearTimeout(workerRestartTimer);
      workerRestartTimer = null;
    }
    if (!workersRunning) return;
    workersRunning = false;
    outboxWorker.stop();
    inventoryReconciliationWorker.stop();
    autoCancelWorker.stop();
  };

  const startBackgroundWorkers = () => {
    if (workersRunning) return;
    // Workers now use Prisma/PostgreSQL — only require DATABASE_URL
    if (!process.env.DATABASE_URL) {
      logInfo('Skipping worker start — DATABASE_URL not configured');
      return;
    }
    workersRunning = true;
    outboxWorker.start();
    inventoryReconciliationWorker.start();
    autoCancelWorker.start();
  };

  const bindWorkerLifecycleOnce = () => {
    if (workerLifecycleBound || !env.ENABLE_WORKERS) return;
    workerLifecycleBound = true;
    // Workers now use Prisma — no MongoDB reconnect dependency needed
  };

  // 2. Verify PostgreSQL (Prisma) connectivity in the background without blocking port discovery
  const initDbAndWorkers = async (
    retries = parseInt(process.env['DB_CONNECT_MAX_RETRIES'] || '5', 10),
    delay = parseInt(process.env['DB_CONNECT_RETRY_DELAY_MS'] || '3000', 10)
  ) => {
    try {
      // All business logic runs on PostgreSQL/Prisma.
      const connected = await checkPrismaConnection();
      if (!connected) {
        throw new Error('PostgreSQL (Prisma) connection check failed');
      }
      console.log('✅ PostgreSQL (Prisma) connected');
      logInfo('PostgreSQL successfully initialized');

      // Initialize default essential categories once at startup (idempotent, never inside request path)
      await ensureDefaultCategories();

      // 3. Start background workers after DB is confirmed reachable
      if (env.ENABLE_WORKERS) {
        logInfo('Starting background workers');
        startBackgroundWorkers();
        bindWorkerLifecycleOnce();
      }
    } catch (error: any) {
      console.error(`❌ Database connection attempt failed (${retries} retries left):`, error?.message || error);
      logError(`Database connection attempt failed (${retries} retries left):`, error);
      if (retries > 0) {
        const nextDelay = Math.min(Math.round(delay * 1.5), 30000);
        setTimeout(() => initDbAndWorkers(retries - 1, nextDelay), delay);
      } else {
        console.error('⚠️ All database connection retries exhausted. Running server in degraded mode to allow port inspection.');
        logError('All database connection retries exhausted. Running server in degraded mode to allow port inspection.', error);
      }
    }
  };

  // Launch DB connection in background without blocking port listener
  initDbAndWorkers();

  // Graceful Shutdown Handlers
  const gracefulShutdown = async (signal: string) => {
    logInfo(`${signal} received, starting graceful shutdown`);

    // Stop workers
    if (env.ENABLE_WORKERS) {
      logInfo('Stopping background workers');
      try {
        stopBackgroundWorkers();
      } catch (err) {
        logError('Error stopping workers', err);
      }
    }

    // Stop accepting new connections
    server.close(async () => {
      logInfo('HTTP server closed');

      try {
        // Close PostgreSQL (Prisma) connection
        try {
          await disconnectPrisma();
        } catch (pgErr) {
          logError('Error disconnecting Prisma', pgErr);
        }

        logInfo('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logError('Error during shutdown', error);
        process.exit(1);
      }
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  };

  // Handle shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    logError('Uncaught Exception', error);
    captureException(error, { source: 'uncaughtException' });
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: any) => {
    logError('Unhandled Rejection', reason);
    captureException(reason, { source: 'unhandledRejection' });
  });
};

// Start the server (only when not running under unit/integration test runner)
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

// Export app for testing (unchanged surface)
export default app;

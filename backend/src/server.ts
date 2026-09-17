import dns from 'dns';
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}
console.log('🚀 [STARTUP] server.ts initializing... PID:', process.pid, 'PORT:', process.env.PORT);
import mongoose from "mongoose";
import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import { rateLimit } from 'express-rate-limit';

// ⚠️  Sentry MUST be initialised before any other imports so it can instrument them
import { initSentry, sentryErrorHandler, captureException } from './config/sentry';
initSentry();

import { env } from './config/env';
import logger, { logError, logInfo } from './config/logger';
import database from './config/database';
import { outboxWorker } from './workers/outbox.worker';
import { inventoryReconciliationWorker } from './workers/inventory-reconciliation.worker';
import { autoCancelWorker } from './workers/auto-cancel.worker';
import { ensureDefaultCategories } from './services/category.service';

// Express app
const app: Application = express();

// =============================================================================
// MIDDLEWARE SETUP
// =============================================================================

// Trust proxy (for rate limiting and secure cookies behind reverse proxy)
if (env.TRUST_PROXY) {
  app.set('trust proxy', 1);
}

// Universal Strict CORS & Preflight Handler (Enterprise Security Whitelist)
const configuredOrigins = env.CORS_ORIGIN ? env.CORS_ORIGIN.split(',').map((o) => o.trim()) : [];

const isAllowedOrigin = (origin: string): boolean => {
  if (!origin) return true;
  try {
    const url = new URL(origin);
    const hostname = url.hostname;

    // 1. Allow production & preview Vercel domains
    if (hostname.endsWith('.vercel.app')) return true;

    // 2. Allow official brand domain & subdomains
    if (hostname === 'rawaqa.com' || hostname.endsWith('.rawaqa.com')) return true;

    // 3. Allow local development
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;

    // 4. Allow any explicitly configured origins in ENV
    if (configuredOrigins.some((allowed) => allowed.includes(hostname))) return true;

    return false;
  } catch {
    return false;
  }
};

app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;

  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else if (!origin) {
    // Mobile apps, server-to-server, curl
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
  
  const requestedHeaders = req.headers['access-control-request-headers'];
  if (requestedHeaders) {
    res.setHeader('Access-Control-Allow-Headers', requestedHeaders);
  } else {
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Session-ID, Idempotency-Key, idempotency-key, Accept-Language, accept-language, Cache-Control, Pragma, sentry-trace, baggage'
    );
  }
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

// =============================================================================
// HEALTH & READINESS ENDPOINTS (FASTEST POSSIBLE RESPONSE, EXEMPT FROM RATE LIMITING)
// =============================================================================

// Liveness probe: returns 200 as long as Node.js event loop is running (never touches MongoDB)
export const liveHealthHandler = (_req: Request, res: Response): void => {
  res.status(200).json({
    status: 'ok',
    environment: env.NODE_ENV,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
};

// Readiness probe: returns 200 if MongoDB is connected, 503 if not ready (includes safe redacted diagnostic when disconnected)
export const readyHealthHandler = async (req: Request, res: Response): Promise<void> => {
  const isReady = database.isConnected();
  const runProbes = req.query['probe'] === 'true';
  const diagnostic = !isReady || req.query['diagnostic'] === 'true'
    ? await database.getDiagnosticInfo(runProbes)
    : undefined;

  res.status(isReady ? 200 : 503).json({
    status: isReady ? 'ready' : 'not_ready',
    database: isReady ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    ...(diagnostic && { diagnostic }),
  });
};

// Dedicated safe non-destructive MongoDB diagnostic probe endpoint
export const dbDiagnosticHandler = async (_req: Request, res: Response): Promise<void> => {
  const diag = await database.getDiagnosticInfo(true);
  res.status(200).json(diag);
};

// Standard health check (returns HTTP 200 for cloud platform deployment probes, reporting database state in body)
export const standardHealthHandler = (_req: Request, res: Response): void => {
  const isDbConnected = database.isConnected();
  res.status(200).json({
    status: isDbConnected ? 'ok' : 'degraded',
    environment: env.NODE_ENV,
    database: isDbConnected ? 'connected' : 'disconnected',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
};

// Mount root health endpoints
app.get('/health/live', liveHealthHandler);
app.get('/health/ready', readyHealthHandler);
app.get('/health/db-diagnostic', dbDiagnosticHandler);
app.get('/health', standardHealthHandler);

// Security Headers
app.use(
  helmet({
    contentSecurityPolicy: env.HELMET_CSP_ENABLED ? undefined : false,
  })
);

// Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie Parser
app.use(cookieParser());

// Request Timeout Protection (Resource protection: 25s maximum execution time for non-upload API requests)
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.includes('/upload')) {
    return next();
  }
  const timer = setTimeout(() => {
    if (!res.headersSent) {
      logError('Request timeout exceeded (25s)', new Error(`Timeout: ${req.method} ${req.originalUrl}`));
      res.status(504).json({
        error: 'Gateway Timeout',
        message: 'The request took too long to complete. Please retry.',
      });
    }
  }, 25000);

  res.on('finish', () => clearTimeout(timer));
  res.on('close', () => clearTimeout(timer));
  next();
});

// Sanitize NoSQL injection
app.use(mongoSanitize());

// Sanitize XSS
import { xssSanitize } from './middleware/xss.middleware';
app.use(xssSanitize);

// HTTP Request Logging
if (env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(
    morgan('combined', {
      stream: logger.stream as any,
      skip: (req) => req.url.startsWith('/health'),
    })
  );
}

// Global Rate Limiting
const globalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// =============================================================================
// ROUTES
// =============================================================================

// Import routes
import authRoutes            from './routes/auth.routes';
import productRoutes         from './routes/product.routes';
import categoryRoutes        from './routes/category.routes';
import cartRoutes            from './routes/cart.routes';
import checkoutRoutes        from './routes/checkout.routes';
import orderRoutes           from './routes/order.routes';
import adminRoutes           from './routes/admin.routes';
import paymentRoutes         from './routes/payment.routes';
import couponRoutes          from './routes/coupon.routes';
import shippingAddressRoutes from './routes/shipping-address.routes';
import uploadRoutes          from './routes/upload.routes';
import wishlistRoutes        from './routes/wishlist.routes';
import reviewRoutes, { adminReviewRoutes } from './routes/review.routes';
import adRoutes, { adminAdRoutes } from './routes/ad.routes';
import contentRoutes, { adminContentRoutes } from './routes/content.routes';
import exportRoutes from './routes/export.routes';
import { getSettings } from './controllers/admin.controller';

import { featureFlag } from './middleware/feature-flag.middleware';

// Serve uploaded files statically
import path from 'path';
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// =============================================================================
// DATABASE GATEKEEPER (FAIL-FAST ADMISSION CONTROL)
// Protects the Node.js event loop, sockets, and memory from operation queuing.
// Rejects DB-dependent API requests immediately (<1ms) with HTTP 503 if MongoDB
// is disconnected or connecting. Never allows un-opened Mongoose queries to hang.
// =============================================================================
export const dbGatekeeper = (req: Request, res: Response, next: NextFunction): void => {
  // Always allow health checks and documentation through
  const path = req.originalUrl || req.url || req.path;
  if (
    path.includes('/health') ||
    path.includes('/docs')
  ) {
    return next();
  }

  // Check live Mongoose connection readyState (1 = connected)
  if (!database.isConnected()) {
    res.setHeader('Retry-After', '2');
    res.status(503).json({
      success: false,
      error: 'Service Unavailable',
      message: 'Database is currently connecting or unavailable. Please retry shortly.',
    });
    return;
  }

  next();
};

// API Routes (supports both /api and /api/v1)
const apiPrefixes = ['/api', '/api/v1'];
apiPrefixes.forEach(prefix => {
  // Mount health endpoints under API prefixes so /api/health/live, /api/v1/health/ready etc. work
  app.get(`${prefix}/health/live`, liveHealthHandler);
  app.get(`${prefix}/health/ready`, readyHealthHandler);
  app.get(`${prefix}/health/db-diagnostic`, dbDiagnosticHandler);
  app.get(`${prefix}/health`, standardHealthHandler);

  // Apply gatekeeper to all DB-dependent routes under this prefix
  app.use(prefix, dbGatekeeper);

  app.use(`${prefix}/auth`,          authRoutes);
  app.use(`${prefix}/products`,      productRoutes);
  app.use(`${prefix}/categories`,    categoryRoutes);
  app.use(`${prefix}/cart`,          cartRoutes);
  app.use(`${prefix}/checkout`,      checkoutRoutes);
  app.use(`${prefix}/orders`,        orderRoutes);
  app.use(`${prefix}/admin`,         adminRoutes);
  app.use(`${prefix}/admin/reviews`, adminReviewRoutes);
  app.use(`${prefix}/payments`,      paymentRoutes);
  app.use(`${prefix}/coupons`,       couponRoutes);
  app.use(`${prefix}/addresses`,     shippingAddressRoutes);
  app.use(`${prefix}/upload`,        uploadRoutes);
  app.use(`${prefix}/wishlist`,      featureFlag('FEATURE_WISHLIST'), wishlistRoutes);
  app.use(`${prefix}/products`,      reviewRoutes);   // mounts /:productId/reviews
  app.use(`${prefix}/ads`,           adRoutes);
  app.use(`${prefix}/admin/ads`,     adminAdRoutes);
  app.use(`${prefix}/content`,       contentRoutes);
  app.use(`${prefix}/admin/content`, adminContentRoutes);
  app.get(`${prefix}/settings`,      getSettings);
  app.use(`${prefix}/admin/export`,  exportRoutes);
});

// Standalone review actions (delete, approve, helpful, recent)
import { removeReview, approve, markHelpful, getRecentReviews } from './controllers/review.controller';
import { authenticate, requireAdmin } from './middleware/auth.middleware';
apiPrefixes.forEach(prefix => {
  app.get(   `${prefix}/reviews/recent`,      getRecentReviews);
  app.get(   `${prefix}/reviews`,             getRecentReviews);
  app.delete(`${prefix}/reviews/:id`,         authenticate, removeReview);
  app.put(   `${prefix}/reviews/:id/approve`, authenticate, requireAdmin, approve);
  app.post(  `${prefix}/reviews/:id/helpful`, featureFlag('FEATURE_REVIEWS'), markHelpful);
});

// Root Route
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'RAWAQA 2.0 API',
    version: '2.0.0',
    documentation: '/api/docs',
  });
});

// API Documentation (basic endpoint catalogue)
app.get('/api/docs', (_req: Request, res: Response) => {
  res.json({
    version: '2.0.0',
    baseUrl: '/api',
    endpoints: {
      auth: {
        'POST /auth/register':        'Register a new customer account',
        'POST /auth/login':           'Login and receive access + refresh tokens',
        'POST /auth/refresh':         'Exchange refresh token for new access token',
        'POST /auth/logout':          'Invalidate the current session',
        'POST /auth/logout-all':      'Invalidate all sessions for the user',
        'GET  /auth/me':              'Get current authenticated user',
        'PUT  /auth/profile':         'Update name / phone',
        'PUT  /auth/password':        'Change password',
        'POST /auth/send-phone-otp':  'Send OTP to phone number',
        'POST /auth/verify-phone':    'Verify OTP code',
        'POST /auth/forgot-password': 'Request password reset email',
        'POST /auth/reset-password':  'Reset password using token',
        'GET  /auth/sessions':        'List active sessions',
      },
      products: {
        'GET  /products':             'List products (page, limit, category, search, sort, minPrice, maxPrice)',
        'GET  /products/featured':    'Get featured products',
        'GET  /products/low-stock':   'Get low-stock products (admin)',
        'GET  /products/:id':         'Get single product',
        'GET  /products/:id/related': 'Get related products',
        'POST /products':             'Create product (admin)',
        'PUT  /products/:id':         'Update product (admin)',
        'DELETE /products/:id':       'Delete product (admin)',
      },
      categories: {
        'GET  /categories':           'List all categories (admin)',
        'GET  /categories/active':    'List active categories',
        'GET  /categories/:id':       'Get single category',
        'POST /categories':           'Create category (admin)',
        'PUT  /categories/:id':       'Update category (admin)',
        'DELETE /categories/:id':     'Delete category (admin)',
      },
      cart: {
        'GET    /cart':               'Get current cart',
        'POST   /cart/items':         'Add item to cart',
        'PUT    /cart/items/:id':     'Update item quantity',
        'DELETE /cart/items/:id':     'Remove item from cart',
        'DELETE /cart':               'Clear cart',
        'GET    /cart/totals':        'Get cart totals (optionally with governorate for shipping)',
        'POST   /cart/merge':         'Merge guest cart into authenticated cart',
      },
      checkout: {
        'POST /checkout':             'Place order (requires Idempotency-Key header)',
        'POST /checkout/cancel/:id':  'Cancel an order',
      },
      orders: {
        'GET /orders/my':             'Get current user orders',
        'GET /orders/stats':          'Get order statistics',
        'GET /orders/:id':            'Get order by ID',
        'GET /orders/number/:num':    'Get order by order number (public tracking)',
        'GET /orders':                'List all orders (admin)',
        'PUT /orders/:id/status':     'Update order status (admin)',
      },
      wishlist: {
        'GET    /wishlist':           'Get wishlist',
        'POST   /wishlist/:id':       'Add product to wishlist',
        'DELETE /wishlist/:id':       'Remove product from wishlist',
        'POST   /wishlist/:id/toggle':'Toggle product in wishlist',
        'GET    /wishlist/:id/check': 'Check if product is in wishlist',
        'DELETE /wishlist':           'Clear wishlist',
      },
      reviews: {
        'GET  /products/:id/reviews': 'List reviews for a product',
        'POST /products/:id/reviews': 'Submit a review (authenticated, must have purchased)',
        'POST /reviews/:id/helpful':  'Mark review as helpful',
        'DELETE /reviews/:id':        'Delete own review',
        'PUT  /reviews/:id/approve':  'Approve review (admin)',
      },
      addresses: {
        'GET    /addresses':          'Get saved shipping addresses',
        'POST   /addresses':          'Add a shipping address',
        'PUT    /addresses/:id':      'Update a shipping address',
        'DELETE /addresses/:id':      'Delete a shipping address',
      },
      coupons: {
        'POST /coupons/apply':        'Apply coupon code',
        'POST /coupons/validate':     'Validate coupon without applying',
        'GET  /coupons':              'List coupons (admin)',
        'POST /coupons':              'Create coupon (admin)',
        'PUT  /coupons/:id':          'Update coupon (admin)',
        'DELETE /coupons/:id':        'Delete coupon (admin)',
      },
      admin: {
        'GET /admin/customers':       'List customers (admin)',
        'GET /admin/customers/:id':   'Get customer details (admin)',
        'PUT /admin/customers/:id/role':   'Change user role (super_admin)',
        'PUT /admin/customers/:id/ban':    'Toggle user ban (admin)',
        'PUT /admin/customers/:id/delete': 'Soft-delete user (admin)',
        'GET /admin/reviews/pending': 'List pending reviews (admin)',
        'GET /admin/settings':        'Get site settings (admin)',
        'PUT /admin/settings':        'Update site settings (admin)',
      },
      upload: {
        'POST /upload/product':       'Upload product image (admin, multipart/form-data)',
      },
    },
  });
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

// Sentry must capture errors BEFORE the custom error handler responds
app.use(sentryErrorHandler());

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    path: req.path,
  });
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  let sanitizedBody: any = req.body;
  if (req.body && typeof req.body === 'object') {
    sanitizedBody = { ...req.body };
    const sensitiveKeys = ['password', 'confirmPassword', 'currentPassword', 'newPassword', 'token', 'refreshToken', 'secret', 'otp'];
    sensitiveKeys.forEach((key) => {
      if (key in sanitizedBody) {
        sanitizedBody[key] = '[REDACTED]';
      }
    });
  }

  logError('Unhandled error', err, {
    method: req.method,
    path: req.path,
    body: sanitizedBody,
    query: req.query,
  });

  // Handle Mongoose connection / server selection errors gracefully (prevents 502 gateway timeouts)
  const isDbError =
    err.name === 'MongooseServerSelectionError' ||
    err.name === 'MongoNotConnectedError' ||
    err.name === 'MongoNetworkError';
  const status = isDbError ? 503 : (err.status || 500);

  // Don't leak error details in production
  const message = isDbError
    ? 'Service temporarily unavailable — database initializing, please retry shortly'
    : (env.NODE_ENV === 'production' ? 'Internal server error' : err.message);

  res.status(status).json({
    error: err.name || 'Error',
    message,
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

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
    if (mongoose.connection.readyState !== 1) {
      logInfo('Skipping worker start — MongoDB is not connected');
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

    mongoose.connection.on('reconnected', () => {
      logInfo('MongoDB reconnected — scheduling worker restart once');
      stopBackgroundWorkers();
      workerRestartTimer = setTimeout(() => {
        workerRestartTimer = null;
        if (mongoose.connection.readyState !== 1) {
          logInfo('Skipping worker restart — MongoDB is not connected');
          return;
        }
        logInfo('Starting background workers after reconnect');
        startBackgroundWorkers();
      }, 2000);
    });

    mongoose.connection.on('disconnected', () => {
      logInfo('MongoDB disconnected — pausing workers once');
      stopBackgroundWorkers();
    });
  };

  // 2. Connect to Database asynchronously in background without blocking port discovery
  const initDbAndWorkers = async (retries = 5, delay = 3000) => {
    try {
      await database.connect();
      console.log('✅ Database connected');
      logInfo('Database successfully initialized');

      // Initialize default essential categories once at startup (idempotent, never inside request path)
      await ensureDefaultCategories();

      // 3. Start background workers AFTER DB is confirmed connected
      if (env.ENABLE_WORKERS) {
        logInfo('Starting background workers');
        startBackgroundWorkers();
        bindWorkerLifecycleOnce();
      }
    } catch (error: any) {
      console.error(`❌ Database connection attempt failed (${retries} retries left):`, error?.message || error);
      logError(`Database connection attempt failed (${retries} retries left):`, error);
      if (retries > 0) {
        setTimeout(() => initDbAndWorkers(retries - 1, delay * 1.5), delay);
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
        // Close database connection if open
        if (database.isConnected()) {
          await database.disconnect();
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

// Export app for testing
export default app;

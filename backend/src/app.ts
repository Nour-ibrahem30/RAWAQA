/**
 * app.ts — Pure Express application (runtime-agnostic)
 * =============================================================================
 * This module builds and exports the Express `app` with ALL middleware, CORS,
 * health endpoints, routes, and error handlers. It contains NO runtime-specific
 * startup logic:
 *   - NO `app.listen()`
 *   - NO `./config/dns` import (Node DNS monkey-patch stays in server.ts)
 *   - NO background worker imports/scheduling
 *   - NO process signal handlers (SIGTERM/SIGINT/uncaught/unhandled)
 *
 * Both entry points consume this module:
 *   - Node:       src/server.ts   (imports app + dns + Sentry + workers + listen)
 *   - Cloudflare: src/worker.ts   (imports app + httpServerHandler)
 *
 * Behavior is byte-for-byte identical to the previous server.ts app definition.
 * =============================================================================
 */
import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';

import { getRuntimeRateLimitStore, isCloudflareWorker, getWorkerRateLimitKeyGenerator } from './lib/worker-runtime';
import { sentryErrorHandler } from './config/sentry';
import { env } from './config/env';
import logger, { logError } from './config/logger';
import { checkPrismaConnection, runWithRequestPrisma } from './lib/prisma';

// Express app
const app: Application = express();

// =============================================================================
// MIDDLEWARE SETUP
// =============================================================================

// Worker-only per-request Prisma lifecycle.
// On Cloudflare Workers, a module-scope Neon WebSocket client goes stale between
// requests ("Connection terminated"). This wraps each request in an async
// context bound to a fresh Prisma client that is disposed when the request ends,
// so no dead socket is reused. Interactive transactions are preserved (still the
// Neon WebSocket adapter). This middleware is mounted ONLY on the Worker — on
// Node/Render nothing changes and the module-scope singleton is used as before.
if (isCloudflareWorker()) {
  app.use((_req: Request, res: Response, next: NextFunction) => {
    runWithRequestPrisma(
      () =>
        new Promise<void>((resolve) => {
          // Resolve the async context when the response finishes so the
          // per-request client is disconnected only after all work completes.
          res.on('finish', resolve);
          res.on('close', resolve);
          next();
        })
    ).catch((err) => {
      logError('runWithRequestPrisma failed', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal Server Error', message: 'Request context failed' });
      }
    });
  });
}

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

// Liveness probe: returns 200 as long as the runtime is responding
export const liveHealthHandler = (_req: Request, res: Response): void => {
  res.status(200).json({
    status: 'ok',
    environment: env.NODE_ENV,
    uptime: typeof process !== 'undefined' && typeof process.uptime === 'function'
      ? Math.floor(process.uptime())
      : 0,
    timestamp: new Date().toISOString(),
  });
};

// Readiness probe: returns 200 if PostgreSQL (Prisma) is reachable, 503 if not ready
export const readyHealthHandler = async (_req: Request, res: Response): Promise<void> => {
  const isReady = await checkPrismaConnection();
  res.status(isReady ? 200 : 503).json({
    status: isReady ? 'ready' : 'not_ready',
    database: isReady ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
};

// Dedicated PostgreSQL diagnostic probe endpoint (safe, non-destructive)
export const dbDiagnosticHandler = async (_req: Request, res: Response): Promise<void> => {
  const connected = await checkPrismaConnection();
  const host = (process.env.DATABASE_URL || '').match(/@([^/?]+)/)?.[1] || null;
  res.status(200).json({
    engine: 'postgresql',
    connected,
    configured: !!process.env.DATABASE_URL,
    host,
    timestamp: new Date().toISOString(),
  });
};

// Standard health check (returns HTTP 200 for cloud platform deployment probes, reporting database state in body)
export const standardHealthHandler = async (_req: Request, res: Response): Promise<void> => {
  const hasPg = !!process.env.DATABASE_URL;
  const isConnected = hasPg ? await checkPrismaConnection() : false;
  res.status(200).json({
    status:      isConnected ? 'ok' : 'degraded',
    environment: env.NODE_ENV,
    database:    isConnected ? 'connected' : 'disconnected',
    postgresql:  hasPg ? 'configured' : 'not_configured',
    uptime:      typeof process !== 'undefined' && typeof process.uptime === 'function'
      ? Math.floor(process.uptime())
      : 0,
    timestamp:   new Date().toISOString(),
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
// `store` is undefined on Node/Render -> express-rate-limit uses its default
// MemoryStore (with periodic sweep) exactly as before. On Cloudflare Workers it
// returns a timer-free store so the limiter can be constructed at module scope
// without the forbidden global-scope setInterval. Limits/window/headers are
// identical in both runtimes. See src/lib/worker-runtime.ts.
const globalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  store: getRuntimeRateLimitStore(),
  // On Workers, req.ip is undefined (node:http bridge does not populate it the
  // same way), which causes express-rate-limit's built-in ip validation to throw
  // ERR_ERL_UNDEFINED_IP_ADDRESS. We supply a Worker-only keyGenerator that reads
  // CF-Connecting-IP (the real client IP set by Cloudflare's edge) with safe
  // fallbacks. On Node/Render this returns undefined → default behavior unchanged.
  ...(getWorkerRateLimitKeyGenerator() ? { keyGenerator: getWorkerRateLimitKeyGenerator()! } : {}),
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

// Serve uploaded files statically.
// NOTE: Local static uploads are a Node-only capability and do NOT function on
// Cloudflare Workers (no persistent filesystem). Upload storage moves to R2 in a
// dedicated later phase — see docs/05-database/cloudflare-workers-migration.md §7.
// `__dirname` is a CommonJS-only global that does not exist in the ESM Worker
// bundle (ReferenceError at module scope), so this mount is registered on Node
// only. Node/Render behavior is unchanged; on the Worker the (deferred) upload
// endpoints simply have no local static route.
import path from 'path';
if (!isCloudflareWorker()) {
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
}

// =============================================================================
// DATABASE GATEKEEPER (FAIL-FAST ADMISSION CONTROL)
// Protects the runtime from operation queuing when the DB layer is unavailable.
// Rejects DB-dependent API requests immediately (<1ms) with HTTP 503 if the
// database layer is unavailable. PostgreSQL (Prisma) is the primary DB.
// =============================================================================
export const dbGatekeeper = (req: Request, res: Response, next: NextFunction): void => {
  const path = req.originalUrl || req.url || req.path;
  if (path.includes('/health') || path.includes('/docs')) {
    return next();
  }

  // PostgreSQL must be configured — it drives all active business logic
  if (!process.env.DATABASE_URL) {
    res.setHeader('Retry-After', '5');
    res.status(503).json({
      success: false,
      error: 'Service Unavailable',
      message: 'PostgreSQL database not configured.',
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

// Sentry must capture errors BEFORE the custom error handler responds.
// When Sentry is not initialized (e.g. on Worker, or no DSN), this returns a
// safe passthrough handler — see config/sentry.ts.
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

  // Handle PostgreSQL/Prisma connection errors gracefully (prevents 502 gateway timeouts)
  const isDbError =
    err.name === 'PrismaClientInitializationError' ||
    err.name === 'PrismaClientRustPanicError' ||
    err.code === 'P1001' ||   // Can't reach database server
    err.code === 'P1002' ||   // Database server timed out
    err.code === 'P1017';     // Server has closed the connection
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

// Export app for both Node (server.ts) and Cloudflare (worker.ts) entry points
export default app;

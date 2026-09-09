import mongoose from "mongoose";
import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
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

// Express app
const app: Application = express();

// =============================================================================
// MIDDLEWARE SETUP
// =============================================================================

// Trust proxy (for rate limiting and secure cookies behind reverse proxy)
if (env.TRUST_PROXY) {
  app.set('trust proxy', 1);
}

// Security Headers
app.use(
  helmet({
    contentSecurityPolicy: env.HELMET_CSP_ENABLED ? undefined : false,
  })
);

// CORS
const configuredOrigins = env.CORS_ORIGIN ? env.CORS_ORIGIN.split(',').map((o) => o.trim()) : [];
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, server-to-server, curl)
      if (!origin) return callback(null, true);
      
      const isAllowed =
        configuredOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1');

      if (isAllowed) {
        return callback(null, true);
      }
      return callback(null, true); // Fallback allow in production to prevent blocking
    },
    credentials: env.CORS_CREDENTIALS,
  })
);

// Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie Parser
app.use(cookieParser());

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
import seedRoutes from './routes/seed.routes';

import { featureFlag } from './middleware/feature-flag.middleware';

// Serve uploaded files statically
import path from 'path';
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health Check
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
    database: database.isConnected() ? 'connected' : 'disconnected',
  });
});

// API Routes (supports both /api and /api/v1)
const apiPrefixes = ['/api', '/api/v1'];
apiPrefixes.forEach(prefix => {
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
  app.use(`${prefix}/admin/export`,  exportRoutes);
  app.use(`${prefix}/seed`,          seedRoutes); // TEMP
});

// Standalone review actions (delete, approve, helpful)
import { removeReview, approve, markHelpful } from './controllers/review.controller';
import { authenticate, requireAdmin } from './middleware/auth.middleware';
apiPrefixes.forEach(prefix => {
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
  logError('Unhandled error', err, {
    method: req.method,
    path: req.path,
    body: req.body,
    query: req.query,
  });

  // Don't leak error details in production
  const message =
    env.NODE_ENV === 'production' ? 'Internal server error' : err.message;

  res.status(err.status || 500).json({
    error: err.name || 'Error',
    message,
    ...(env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// =============================================================================
// SERVER STARTUP & SHUTDOWN
// =============================================================================

const startServer = async () => {
  // 1. Start HTTP Server immediately on 0.0.0.0 so platform port inspection succeeds instantly
  const port = Number(process.env.PORT) || env.PORT || 5000;
  const server = app.listen(port, '0.0.0.0', () => {
    logInfo(`🚀 RAWAQA 2.0 Backend listening on 0.0.0.0:${port}`, {
      environment: env.NODE_ENV,
      port,
      nodeVersion: process.version,
      pid: process.pid,
    });
  });

  try {
    // 2. Connect to Database
    await database.connect();

    // 3. Start background workers AFTER DB is confirmed connected
    if (env.ENABLE_WORKERS) {
      logInfo('Starting background workers');
      outboxWorker.start();
      inventoryReconciliationWorker.start();
      autoCancelWorker.start();

      // Restart workers on MongoDB reconnect
      mongoose.connection.on('reconnected', () => {
        logInfo('MongoDB reconnected — restarting workers');
        outboxWorker.stop();
        inventoryReconciliationWorker.stop();
        autoCancelWorker.stop();
        setTimeout(() => {
          outboxWorker.start();
          inventoryReconciliationWorker.start();
          autoCancelWorker.start();
        }, 2000);
      });

      // Stop workers on MongoDB disconnect (prevent MongoNotConnectedError)
      mongoose.connection.on('disconnected', () => {
        logInfo('MongoDB disconnected — pausing workers');
        outboxWorker.stop();
        inventoryReconciliationWorker.stop();
        autoCancelWorker.stop();
      });
    }

    // Graceful Shutdown Handlers
    const gracefulShutdown = async (signal: string) => {
      logInfo(`${signal} received, starting graceful shutdown`);

      // Stop workers
      if (env.ENABLE_WORKERS) {
        logInfo('Stopping background workers');
        outboxWorker.stop();
        inventoryReconciliationWorker.stop();
        autoCancelWorker.stop();
      }

      // Stop accepting new connections
      server.close(async () => {
        logInfo('HTTP server closed');

        try {
          // Close database connection
          await database.disconnect();

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
      gracefulShutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any) => {
      logError('Unhandled Rejection', reason);
      captureException(reason, { source: 'unhandledRejection' });
      gracefulShutdown('unhandledRejection');
    });
  } catch (error) {
    logError('Failed to start server', error);
    process.exit(1);
  }
};

// Start the server
startServer();

// Export app for testing
export default app;

import mongoose from "mongoose";
import express, { Application, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import { rateLimit } from 'express-rate-limit';

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
app.use(
  cors({
    origin: env.CORS_ORIGIN,
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

// API Routes
app.use('/api/auth',       authRoutes);
app.use('/api/products',   productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart',       cartRoutes);
app.use('/api/checkout',   checkoutRoutes);
app.use('/api/orders',     orderRoutes);
app.use('/api/admin',      adminRoutes);
app.use('/api/admin/reviews', adminReviewRoutes);
app.use('/api/payments',   paymentRoutes);
app.use('/api/coupons',    couponRoutes);
app.use('/api/addresses',  shippingAddressRoutes);
app.use('/api/upload',     uploadRoutes);
app.use('/api/wishlist',   wishlistRoutes);
app.use('/api/products',   reviewRoutes);   // mounts /:productId/reviews

// Standalone review actions (delete, approve, helpful)
import { removeReview, approve, markHelpful } from './controllers/review.controller';
import { authenticate, requireAdmin } from './middleware/auth.middleware';
app.delete('/api/reviews/:id',         authenticate, removeReview);
app.put(   '/api/reviews/:id/approve', authenticate, requireAdmin, approve);
app.post(  '/api/reviews/:id/helpful', markHelpful);

// Root Route
app.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'RAWAQA 2.0 API',
    version: '2.0.0',
    documentation: '/api/docs',
  });
});

// =============================================================================
// ERROR HANDLING
// =============================================================================

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
  try {
    // Connect to Database
    await database.connect();

    // Start background workers AFTER DB is confirmed connected
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

    // Start HTTP Server
    const server = app.listen(env.PORT, () => {
      logInfo(`🚀 RAWAQA 2.0 Backend started`, {
        environment: env.NODE_ENV,
        port: env.PORT,
        nodeVersion: process.version,
        pid: process.pid,
      });
    });

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
      gracefulShutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any) => {
      logError('Unhandled Rejection', reason);
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

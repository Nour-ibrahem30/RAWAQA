import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Define the schema for environment variables
const envSchema = z.object({
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('5000'),

  // Database
  MONGODB_URI: z.string().min(1),
  MONGODB_URI_TEST: z.string().optional(),
  MONGODB_MAX_POOL_SIZE: z.string().transform(Number).pipe(z.number().positive()).default('10'),
  MONGODB_MIN_POOL_SIZE: z.string().transform(Number).pipe(z.number().positive()).default('2'),
  MONGODB_SOCKET_TIMEOUT: z.string().transform(Number).pipe(z.number().positive()).default('45000'),
  MONGODB_SERVER_SELECTION_TIMEOUT: z.string().transform(Number).pipe(z.number().positive()).default('5000'),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Bcrypt
  BCRYPT_ROUNDS: z.string().transform(Number).pipe(z.number().min(8).max(15)).default('10'),

  // Session
  MAX_ACTIVE_SESSIONS_PER_USER: z.string().transform(Number).pipe(z.number().positive()).default('5'),
  SESSION_INACTIVITY_TIMEOUT: z.string().default('30d'),

  // Cookies
  COOKIE_DOMAIN: z.string().default('localhost'),
  COOKIE_SECURE: z.string().transform((val) => val === 'true').default('false'),
  COOKIE_SAME_SITE: z.enum(['strict', 'lax', 'none']).default('lax'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  CORS_CREDENTIALS: z.string().transform((val) => val === 'true').default('true'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).pipe(z.number().positive()).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).pipe(z.number().positive()).default('100'),
  AUTH_RATE_LIMIT_WINDOW_MS: z.string().transform(Number).pipe(z.number().positive()).default('900000'),
  AUTH_RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).pipe(z.number().positive()).default('5'),

  // Email (SMTP)
  SMTP_HOST:   z.string().optional(),
  SMTP_PORT:   z.string().transform(Number).pipe(z.number().min(1)).default('587'),
  SMTP_SECURE: z.string().transform((v) => v === 'true').default('false'),
  SMTP_USER:   z.string().optional(),
  SMTP_PASS:   z.string().optional(),
  SMTP_FROM:   z.string().optional(),

  // Paymob Payment Gateway
  PAYMOB_API_KEY:               z.string().optional(),
  PAYMOB_INTEGRATION_ID_CARD:   z.string().transform(Number).pipe(z.number().min(0)).default('0'),
  PAYMOB_INTEGRATION_ID_WALLET: z.string().transform(Number).pipe(z.number().min(0)).default('0'),
  PAYMOB_IFRAME_ID:             z.string().optional(),
  PAYMOB_HMAC_SECRET:           z.string().optional(),

  // Odoo
  ODOO_URL: z.string().url().optional(),
  ODOO_DB: z.string().optional(),
  ODOO_USERNAME: z.string().optional(),
  ODOO_PASSWORD: z.string().optional(),
  ODOO_TIMEOUT: z.string().transform(Number).pipe(z.number().positive()).default('30000'),
  ODOO_MAX_RETRIES: z.string().transform(Number).pipe(z.number().positive()).default('3'),
  ODOO_RETRY_DELAY: z.string().transform(Number).pipe(z.number().positive()).default('1000'),
  ODOO_SYNC_ENABLED: z.string().transform((val) => val === 'true').default('false'),
  ODOO_SYNC_INTERVAL_HOURS: z.string().transform(Number).pipe(z.number().positive()).default('6'),

  // SMS
  SMS_PROVIDER: z.enum(['twilio', 'victorylink', 'vonage', 'mock']).default('mock'),
  SMS_ENABLED: z.string().transform((val) => val === 'true').default('false'),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  VONAGE_API_KEY: z.string().optional(),
  VONAGE_API_SECRET: z.string().optional(),
  VONAGE_FROM_NUMBER: z.string().optional(),
  SMS_TEST_NUMBER: z.string().optional(),
  SMS_MAX_RETRIES: z.string().transform(Number).pipe(z.number().positive()).default('3'),
  SMS_RETRY_DELAY: z.string().transform(Number).pipe(z.number().positive()).default('2000'),

  // Workers
  ENABLE_WORKERS: z.string().transform((val) => val === 'true').default('true'),
  
  // Outbox Worker
  OUTBOX_WORKER_ENABLED: z.string().transform((val) => val === 'true').default('true'),
  OUTBOX_WORKER_INTERVAL_MS: z.string().transform(Number).pipe(z.number().positive()).default('5000'),
  OUTBOX_WORKER_LEASE_DURATION_MS: z.string().transform(Number).pipe(z.number().positive()).default('60000'),
  OUTBOX_WORKER_MAX_ATTEMPTS: z.string().transform(Number).pipe(z.number().positive()).default('10'),
  OUTBOX_WORKER_BATCH_SIZE: z.string().transform(Number).pipe(z.number().positive()).default('10'),

  // Reconciliation
  RECONCILIATION_ENABLED: z.string().transform((val) => val === 'true').default('false'),
  RECONCILIATION_CRON: z.string().default('0 2 * * *'),
  RECONCILIATION_AUTO_CORRECT_THRESHOLD_MINUTES: z.string().transform(Number).pipe(z.number().positive()).default('5'),
  RECONCILIATION_ALERT_EMAIL: z.string().email().optional(),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug']).default('info'),
  LOG_FILE_ENABLED: z.string().transform((val) => val === 'true').default('true'),
  LOG_ROTATION_MAX_SIZE: z.string().default('20m'),
  LOG_ROTATION_MAX_FILES: z.string().default('14d'),

  // Idempotency
  IDEMPOTENCY_TTL_HOURS: z.string().transform(Number).pipe(z.number().positive()).default('24'),
  IDEMPOTENCY_PROCESSING_TIMEOUT_MS: z.string().transform(Number).pipe(z.number().positive()).default('120000'),

  // Cart
  CART_GUEST_SESSION_EXPIRY_DAYS: z.string().transform(Number).pipe(z.number().positive()).default('7'),
  CART_ITEM_MAX_QUANTITY: z.string().transform(Number).pipe(z.number().positive()).default('99'),

  // Order
  ORDER_AUTO_CANCEL_UNPAID_HOURS: z.string().transform(Number).pipe(z.number().positive()).default('24'),
  ORDER_PENDING_ALERT_HOURS: z.string().transform(Number).pipe(z.number().positive()).default('48'),

  // File Uploads
  UPLOAD_MAX_FILE_SIZE: z.string().transform(Number).pipe(z.number().positive()).default('5242880'),
  UPLOAD_ALLOWED_TYPES: z.string().default('image/jpeg,image/png,image/webp'),
  UPLOAD_DESTINATION: z.string().default('uploads/products'),

  // Client URLs
  CLIENT_URL: z.string().url().default('http://localhost:3000'),
  CLIENT_URL_AR: z.string().url().default('http://localhost:3000/ar'),
  CLIENT_URL_EN: z.string().url().default('http://localhost:3000/en'),

  // Admin
  ADMIN_EMAIL: z.string().email().default('admin@rawaqa.com'),
  ADMIN_PASSWORD: z.string().min(8).optional(),

  // Security
  HELMET_CSP_ENABLED: z.string().transform((val) => val === 'true').default('true'),
  TRUST_PROXY: z.string().transform((val) => val === 'true').default('false'),

  // Monitoring
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().default('development'),
  HEALTH_CHECK_ENABLED: z.string().transform((val) => val === 'true').default('true'),

  // Performance
  CACHE_ENABLED: z.string().transform((val) => val === 'true').default('false'),
  CACHE_TTL_SECONDS: z.string().transform(Number).pipe(z.number().positive()).default('300'),

  // Feature Flags
  FEATURE_GUEST_CHECKOUT: z.string().transform((val) => val === 'true').default('false'),
  FEATURE_REVIEWS: z.string().transform((val) => val === 'true').default('false'),
  FEATURE_WISHLIST: z.string().transform((val) => val === 'true').default('false'),
  FEATURE_REFERRAL: z.string().transform((val) => val === 'true').default('false'),
});

// Parse and validate environment variables
const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment variable validation failed:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      throw new Error('Invalid environment configuration');
    }
    throw error;
  }
};

// Export validated environment variables
export const env = parseEnv();

// Type export for IDE autocomplete
export type Env = z.infer<typeof envSchema>;

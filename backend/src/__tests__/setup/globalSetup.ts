/**
 * Jest global setup — sets baseline test environment.
 * The app runs entirely on PostgreSQL/Prisma; no MongoDB is used.
 */
export default async function globalSetup() {
  // Baseline test env — always set so any test that boots the app has valid config
  process.env.NODE_ENV             = 'test';
  process.env.JWT_ACCESS_SECRET    = 'test-access-secret-at-least-32-characters-long';
  process.env.JWT_REFRESH_SECRET   = 'test-refresh-secret-at-least-32-characters-long';
  process.env.CLOUDINARY_ENABLED   = 'false';
  process.env.SENTRY_DSN           = '';
  process.env.SMS_ENABLED          = 'false';
  process.env.ENABLE_WORKERS       = 'false';
}

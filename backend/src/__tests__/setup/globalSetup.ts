/**
 * Jest global setup — starts an in-memory MongoDB instance before any test suite.
 * The URI is written to process.env so all tests share the same in-memory DB.
 */
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod: MongoMemoryServer;

export default async function globalSetup() {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI          = mongod.getUri();
  process.env.MONGODB_URI_TEST     = mongod.getUri();
  process.env.NODE_ENV             = 'test';
  process.env.JWT_ACCESS_SECRET    = 'test-access-secret-at-least-32-characters-long';
  process.env.JWT_REFRESH_SECRET   = 'test-refresh-secret-at-least-32-characters-long';
  process.env.CLOUDINARY_ENABLED   = 'false';
  process.env.SENTRY_DSN           = '';
  process.env.SMS_ENABLED          = 'false';
  process.env.ENABLE_WORKERS       = 'false';

  // Store instance ref for teardown
  (global as any).__MONGOD__ = mongod;
}

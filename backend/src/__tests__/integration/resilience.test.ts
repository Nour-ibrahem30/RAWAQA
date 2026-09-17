/**
 * Integration Test: Database Disconnect & Resilience Tests (Tests A, B, C, D)
 * Validates fail-fast database gatekeeper, health probe isolation, and normal connected operations.
 */
import request from 'supertest';
import mongoose from 'mongoose';
import { connectTestDB, disconnectTestDB } from '../setup/db';

let app: any;

beforeAll(async () => {
  // Ensure DB is disconnected first to test disconnected behaviors
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  const mod = await import('../../server');
  app = (mod as any).default;
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});

describe('Database Disconnected Resilience (Fail-Fast Admission & Probes)', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    expect(mongoose.connection.readyState).toBe(0);
  });

  // ─── Test A: 50 Concurrent Requests to DB-backed endpoint ───────────────────
  it('Test A: rejects 50 concurrent requests to /api/v1/products with 503 immediately (<100ms, NO 10s buffer)', async () => {
    const startTime = Date.now();
    const concurrentCount = 50;

    const promises = Array.from({ length: concurrentCount }, () =>
      request(app).get('/api/v1/products')
    );

    const responses = await Promise.all(promises);
    const totalDuration = Date.now() - startTime;

    expect(responses).toHaveLength(concurrentCount);
    for (const res of responses) {
      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Service Unavailable');
      expect(res.headers['retry-after']).toBe('2');
    }

    // Must complete rapidly without any 10,000ms Mongoose buffering timeouts
    expect(totalDuration).toBeLessThan(3000); // 50 requests all resolved in << 3s total
  });

  // ─── Test B: Health while DB disconnected ──────────────────────────────────
  it('Test B: /health/live returns 200 fast while database is disconnected', async () => {
    const startTime = Date.now();
    const res = await request(app).get('/health/live');
    const duration = Date.now() - startTime;

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(duration).toBeLessThan(100);
  });

  it('Test B2: /api/v1/health/live also returns 200 fast while database is disconnected', async () => {
    const res = await request(app).get('/api/v1/health/live');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  // ─── Test C: Readiness while DB disconnected ───────────────────────────────
  it('Test C: /health/ready returns 503 while database is disconnected', async () => {
    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('not_ready');
    expect(res.body.database).toBe('disconnected');
  });
});

describe('Database Connected Operations (Normal Traffic Verification)', () => {
  beforeAll(async () => {
    await connectTestDB();
    expect(mongoose.connection.readyState).toBe(1);
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  // ─── Test D: Connected Endpoints ───────────────────────────────────────────
  it('Test D1: /health/live returns 200 when connected', async () => {
    const res = await request(app).get('/health/live');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('Test D2: /health/ready returns 200 when connected', async () => {
    const res = await request(app).get('/health/ready');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ready');
    expect(res.body.database).toBe('connected');
  });

  it('Test D3: /api/v1/categories returns 200 when connected', async () => {
    const res = await request(app).get('/api/v1/categories');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('Test D4: /api/v1/products returns 200 when connected', async () => {
    const res = await request(app).get('/api/v1/products');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('Test D5: /api/v1/products/featured returns 200 when connected', async () => {
    const res = await request(app).get('/api/v1/products/featured');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

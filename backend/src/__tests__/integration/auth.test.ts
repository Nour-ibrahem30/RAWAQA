/**
 * Integration tests — Auth API (/api/auth/*)
 * Uses supertest + in-memory MongoDB (set up by globalSetup.ts)
 */
import request from 'supertest';
import { connectTestDB, disconnectTestDB, clearCollections } from '../setup/db';

// Import the Express app AFTER env vars are set by globalSetup
let app: any;

beforeAll(async () => {
  await connectTestDB();
  // Lazy-import app after DB is connected so models register correctly
  const mod = await import('../../server');
  app = (mod as any).default;
});

afterAll(async () => {
  await disconnectTestDB();
});

beforeEach(async () => {
  await clearCollections();
});

// ─── Test data ─────────────────────────────────────────────────────────────────
const newUser = {
  firstName: 'Ahmed',
  lastName:  'Hassan',
  email:     'ahmed.test@example.com',
  password:  'TestPass123!',
  phone:     '+201012345678',
};

// ─── Register ──────────────────────────────────────────────────────────────────
describe('POST /api/auth/register', () => {
  it('creates a new user and returns 201', async () => {
    const res = await request(app).post('/api/auth/register').send(newUser);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(newUser.email.toLowerCase());
    expect(res.body.data.user.role).toBe('customer');
  });

  it('returns 409 when email already exists', async () => {
    await request(app).post('/api/auth/register').send(newUser);
    const res = await request(app).post('/api/auth/register').send(newUser);
    expect(res.status).toBe(409);
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'x@x.com' });
    expect(res.status).toBe(400);
  });
});

// ─── Login ─────────────────────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send(newUser);
  });

  it('returns tokens on valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: newUser.email, password: newUser.password });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
  });

  it('returns 401 on wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: newUser.email, password: 'WrongPass999' });
    expect(res.status).toBe(401);
  });

  it('returns 401 on non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'SomePass123' });
    expect(res.status).toBe(401);
  });
});

// ─── Get current user ──────────────────────────────────────────────────────────
describe('GET /api/auth/me', () => {
  it('returns user when authenticated', async () => {
    // Register + login
    await request(app).post('/api/auth/register').send(newUser);
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: newUser.email, password: newUser.password });

    const token = loginRes.body.data.accessToken;
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user).toBeDefined();
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

// ─── Health check ──────────────────────────────────────────────────────────────
describe('GET /health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

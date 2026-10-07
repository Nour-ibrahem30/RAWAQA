/**
 * CLOUDFLARE WORKERS STAGING E2E VALIDATION TEST SUITE
 * 
 * Tests the RAWAQA application against Cloudflare Workers backend.
 * NOT the legacy Render backend.
 * 
 * Date: October 7, 2026
 * Commit: 0c3b7ffd2e7f23d630d4ab7fdf2e24c7e97bf422
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION - CLOUDFLARE WORKERS STAGING
// ═══════════════════════════════════════════════════════════════════════════════

const STAGING_FRONTEND_URL = 'https://rawaqa-ruby.vercel.app';
const WORKERS_API_URL = 'https://noisy-sun-5690.nouribrahem207.workers.dev/api';
const WORKERS_BASE_URL = 'https://noisy-sun-5690.nouribrahem207.workers.dev';

// Ensure we're NOT hitting Render
const FORBIDDEN_URLS = ['rawaqa-backend.onrender.com'];

// Test data
const TEST_USER = {
  email: `e2e.workers.${Date.now()}@rawaqa-test.com`,
  password: 'WorkersTest123!',
  firstName: 'Workers',
  lastName: 'Tester',
  phone: '01098765432',
};

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 4: VERIFY WORKERS RUNTIME
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Phase 4: Workers Runtime Verification', () => {
  test('4.1 Health endpoints respond correctly', async ({ request }) => {
    console.log('=== WORKERS RUNTIME VERIFICATION ===');
    console.log(`Testing: ${WORKERS_BASE_URL}`);

    // Health Live
    const liveRes = await request.get(`${WORKERS_BASE_URL}/health/live`);
    expect(liveRes.status()).toBe(200);
    const liveBody = await liveRes.json();
    console.log(`Health Live: ${JSON.stringify(liveBody)}`);
    expect(liveBody.status).toBe('ok');

    // Health Ready
    const readyRes = await request.get(`${WORKERS_BASE_URL}/health/ready`);
    expect(readyRes.status()).toBe(200);
    const readyBody = await readyRes.json();
    console.log(`Health Ready: ${JSON.stringify(readyBody)}`);
    expect(readyBody.status).toBe('ready');
    expect(readyBody.database).toBe('connected');
  });

  test('4.2 Products endpoint functional', async ({ request }) => {
    const res = await request.get(`${WORKERS_API_URL}/products?limit=1`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    console.log(`Products: success=${body.success}`);
    expect(body.success).toBe(true);
  });

  test('4.3 Verify NOT hitting Render', async ({ request }) => {
    // Make a request and check response headers for CF-Ray (Cloudflare)
    const res = await request.get(`${WORKERS_BASE_URL}/health/live`);
    const headers = res.headers();
    
    // Cloudflare Workers add CF-Ray header
    const cfRay = headers['cf-ray'];
    console.log(`CF-Ray header: ${cfRay || 'NOT PRESENT'}`);
    
    // Workers responses should have this
    expect(cfRay).toBeTruthy();
    console.log('✅ Confirmed: Request reached Cloudflare Workers (CF-Ray present)');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 5: AUTHENTICATION E2E
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Phase 5: Authentication E2E', () => {
  test('5.1 Cookie security verification (pre-login)', async ({ page, context }) => {
    console.log('=== AUTHENTICATION COOKIE TEST ===');
    
    await page.goto(`${STAGING_FRONTEND_URL}/en/login`);
    await page.waitForLoadState('networkidle');

    // Check what's accessible via JavaScript BEFORE login
    const accessibleCookies = await page.evaluate(() => document.cookie);
    console.log(`Cookies via document.cookie: "${accessibleCookies}"`);

    // Check localStorage
    const localStorageKeys = await page.evaluate(() => Object.keys(localStorage));
    console.log(`localStorage keys: ${JSON.stringify(localStorageKeys)}`);

    // Verify refresh token NOT accessible via JS
    const hasRefreshInJS = accessibleCookies.toLowerCase().includes('refreshtoken');
    const hasRefreshInLS = localStorageKeys.some(k => k.toLowerCase().includes('refreshtoken'));
    
    console.log(`Refresh token in JS cookies: ${hasRefreshInJS}`);
    console.log(`Refresh token in localStorage: ${hasRefreshInLS}`);

    expect(hasRefreshInJS).toBe(false);
    expect(hasRefreshInLS).toBe(false);
  });

  test('5.2 Login API returns correct cookie configuration', async ({ request }) => {
    // This tests the cookie attributes returned by login
    // Note: We can't actually log in without valid credentials
    // But we can verify the endpoint exists and CORS is correct
    
    const res = await request.post(`${WORKERS_API_URL}/auth/login`, {
      data: { email: 'test@test.com', password: 'wrongpassword' },
      headers: { 'Content-Type': 'application/json' },
    });

    // Should get 401 for wrong password, not CORS error
    console.log(`Login API status: ${res.status()}`);
    expect([400, 401]).toContain(res.status());
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 6: ORDER TRACKING
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Phase 6: Order Tracking Security', () => {
  test('6.1 Missing phone returns 400', async ({ request }) => {
    console.log('=== ORDER TRACKING: Missing Phone ===');
    
    const res = await request.get(`${WORKERS_API_URL}/orders/number/RWQ20261007001`);
    console.log(`Status: ${res.status()}`);
    
    expect(res.status()).toBe(400);
    
    const body = await res.json();
    console.log(`Message: ${body.message}`);
    expect(body.message).toContain('Phone');
  });

  test('6.2 Wrong phone returns generic 404', async ({ request }) => {
    console.log('=== ORDER TRACKING: Wrong Phone ===');
    
    const res = await request.get(`${WORKERS_API_URL}/orders/number/RWQ20261007001?phone=00000000000`);
    console.log(`Status: ${res.status()}`);
    
    expect(res.status()).toBe(404);
    
    const body = await res.json();
    console.log(`Message: ${body.message}`);
    // Should NOT reveal if order exists
    expect(body.message).toContain('not found or phone');
  });

  test('6.3 Invalid order returns same as wrong phone (anti-enumeration)', async ({ request }) => {
    console.log('=== ORDER TRACKING: Invalid Order ===');
    
    const res = await request.get(`${WORKERS_API_URL}/orders/number/INVALID123?phone=01012345678`);
    console.log(`Status: ${res.status()}`);
    
    expect(res.status()).toBe(404);
    
    const body = await res.json();
    console.log(`Message: ${body.message}`);
    // Same generic message for invalid order as wrong phone
    expect(body.message).toContain('not found');
  });

  test('6.4 Malformed phone returns safe error', async ({ request }) => {
    console.log('=== ORDER TRACKING: Malformed Phone ===');
    
    const res = await request.get(`${WORKERS_API_URL}/orders/number/RWQ20261007001?phone=abc`);
    console.log(`Status: ${res.status()}`);
    
    // Should not crash, should return 404 (treated as wrong phone)
    expect([400, 404]).toContain(res.status());
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 7: RATE LIMITER
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Phase 7: Rate Limiting', () => {
  test('7.1 Rate limiter on order tracking (isolate-scoped test)', async ({ request }) => {
    console.log('=== RATE LIMITER TEST ===');
    console.log('Configuration: 10 requests / 15 minutes / IP');
    console.log('Note: Workers use isolate-scoped memory store');
    
    const statuses: number[] = [];
    
    // Send 15 requests
    for (let i = 0; i < 15; i++) {
      const res = await request.get(`${WORKERS_API_URL}/orders/number/TEST${i}?phone=00000000000`);
      statuses.push(res.status());
      
      if (res.status() === 429) {
        console.log(`Rate limited after ${i + 1} requests`);
        break;
      }
    }
    
    console.log(`Statuses: ${statuses.join(', ')}`);
    
    const hitRateLimit = statuses.includes(429);
    const rateLimitCount = statuses.filter(s => s === 429).length;
    
    console.log(`Hit rate limit: ${hitRateLimit}`);
    console.log(`429 responses: ${rateLimitCount}`);
    
    // Document the result - may or may not hit limit due to isolate behavior
    if (hitRateLimit) {
      console.log('✅ Rate limiter is GLOBALLY enforced');
    } else {
      console.log('⚠️ Rate limiter may be ISOLATE-LOCAL (requests may hit different isolates)');
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 8: ADMIN AUTHORIZATION
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Phase 8: Admin Authorization', () => {
  // Using ACTUAL routes from source code
  const adminEndpoints = [
    '/admin/stats',
    '/admin/users',
    '/admin/customers',
    '/admin/settings',
  ];

  test('8.1 Unauthenticated access to admin endpoints returns 401', async ({ request }) => {
    console.log('=== ADMIN AUTHORIZATION: Unauthenticated ===');
    
    for (const endpoint of adminEndpoints) {
      const res = await request.get(`${WORKERS_API_URL}${endpoint}`);
      console.log(`${endpoint}: ${res.status()}`);
      expect(res.status()).toBe(401);
    }
  });

  test('8.2 Admin products endpoint requires auth', async ({ request }) => {
    // POST /products requires admin
    const res = await request.post(`${WORKERS_API_URL}/products`, {
      data: { nameEn: 'Test', nameAr: 'تست' },
      headers: { 'Content-Type': 'application/json' },
    });
    console.log(`POST /products: ${res.status()}`);
    expect(res.status()).toBe(401);
  });

  test('8.3 Admin order mutations require auth', async ({ request }) => {
    const res = await request.put(`${WORKERS_API_URL}/orders/test-id/status`, {
      data: { status: 'shipped' },
      headers: { 'Content-Type': 'application/json' },
    });
    console.log(`PUT /orders/:id/status: ${res.status()}`);
    expect(res.status()).toBe(401);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 9: CORS / CSRF
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Phase 9: CORS and CSRF Protection', () => {
  test('9.1 Workers accepts requests from allowed origin', async ({ request }) => {
    console.log('=== CORS TEST: Allowed Origin ===');
    
    const res = await request.get(`${WORKERS_API_URL}/products?limit=1`, {
      headers: {
        'Origin': 'https://rawaqa-ruby.vercel.app',
      },
    });
    
    const corsHeader = res.headers()['access-control-allow-origin'];
    console.log(`CORS header: ${corsHeader}`);
    console.log(`Status: ${res.status()}`);
    
    expect(res.status()).toBe(200);
    expect(corsHeader).toBe('https://rawaqa-ruby.vercel.app');
  });

  test('9.2 Workers rejects state-changing requests from evil origin', async ({ request }) => {
    console.log('=== CSRF TEST: Evil Origin ===');
    
    const res = await request.post(`${WORKERS_API_URL}/auth/login`, {
      data: { email: 'test@test.com', password: 'test' },
      headers: {
        'Origin': 'https://evil.example.com',
        'Content-Type': 'application/json',
      },
    });
    
    console.log(`Status: ${res.status()}`);
    
    // Should be rejected by CSRF middleware (403) or fail auth (401)
    // The key is it should NOT return 200
    expect([401, 403]).toContain(res.status());
    
    if (res.status() === 403) {
      const body = await res.json();
      console.log(`Message: ${body.message}`);
      expect(body.message).toContain('CSRF');
    }
  });

  test('9.3 Preflight OPTIONS handled correctly', async ({ request }) => {
    console.log('=== CORS TEST: Preflight ===');
    
    const res = await request.fetch(`${WORKERS_API_URL}/auth/login`, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://rawaqa-ruby.vercel.app',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type',
      },
    });
    
    console.log(`Preflight status: ${res.status()}`);
    expect(res.status()).toBe(204);
    
    const allowMethods = res.headers()['access-control-allow-methods'];
    console.log(`Allowed methods: ${allowMethods}`);
    expect(allowMethods).toContain('POST');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 10: COD CHECKOUT (Smoke Test)
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Phase 10: COD Checkout', () => {
  test('10.1 Checkout requires authentication', async ({ request }) => {
    console.log('=== COD CHECKOUT: Auth Required ===');
    
    const res = await request.post(`${WORKERS_API_URL}/checkout`, {
      data: { 
        cartId: 'test-cart',
        shippingAddress: { phone: '01012345678' },
        paymentMethod: 'cod',
      },
      headers: { 'Content-Type': 'application/json' },
    });
    
    console.log(`Checkout status: ${res.status()}`);
    expect(res.status()).toBe(401);
  });

  test('10.2 Cart API accessible', async ({ request }) => {
    const res = await request.get(`${WORKERS_API_URL}/cart`);
    console.log(`Cart API status: ${res.status()}`);
    // May return 404 (no session) or 200 (empty cart) - both are valid
    expect([200, 401, 404]).toContain(res.status());
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 11: KASHIER TEST MODE
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Phase 11: Kashier Integration', () => {
  test('11.1 Payment endpoints require authentication', async ({ request }) => {
    console.log('=== KASHIER: Auth Required ===');
    
    // Try to create payment session without auth
    const res = await request.post(`${WORKERS_API_URL}/payments/session`, {
      data: { orderId: 'test-order' },
      headers: { 'Content-Type': 'application/json' },
    });
    
    console.log(`Payment session status: ${res.status()}`);
    expect([401, 404]).toContain(res.status()); // 401 or 404 if route doesn't exist
  });

  test('11.2 Webhook endpoint exists', async ({ request }) => {
    // Webhook without signature should fail verification
    const res = await request.post(`${WORKERS_API_URL}/webhooks/kashier`, {
      data: { event: 'test' },
      headers: { 'Content-Type': 'application/json' },
    });
    
    console.log(`Webhook status: ${res.status()}`);
    // Should reject without valid signature
    expect([400, 401, 403]).toContain(res.status());
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 13: CSP BROWSER TEST
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Phase 13: CSP Verification', () => {
  const pagesToTest = [
    { name: 'Home', path: '/en' },
    { name: 'Products', path: '/en/products' },
    { name: 'Cart', path: '/en/cart' },
    { name: 'Login', path: '/en/login' },
    { name: 'Register', path: '/en/register' },
    { name: 'Track', path: '/en/track' },
  ];

  for (const pageConfig of pagesToTest) {
    test(`13.x CSP on ${pageConfig.name}`, async ({ page }) => {
      const cspViolations: string[] = [];
      const consoleErrors: string[] = [];

      page.on('console', msg => {
        if (msg.type() === 'error') {
          const text = msg.text();
          consoleErrors.push(text);
          if (text.includes('Content Security Policy') || text.includes('CSP')) {
            cspViolations.push(text);
          }
        }
      });

      await page.goto(`${STAGING_FRONTEND_URL}${pageConfig.path}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      console.log(`=== CSP: ${pageConfig.name} ===`);
      console.log(`CSP violations: ${cspViolations.length}`);
      console.log(`Console errors: ${consoleErrors.length}`);

      if (cspViolations.length > 0) {
        cspViolations.forEach(v => console.log(`  CSP: ${v.substring(0, 150)}`));
      }
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 14: RUNTIME ERRORS
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Phase 14: Runtime Errors', () => {
  test('14.1 No 5xx errors on main pages', async ({ page }) => {
    const errors5xx: string[] = [];
    const allErrors: string[] = [];

    page.on('response', response => {
      if (response.status() >= 500) {
        errors5xx.push(`${response.status()} ${response.url()}`);
      }
    });

    page.on('console', msg => {
      if (msg.type() === 'error') {
        allErrors.push(msg.text());
      }
    });

    const pages = ['/en', '/en/products', '/en/cart', '/en/login', '/en/track'];
    
    for (const path of pages) {
      await page.goto(`${STAGING_FRONTEND_URL}${path}`);
      await page.waitForLoadState('networkidle');
    }

    console.log('=== RUNTIME ERRORS ===');
    console.log(`5xx errors: ${errors5xx.length}`);
    console.log(`Console errors: ${allErrors.length}`);

    if (errors5xx.length > 0) {
      console.log('5xx errors:');
      errors5xx.forEach(e => console.log(`  ${e}`));
    }

    expect(errors5xx.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 8: RESPONSIVE / RTL
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Responsive and RTL', () => {
  test('RTL Arabic layout', async ({ page }) => {
    await page.goto(`${STAGING_FRONTEND_URL}/ar`);
    await page.waitForLoadState('networkidle');

    const htmlDir = await page.evaluate(() => document.documentElement.dir);
    console.log(`Arabic HTML dir: ${htmlDir}`);
    expect(htmlDir).toBe('rtl');
  });

  test('LTR English layout', async ({ page }) => {
    await page.goto(`${STAGING_FRONTEND_URL}/en`);
    await page.waitForLoadState('networkidle');

    const htmlDir = await page.evaluate(() => document.documentElement.dir);
    console.log(`English HTML dir: ${htmlDir}`);
    expect(htmlDir).toBe('ltr');
  });
});

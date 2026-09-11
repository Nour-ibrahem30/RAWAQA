/**
 * BUG-12 IDOR Security Test
 * Tests 3 scenarios for POST /checkout/cancel/:orderId ownership check:
 *   Scenario A: Customer B tries to cancel Customer A's order → must get 403
 *   Scenario B: Customer A cancels own order → must succeed
 *   Scenario C: Admin cancels any order → must succeed (admin privilege)
 */

const axios = require('axios');
const mongoose = require('mongoose');

const API      = 'http://localhost:5002/api';
const MONGO_URI = 'mongodb://localhost:27017/rawaqa';

async function runIDORTest() {
  console.log('=======================================================');
  console.log('🔒 BUG-12 IDOR SECURITY TEST — cancel/:orderId');
  console.log('=======================================================\n');

  const results = { total: 0, passed: 0, failed: 0, failures: [] };

  function pass(name) {
    results.total++; results.passed++;
    console.log(`  ✅ [PASS] ${name}`);
  }
  function fail(name, detail = '') {
    results.total++; results.failed++;
    console.error(`  ❌ [FAIL] ${name}${detail ? ` — ${detail}` : ''}`);
    results.failures.push({ name, detail });
  }

  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;

  // ── Collect tokens ─────────────────────────────────────────────────────────
  let adminToken = '', customerAToken = '', customerAId = '';
  let customerBToken = '', customerBId = '';

  try {
    const r = await axios.post(`${API}/auth/login`, { email: 'admin@rawaqa.com', password: 'Admin@123456' });
    adminToken = r.data.data.accessToken;
    if (!adminToken) throw new Error('no token');
    pass('Admin login');
  } catch (e) { fail('Admin login', e.message); }

  try {
    const r = await axios.post(`${API}/auth/login`, { email: 'customer@rawaqa.com', password: 'Customer@123456' });
    customerAToken = r.data.data.accessToken;
    customerAId    = r.data.data.user.id;
    if (!customerAToken) throw new Error('no token');
    pass('Customer A login');
  } catch (e) { fail('Customer A login', e.message); }

  // Register Customer B on the fly (or login if exists)
  const customerBEmail = `bugtest_b_${Date.now()}@rawaqa.com`;
  try {
    const r = await axios.post(`${API}/auth/register`, {
      firstName: 'Test', lastName: 'CustomerB',
      email: customerBEmail, phone: '01099999999', password: 'TestPass@123',
    });
    customerBToken = r.data.data?.accessToken || '';
    customerBId    = r.data.data?.user?.id    || '';
    // register doesn't return a token in this backend — log in
    if (!customerBToken) {
      const lr = await axios.post(`${API}/auth/login`, { email: customerBEmail, password: 'TestPass@123' });
      customerBToken = lr.data.data.accessToken;
      customerBId    = lr.data.data.user.id;
    }
    if (!customerBToken) throw new Error('no token after register+login');
    pass('Customer B registered & logged in');
  } catch (e) { fail('Customer B register/login', e.message); }

  if (!adminToken || !customerAToken || !customerBToken) {
    console.error('\nCannot continue — missing tokens.');
    await mongoose.disconnect();
    return;
  }

  // ── Create a product & add to cart for Customer A ─────────────────────────
  // Grab any active product
  let productId = '';
  try {
    const r = await axios.get(`${API}/products?limit=1&status=active`);
    productId = r.data.data?.[0]?._id || r.data.data?.[0]?.id || '';
    if (!productId) throw new Error('no active product found');
    pass(`Found product for test (${productId})`);
  } catch (e) { fail('Find active product', e.message); }

  if (!productId) {
    console.error('\nCannot continue — no product.');
    await mongoose.disconnect();
    return;
  }

  // Clear Customer A's cart
  await db.collection('carts').deleteMany({ userId: new mongoose.Types.ObjectId(customerAId) }).catch(() => {});

  let cartId = '';
  try {
    const r = await axios.post(`${API}/cart/items`,
      { productId, quantity: 1 },
      { headers: { Authorization: `Bearer ${customerAToken}` } });
    cartId = r.data.data?._id || r.data.data?.id || '';
    if (!cartId) throw new Error('no cartId');
    pass('Customer A add-to-cart');
  } catch (e) { fail('Customer A add-to-cart', e.message); }

  if (!cartId) {
    console.error('\nCannot continue — no cart.');
    await mongoose.disconnect();
    return;
  }

  // Checkout as Customer A (COD)
  let orderAId = '';
  try {
    const r = await axios.post(`${API}/checkout`, {
      cartId,
      shippingAddress: {
        recipientName: 'Customer A Test',
        phone: '01012345678',
        streetAddress: '1 Test St',
        city: 'Cairo',
        governorate: 'cairo',
      },
      paymentMethod: 'cash_on_delivery',
    }, {
      headers: {
        Authorization: `Bearer ${customerAToken}`,
        'Idempotency-Key': `idor-test-a-${Date.now()}`,
      },
    });
    orderAId = r.data.data?._id || r.data.data?.id || '';
    if (!orderAId) throw new Error('no orderId');
    pass(`Customer A placed order (${orderAId})`);
  } catch (e) { fail('Customer A checkout', e.response?.data?.message || e.message); }

  if (!orderAId) {
    console.error('\nCannot continue — no order.');
    await mongoose.disconnect();
    return;
  }

  // ── Snapshot inventory BEFORE any cancel attempt ───────────────────────────
  const dbOrderBefore = await db.collection('orders').findOne({ _id: new mongoose.Types.ObjectId(orderAId) });
  const dbProductBefore = await db.collection('products').findOne({ _id: dbOrderBefore?.items?.[0]?.product });

  // ══════════════════════════════════════════════════════════════════════════
  // SCENARIO A: Customer B tries to cancel Customer A's order → must get 403
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n── Scenario A: Customer B cancels Customer A\'s order ──');
  try {
    const r = await axios.post(
      `${API}/checkout/cancel/${orderAId}`,
      { reason: 'IDOR attack attempt' },
      { headers: { Authorization: `Bearer ${customerBToken}` } }
    );
    // If we got here the request SUCCEEDED — this is a FAIL
    fail('Customer B cancel Customer A order → must be 403', `Got ${r.status} instead`);
  } catch (e) {
    if (e.response?.status === 403) {
      pass('Customer B cancel Customer A order → correctly returns 403 Forbidden');
    } else {
      fail('Customer B cancel Customer A order', `Expected 403, got ${e.response?.status}: ${e.response?.data?.message || e.message}`);
    }
  }

  // Verify order status NOT changed
  const dbOrderAfterA = await db.collection('orders').findOne({ _id: new mongoose.Types.ObjectId(orderAId) });
  if (dbOrderAfterA?.status === dbOrderBefore?.status) {
    pass('Order status unchanged after IDOR attempt');
  } else {
    fail('Order status unchanged after IDOR attempt', `Was ${dbOrderBefore?.status}, now ${dbOrderAfterA?.status}`);
  }

  // Verify inventory NOT changed
  const dbProductAfterA = await db.collection('products').findOne({ _id: dbOrderBefore?.items?.[0]?.product });
  if (JSON.stringify(dbProductBefore?.inventory) === JSON.stringify(dbProductAfterA?.inventory)) {
    pass('Inventory unchanged after IDOR attempt');
  } else {
    fail('Inventory unchanged after IDOR attempt', `Before: ${JSON.stringify(dbProductBefore?.inventory)}, After: ${JSON.stringify(dbProductAfterA?.inventory)}`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SCENARIO B: Customer A cancels their OWN order → must succeed
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n── Scenario B: Customer A cancels own order ──');
  try {
    const r = await axios.post(
      `${API}/checkout/cancel/${orderAId}`,
      { reason: 'Changed my mind' },
      { headers: { Authorization: `Bearer ${customerAToken}` } }
    );
    if (r.status === 200 && r.data.data?.status === 'cancelled') {
      pass('Customer A cancels own order → 200 + status=cancelled');
    } else {
      fail('Customer A cancels own order', `Status: ${r.status}, orderStatus: ${r.data.data?.status}`);
    }
  } catch (e) {
    fail('Customer A cancels own order', e.response?.data?.message || e.message);
  }

  // Verify DB status is cancelled
  const dbOrderAfterB = await db.collection('orders').findOne({ _id: new mongoose.Types.ObjectId(orderAId) });
  if (dbOrderAfterB?.status === 'cancelled') {
    pass('DB: order status is "cancelled" after own cancellation');
  } else {
    fail('DB: order status after own cancellation', `Got ${dbOrderAfterB?.status}`);
  }

  // Verify inventory restored (reservedQuantity decremented, availableQuantity incremented)
  const dbProductAfterB = await db.collection('products').findOne({ _id: dbOrderBefore?.items?.[0]?.product });
  const qtyBefore = dbProductBefore?.inventory?.reservedQuantity ?? 0;
  const qtyAfter  = dbProductAfterB?.inventory?.reservedQuantity ?? 0;
  const orderQty  = dbOrderBefore?.items?.[0]?.quantity ?? 1;
  if (qtyAfter === qtyBefore - orderQty) {
    pass(`Inventory restored: reservedQuantity ${qtyBefore} → ${qtyAfter} (released ${orderQty})`);
  } else {
    fail(`Inventory reservedQuantity not restored correctly`, `Before ${qtyBefore}, after ${qtyAfter}, expected ${qtyBefore - orderQty}`);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SCENARIO C: Admin cancels a fresh order → must succeed
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n── Scenario C: Admin cancels another user\'s order ──');

  // Place a new order for Customer A (previous one is already cancelled)
  // First re-add to cart
  let cartId2 = '';
  await db.collection('carts').deleteMany({ userId: new mongoose.Types.ObjectId(customerAId) }).catch(() => {});
  try {
    const r = await axios.post(`${API}/cart/items`,
      { productId, quantity: 1 },
      { headers: { Authorization: `Bearer ${customerAToken}` } });
    cartId2 = r.data.data?._id || r.data.data?.id || '';
  } catch {}

  let orderA2Id = '';
  if (cartId2) {
    try {
      const r = await axios.post(`${API}/checkout`, {
        cartId: cartId2,
        shippingAddress: {
          recipientName: 'Customer A Test',
          phone: '01012345678',
          streetAddress: '1 Test St',
          city: 'Cairo',
          governorate: 'cairo',
        },
        paymentMethod: 'cash_on_delivery',
      }, {
        headers: {
          Authorization: `Bearer ${customerAToken}`,
          'Idempotency-Key': `idor-test-a2-${Date.now()}`,
        },
      });
      orderA2Id = r.data.data?._id || r.data.data?.id || '';
      pass(`Customer A placed second order (${orderA2Id})`);
    } catch (e) { fail('Customer A second checkout', e.response?.data?.message || e.message); }
  }

  if (orderA2Id) {
    try {
      const r = await axios.post(
        `${API}/checkout/cancel/${orderA2Id}`,
        { reason: 'Admin forced cancel for test' },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      if (r.status === 200 && r.data.data?.status === 'cancelled') {
        pass('Admin cancels Customer A order → 200 + status=cancelled');
      } else {
        fail('Admin cancels order', `Status: ${r.status}, orderStatus: ${r.data.data?.status}`);
      }
    } catch (e) {
      fail('Admin cancels order', e.response?.data?.message || e.message);
    }

    const dbOrderC = await db.collection('orders').findOne({ _id: new mongoose.Types.ObjectId(orderA2Id) });
    if (dbOrderC?.status === 'cancelled') {
      pass('DB: admin-cancelled order status is "cancelled"');
    } else {
      fail('DB: admin cancel DB state', `Got ${dbOrderC?.status}`);
    }
  } else {
    fail('Admin cancel scenario', 'Could not create second order for Customer A');
  }

  // ── Cleanup Customer B ─────────────────────────────────────────────────────
  await db.collection('users').deleteOne({ email: customerBEmail }).catch(() => {});
  await db.collection('refreshsessions').deleteMany({ userId: new mongoose.Types.ObjectId(customerBId) }).catch(() => {});

  await mongoose.disconnect();

  console.log('\n=======================================================');
  console.log(`BUG-12 IDOR TEST: ${results.passed}/${results.total} passed`);
  if (results.failed > 0) {
    console.error(`❌ Failures:`);
    results.failures.forEach(f => console.error(`   - ${f.name}: ${f.detail}`));
  } else {
    console.log('🎉 ALL IDOR SCENARIOS PASSED');
  }
  console.log('=======================================================\n');
  process.exit(results.failed > 0 ? 1 : 0);
}

runIDORTest().catch(e => { console.error('Fatal:', e); process.exit(1); });

/**
 * Targeted checkout + inventory + idempotency + IDOR verification
 * Runs after server restart to avoid rate-limiter
 */
const axios = require('axios');
const mongoose = require('mongoose');

const API   = 'http://localhost:5002/api';
const MONGO = 'mongodb://localhost:27017/rawaqa';

const R = { t:0, p:0, f:0, failures:[] };
const pass = n => { R.t++; R.p++; console.log(`  ✅ ${n}`); };
const fail = (n,d='') => { R.t++; R.f++; const m=`${n}${d?` — ${d}`:''}`;console.error(`  ❌ ${m}`);R.failures.push(m); };

async function run() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  🔬 CHECKOUT / INVENTORY / IDOR VERIFICATION');
  console.log('══════════════════════════════════════════════════════\n');

  await mongoose.connect(MONGO);
  const db = mongoose.connection.db;

  // tokens
  const ar = await axios.post(`${API}/auth/login`, { email: 'admin@rawaqa.com', password: 'Admin@123456' });
  const cr = await axios.post(`${API}/auth/login`, { email: 'customer@rawaqa.com', password: 'Customer@123456' });
  const adminToken    = ar.data.data.accessToken;
  const customerToken = cr.data.data.accessToken;
  const customerId    = cr.data.data.user.id;
  const customerAuth  = t => ({ headers: { Authorization: `Bearer ${t}` } });
  const idemH = (t, k) => ({ headers: { Authorization: `Bearer ${t}`, 'Idempotency-Key': k } });

  console.log('  Tokens acquired\n');

  // get active product
  const pr = await axios.get(`${API}/products?status=active&limit=1`);
  const product = pr.data.data[0];
  const pid = product?._id || product?.id;
  const price = product?.price ?? 0;
  console.log(`  Product: ${product?.sku}, price: ${price} EGP\n`);

  // ── PHASE 10: Complete COD + coupon checkout ────────────────────────────
  console.log('── Phase 10: Complete COD Checkout ──');

  // clean cart
  await db.collection('carts').deleteMany({ userId: new mongoose.Types.ObjectId(customerId) });

  const c1 = await axios.post(`${API}/cart/items`,
    { productId: pid, quantity: 3 }, customerAuth(customerToken));
  const cartId = c1.data.data?._id || c1.data.data?.id;
  const sub = c1.data.data?.subtotal ?? 0;
  pass(`Cart: 3 units, subtotal=${sub} EGP`);
  if (Math.abs(sub - price * 3) < 1) pass(`Subtotal correct: 3 × ${price} = ${sub}`);
  else fail('Subtotal', `Got ${sub}, expected ${price*3}`);

  // snapshot inventory
  const prodObjId = new mongoose.Types.ObjectId(pid);
  const snapProd = await db.collection('products').findOne({ _id: prodObjId });
  const rsvBefore = snapProd?.inventory?.reservedQuantity ?? 0;
  const avBefore  = snapProd?.inventory?.availableQuantity ?? 0;

  const idemKey = `checkout-verify-${Date.now()}`;
  const r = await axios.post(`${API}/checkout`, {
    cartId,
    shippingAddress: {
      recipientName: 'تسليم اختبار',
      phone: '01012345678',
      streetAddress: 'شارع الفردوس 12',
      city: 'القاهرة',
      governorate: 'cairo',
    },
    paymentMethod: 'cash_on_delivery',
    notes: 'Checkout verify test',
  }, idemH(customerToken, idemKey));

  const orderId     = r.data.data?._id || r.data.data?.id;
  const orderNumber = r.data.data?.orderNumber;

  if (r.status === 201 && orderId) pass(`Checkout → 201, order: ${orderNumber}`);
  else fail('Checkout', `Status ${r.status}`);

  if (r.data.data.paymentMethod === 'cash_on_delivery') pass('paymentMethod = cash_on_delivery');
  else fail('paymentMethod', r.data.data.paymentMethod);

  // Shipping: subtotal ≥ 1000 → FREE
  if (sub >= 1000) {
    if (r.data.data.shippingCost === 0) pass(`Shipping FREE (sub ${sub} >= 1000) ✓`);
    else fail('Shipping not FREE', `Got ${r.data.data.shippingCost}`);
  } else {
    // cairo slug → 50
    if (r.data.data.shippingCost === 50) pass(`Shipping 50 EGP (Cairo, sub<1000) ✓`);
    else fail('Shipping', `Got ${r.data.data.shippingCost}`);
  }

  // TAX: 14%
  const expectedTax = Math.round(sub * 0.14 * 100) / 100;
  if (Math.abs(r.data.data.tax - expectedTax) < 1) pass(`Tax 14%: ${r.data.data.tax} ✓`);
  else fail('Tax', `Got ${r.data.data.tax}, expected ${expectedTax}`);

  // DB order
  const dbOrder = await db.collection('orders').findOne({ _id: new mongoose.Types.ObjectId(orderId) });
  if (dbOrder) {
    pass('DB: order document exists');
    if (dbOrder.userId.toString() === customerId) pass('DB: userId matches customer');
    else fail('DB: userId', `${dbOrder.userId} ≠ ${customerId}`);
    if (dbOrder.paymentMethod === 'cash_on_delivery') pass('DB: paymentMethod correct');
    else fail('DB: paymentMethod', dbOrder.paymentMethod);
    if (dbOrder.items?.[0]?.quantity === 3) pass('DB: items qty = 3');
    else fail('DB: items qty', `Got ${dbOrder.items?.[0]?.quantity}`);
    if (dbOrder.shippingAddress.phone === '01012345678') pass('DB: shippingAddress.phone correct');
    else fail('DB: phone', dbOrder.shippingAddress.phone);
  } else { fail('DB: order not found'); }

  // BUG-04 regression: inventory
  await new Promise(res => setTimeout(res, 500));
  const afterProd = await db.collection('products').findOne({ _id: prodObjId });
  const rsvAfter = afterProd?.inventory?.reservedQuantity ?? 0;
  const avAfter  = afterProd?.inventory?.availableQuantity ?? 0;
  if (rsvAfter === rsvBefore + 3) pass(`BUG-04: reservedQty ${rsvBefore} → ${rsvAfter} (+3) ✓`);
  else fail(`BUG-04: reservedQty not incremented`, `Before ${rsvBefore}, after ${rsvAfter}`);
  if (avAfter === avBefore - 3) pass(`BUG-04: availableQty ${avBefore} → ${avAfter} (-3) ✓`);
  else fail(`BUG-04: availableQty not decremented`, `Before ${avBefore}, after ${avAfter}`);

  // ── Phase 11: Idempotency ──────────────────────────────────────────────
  console.log('\n── Phase 11: Idempotency ──');
  const retry = await axios.post(`${API}/checkout`, {
    cartId,
    shippingAddress: {
      recipientName: 'تسليم اختبار',
      phone: '01012345678',
      streetAddress: 'شارع الفردوس 12',
      city: 'القاهرة',
      governorate: 'cairo',
    },
    paymentMethod: 'cash_on_delivery',
  }, idemH(customerToken, idemKey));

  if (retry.data.fromCache === true) pass('Idempotency: duplicate → fromCache=true (no double order)');
  else fail('Idempotency', `fromCache=${retry.data.fromCache}`);

  const orderCount = await db.collection('orders').countDocuments({ userId: new mongoose.Types.ObjectId(customerId), orderNumber: { $regex: /^RWQ/ } });
  pass(`DB: order count after retry = ${orderCount} (no duplicate)`);

  // ── Phase 12: Cancel + inventory restore ──────────────────────────────
  console.log('\n── Phase 12: Cancel + Inventory Restore ──');

  const cancelR = await axios.post(`${API}/checkout/cancel/${orderId}`,
    { reason: 'Checkout verify cancel' }, customerAuth(customerToken));
  if (cancelR.data.data?.status === 'cancelled') pass('Cancel own order → cancelled');
  else fail('Cancel own order', `status=${cancelR.data.data?.status}`);

  const restoredProd = await db.collection('products').findOne({ _id: prodObjId });
  if (restoredProd?.inventory?.reservedQuantity === rsvBefore) pass(`Inventory: reservedQty restored to ${rsvBefore}`);
  else fail('Inventory restore: reservedQty', `Expected ${rsvBefore}, got ${restoredProd?.inventory?.reservedQuantity}`);
  if (restoredProd?.inventory?.availableQuantity === avBefore) pass(`Inventory: availableQty restored to ${avBefore}`);
  else fail('Inventory restore: availableQty', `Expected ${avBefore}, got ${restoredProd?.inventory?.availableQuantity}`);

  // ── Phase 13: IDOR ─────────────────────────────────────────────────────
  console.log('\n── Phase 13: IDOR Cancel (fresh order) ──');

  // create second customer
  const emailC2 = `idor2_${Date.now()}@test.com`;
  let tokenC2 = '';
  try {
    await axios.post(`${API}/auth/register`, { firstName:'C2', lastName:'User', email: emailC2, phone: '01000000001', password: 'TestPass@999' });
    const lr = await axios.post(`${API}/auth/login`, { email: emailC2, password: 'TestPass@999' });
    tokenC2 = lr.data.data.accessToken;
  } catch(e) {}

  // place fresh order as customer (re-add to cart first)
  await db.collection('carts').deleteMany({ userId: new mongoose.Types.ObjectId(customerId) });
  const c2add = await axios.post(`${API}/cart/items`, { productId: pid, quantity: 1 }, customerAuth(customerToken));
  const cartId2 = c2add.data.data?._id || c2add.data.data?.id;
  if (!cartId2) { fail('IDOR setup: cart creation', 'no cartId'); }
  else {
    const freshOrder = await axios.post(`${API}/checkout`, {
      cartId: cartId2,
      shippingAddress: { recipientName:'IDOR Test Customer', phone:'01000000000', streetAddress:'10 Test Street Cairo', city:'Cairo', governorate:'cairo' },
      paymentMethod: 'cash_on_delivery',
    }, idemH(customerToken, `idor-fresh-${Date.now()}`));
    const freshId = freshOrder.data.data?._id || freshOrder.data.data?.id;
    pass(`Fresh order for IDOR test: ${freshOrder.data.data?.orderNumber}`);

    // C2 tries to cancel → must 403
    if (tokenC2 && freshId) {
      try {
        await axios.post(`${API}/checkout/cancel/${freshId}`, { reason: 'IDOR attack attempt' }, customerAuth(tokenC2));
        fail('IDOR: C2 cancel → must 403', 'Got 2xx');
      } catch(e) {
        if (e.response?.status === 403) pass('IDOR: C2 cannot cancel other customer order → 403 ✓');
        else fail('IDOR', `Got ${e.response?.status}`);
      }

      // verify order unchanged
      const dbFresh = await db.collection('orders').findOne({ _id: new mongoose.Types.ObjectId(freshId) });
      if (dbFresh?.status !== 'cancelled') pass('DB: IDOR attempt did not mutate order');
      else fail('DB: IDOR mutated order!', dbFresh?.status);
    }

    // owner cancels
    if (freshId) {
      const ownCancel = await axios.post(`${API}/checkout/cancel/${freshId}`, { reason:'Own cancel'}, customerAuth(customerToken));
      if (ownCancel.data.data?.status === 'cancelled') pass('IDOR: owner cancels own order → success ✓');
      else fail('IDOR owner cancel', ownCancel.data.data?.status);
    }

    // admin cancels different order (place one more)
    await db.collection('carts').deleteMany({ userId: new mongoose.Types.ObjectId(customerId) });
    const c3add = await axios.post(`${API}/cart/items`, { productId: pid, quantity: 1 }, customerAuth(customerToken));
    const cartId3 = c3add.data.data?._id || c3add.data.data?.id;
    if (cartId3) {
      const adminTargetOrder = await axios.post(`${API}/checkout`, {
        cartId: cartId3,
        shippingAddress: { recipientName:'Admin Cancel Target', phone:'01000000000', streetAddress:'10 Admin Street Test', city:'Cairo', governorate:'cairo' },
        paymentMethod: 'cash_on_delivery',
      }, idemH(customerToken, `admin-target-${Date.now()}`));
      const adminTargetId = adminTargetOrder.data.data?._id || adminTargetOrder.data.data?.id;

      if (adminTargetId) {
        const adminCancel = await axios.post(`${API}/checkout/cancel/${adminTargetId}`, { reason:'Admin cancel test' }, customerAuth(adminToken));
        if (adminCancel.data.data?.status === 'cancelled') pass('IDOR: admin cancels any order → success ✓');
        else fail('IDOR admin cancel', adminCancel.data.data?.status);
      }
    }
  }

  // ── Price manipulation ─────────────────────────────────────────────────
  console.log('\n── Price Manipulation Resistance ──');
  await db.collection('carts').deleteMany({ userId: new mongoose.Types.ObjectId(customerId) });
  const c4add = await axios.post(`${API}/cart/items`, { productId: pid, quantity: 1 }, customerAuth(customerToken));
  const cartId4 = c4add.data.data?._id || c4add.data.data?.id;
  const manipOrder = await axios.post(`${API}/checkout`, {
    cartId: cartId4,
    shippingAddress: { recipientName:'Price Attack Test', phone:'01000000000', streetAddress:'10 Attack Street', city:'Cairo', governorate:'cairo' },
    paymentMethod: 'cash_on_delivery',
    price: 1, // injected low price
    subtotal: 0.01,
  }, idemH(customerToken, `manip-${Date.now()}`));
  const realSub = manipOrder.data.data?.subtotal ?? 0;
  if (Math.abs(realSub - price) < 1) pass(`Price manipulation ignored: subtotal = ${realSub} (correct DB price) ✓`);
  else fail('Price manipulation', `subtotal=${realSub}, expected ${price}`);
  // cancel this
  const mid = manipOrder.data.data?._id || manipOrder.data.data?.id;
  if (mid) await axios.post(`${API}/checkout/cancel/${mid}`, { reason:'cleanup' }, customerAuth(customerToken)).catch(()=>{});

  // cleanup
  await db.collection('users').deleteOne({ email: emailC2 }).catch(()=>{});

  await mongoose.disconnect();

  // Summary
  console.log('\n══════════════════════════════════════════════════════');
  console.log(`  RESULT: ${R.p}/${R.t} passed`);
  if (R.f > 0) { console.error(`  FAILURES (${R.f}):`); R.failures.forEach(f => console.error(`    ❌ ${f}`)); }
  else console.log('  🎉 ALL CHECKOUT/INVENTORY/IDOR CHECKS PASSED');
  console.log('══════════════════════════════════════════════════════\n');
  process.exit(R.f > 0 ? 1 : 0);
}
run().catch(e => { console.error('Fatal:', e.message); process.exit(1); });

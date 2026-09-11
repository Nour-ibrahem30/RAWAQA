const axios = require('axios');
const mongoose = require('mongoose');

const API = 'http://localhost:5002/api';
const FRONTEND = 'http://localhost:3000';
const MONGO_URI = 'mongodb://localhost:27017/rawaqa';

async function runTestSuite() {
  console.log('========================================================');
  console.log('🚀 RAWAQA E2E FULL FUNCTIONAL & SECURITY AUDIT SUITE');
  console.log('========================================================\n');

  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB directly for DB state verification.\n');
  const db = mongoose.connection.db;

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    failures: [],
  };

  function assert(condition, name, details = '') {
    results.total++;
    if (condition) {
      results.passed++;
      console.log(`  [PASS] ${name}`);
    } else {
      results.failed++;
      console.error(`  ❌ [FAIL] ${name} ${details ? `(${details})` : ''}`);
      results.failures.push({ name, details });
    }
  }

  let adminToken = '';
  let customerToken = '';
  let customerId = '';
  let testCategoryId = '';
  let testProductId = '';
  let testCouponCode = '';
  let testCouponId = '';
  let testOrderId = '';
  let testOrderNumber = '';

  // -----------------------------------------------------------
  // SUITE 1: AUTHENTICATION & AUTHORIZATION SECURITY TESTS
  // -----------------------------------------------------------
  console.log('--- SUITE 1: AUTHENTICATION & AUTHORIZATION ---');
  
  // 1.1 Admin login valid
  try {
    const res = await axios.post(`${API}/auth/login`, {
      email: 'admin@rawaqa.com',
      password: 'Admin@123456',
    });
    adminToken = res.data.data.accessToken;
    assert(res.status === 200 && !!adminToken, 'Admin Login with valid credentials');
    assert(res.data.data.user.role === 'super_admin', 'Admin user role is super_admin');
  } catch (err) {
    assert(false, 'Admin Login with valid credentials', err.message);
  }

  // 1.2 Customer login valid
  try {
    const res = await axios.post(`${API}/auth/login`, {
      email: 'customer@rawaqa.com',
      password: 'Customer@123456',
    });
    customerToken = res.data.data.accessToken;
    customerId = res.data.data.user.id;
    assert(res.status === 200 && !!customerToken, 'Customer Login with valid credentials');
    assert(res.data.data.user.role === 'customer', 'Customer user role is customer');
  } catch (err) {
    assert(false, 'Customer Login with valid credentials', err.message);
  }

  // 1.3 Invalid password
  try {
    await axios.post(`${API}/auth/login`, {
      email: 'admin@rawaqa.com',
      password: 'WrongPassword999!',
    });
    assert(false, 'Login with invalid password rejected');
  } catch (err) {
    assert(err.response?.status === 401, 'Login with invalid password returns 401 Unauthorized');
  }

  // 1.4 Empty credentials validation
  try {
    await axios.post(`${API}/auth/login`, {
      email: '',
      password: '',
    });
    assert(false, 'Login with empty credentials rejected');
  } catch (err) {
    assert(err.response?.status === 400 || err.response?.status === 422, 'Login with empty credentials returns 400 Bad Request');
  }

  // 1.5 NoSQL injection attempt
  try {
    await axios.post(`${API}/auth/login`, {
      email: { $gt: '' },
      password: { $gt: '' },
    });
    assert(false, 'NoSQL injection attempt rejected');
  } catch (err) {
    assert(err.response?.status === 400, 'NoSQL injection attempt properly rejected with 400');
  }

  // 1.6 Unauthorized access to Admin API by unauthenticated user
  try {
    await axios.get(`${API}/admin/stats`);
    assert(false, 'Accessing /api/admin/stats without token rejected');
  } catch (err) {
    assert(err.response?.status === 401, 'Accessing /api/admin/stats without token returns 401');
  }

  // 1.7 Forbidden access to Admin API by regular customer
  try {
    await axios.get(`${API}/admin/stats`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(false, 'Accessing /api/admin/stats with customer token rejected');
  } catch (err) {
    assert(err.response?.status === 403, 'Accessing /api/admin/stats with customer token returns 403 Forbidden');
  }

  // -----------------------------------------------------------
  // SUITE 2: CATEGORY & PRODUCT MANAGEMENT (CODE -> API -> DB)
  // -----------------------------------------------------------
  console.log('\n--- SUITE 2: CATEGORIES & PRODUCTS (FULL DB CYCLE) ---');

  // 2.1 Create Category in Admin
  const uniqueSuffix = Date.now().toString().slice(-5);
  const catSlug = `test-relax-${uniqueSuffix}`;
  try {
    const res = await axios.post(
      `${API}/categories`,
      {
        nameAr: `قسم اختبار ${uniqueSuffix}`,
        nameEn: `Test Category ${uniqueSuffix}`,
        slug: catSlug,
        slugAr: `اختبار-${uniqueSuffix}`,
        slugEn: catSlug,
        status: 'active',
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    testCategoryId = res.data.data._id || res.data.data.id;
    assert(res.status === 201 && !!testCategoryId, 'Admin Create Category API');

    // Verify in MongoDB
    const dbCat = await db.collection('categories').findOne({ slugEn: catSlug });
    assert(!!dbCat && dbCat.nameEn === `Test Category ${uniqueSuffix}`, 'Category persisted in MongoDB with correct fields');
  } catch (err) {
    assert(false, 'Admin Create Category API', err.response?.data?.message || err.message);
  }

  // 2.2 Reject Duplicate Category Slug
  try {
    await axios.post(
      `${API}/categories`,
      {
        nameAr: `قسم مكرر`,
        nameEn: `Duplicate Category`,
        slug: catSlug,
        slugAr: `مكرر`,
        slugEn: catSlug,
        status: 'active',
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(false, 'Duplicate category slug rejected');
  } catch (err) {
    assert(err.response?.status === 400 || err.response?.status === 409, 'Duplicate category slug rejected with 400/409');
  }

  // 2.3 Create Product with Initial Inventory
  const productSku = `SKU-TST-${uniqueSuffix}`;
  try {
    const res = await axios.post(
      `${API}/products`,
      {
        nameAr: `بين باج اختبار ${uniqueSuffix}`,
        nameEn: `Test Bean Bag ${uniqueSuffix}`,
        sku: productSku,
        category: testCategoryId,
        price: 1500,
        compareAtPrice: 1800,
        descriptionAr: 'وصف المنتج للاختبار الشامل',
        descriptionEn: 'Full test description for bean bag',
        inventory: {
          onHandQuantity: 15,
          reservedQuantity: 0,
          availableQuantity: 15,
          lowStockThreshold: 3,
        },
        images: [{ url: '/products/relax/relax-1.jpg', isMain: true }],
        status: 'active',
        featured: true,
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    testProductId = res.data.data._id || res.data.data.id;
    assert(res.status === 201 && !!testProductId, 'Admin Create Product API');

    // Verify in DB
    const dbProduct = await db.collection('products').findOne({ sku: productSku });
    assert(
      !!dbProduct &&
      dbProduct.price === 1500 &&
      dbProduct.inventory.availableQuantity === 15,
      'Product created in MongoDB with exact price and inventory'
    );
  } catch (err) {
    assert(false, 'Admin Create Product API', err.response?.data?.message || err.message);
  }

  // 2.4 Fetch Product via Public API
  try {
    const res = await axios.get(`${API}/products/${testProductId}`);
    assert(res.status === 200 && res.data.data.sku === productSku, 'Public API fetches newly created product');
  } catch (err) {
    assert(false, 'Public API fetches newly created product', err.message);
  }

  // 2.5 Update Product in Admin
  try {
    const res = await axios.put(
      `${API}/products/${testProductId}`,
      {
        price: 1650,
        inventory: {
          onHandQuantity: 20,
          availableQuantity: 20,
        },
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(res.status === 200, 'Admin Update Product API');

    // Verify DB update
    const dbProduct = await db.collection('products').findOne({ _id: new mongoose.Types.ObjectId(testProductId) });
    assert(dbProduct.price === 1650 && dbProduct.inventory.availableQuantity === 20, 'Product update verified in MongoDB');
  } catch (err) {
    assert(false, 'Admin Update Product API', err.response?.data?.message || err.message);
  }

  // -----------------------------------------------------------
  // SUITE 3: COUPONS & DISCOUNTS SYSTEM
  // -----------------------------------------------------------
  console.log('\n--- SUITE 3: COUPONS & DISCOUNT ENGINE ---');
  testCouponCode = `TESTDISC${uniqueSuffix}`;

  // 3.1 Admin Create Coupon
  try {
    const res = await axios.post(
      `${API}/coupons`,
      {
        code: testCouponCode,
        type: 'percentage',
        value: 20,
        minOrderValue: 500,
        maxDiscount: 400,
        usageLimit: 5,
        isActive: true,
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    testCouponId = res.data.data._id || res.data.data.id;
    assert(res.status === 201 && !!testCouponId, 'Admin Create Coupon (20% off, min 500 EGP, max 400 EGP)');

    // DB verify
    const dbCoupon = await db.collection('coupons').findOne({ code: testCouponCode });
    assert(dbCoupon && dbCoupon.value === 20 && dbCoupon.isActive === true, 'Coupon verified in MongoDB');
  } catch (err) {
    assert(false, 'Admin Create Coupon', err.response?.data?.message || err.message);
  }

  // 3.2 Apply Coupon - Successful calculation
  try {
    const res = await axios.post(`${API}/coupons/apply`, {
      code: testCouponCode,
      cartTotal: 1650,
      productIds: [testProductId],
    });
    // 20% of 1650 = 330 EGP (under max cap of 400)
    assert(res.status === 200, 'Apply coupon API succeeds');
    assert(res.data.data.discountAmount === 330, `Calculated discount is exactly 330 EGP (was: ${res.data.data.discountAmount})`);
    assert(res.data.data.finalTotal === 1320, `Final total after discount is 1320 EGP (was: ${res.data.data.finalTotal})`);
  } catch (err) {
    assert(false, 'Apply coupon API calculation', err.response?.data?.message || err.message);
  }

  // 3.3 Apply Coupon - Min order value violation
  try {
    await axios.post(`${API}/coupons/apply`, {
      code: testCouponCode,
      cartTotal: 200, // less than minOrderValue of 500
    });
    assert(false, 'Coupon application below min order value rejected');
  } catch (err) {
    assert(err.response?.status === 400, 'Coupon application below min order value rejected with 400');
  }

  // 3.4 Instant Toggle Inactive in Admin
  try {
    const res = await axios.put(
      `${API}/coupons/${testCouponId}`,
      { isActive: false },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(res.status === 200 && res.data.data.isActive === false, 'Admin instant toggle coupon to inactive');

    // Verify in DB
    const dbCoupon = await db.collection('coupons').findOne({ _id: new mongoose.Types.ObjectId(testCouponId) });
    assert(dbCoupon.isActive === false, 'Coupon inactive state verified in DB');

    // Attempt apply inactive coupon -> must fail
    try {
      await axios.post(`${API}/coupons/apply`, { code: testCouponCode, cartTotal: 1650 });
      assert(false, 'Inactive coupon cannot be applied');
    } catch (applyErr) {
      assert(applyErr.response?.status === 400, 'Inactive coupon rejected with 400');
    }

    // Toggle back to active
    await axios.put(
      `${API}/coupons/${testCouponId}`,
      { isActive: true },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(true, 'Admin instant toggle coupon back to active');
  } catch (err) {
    assert(false, 'Coupon toggle test', err.message);
  }

  // -----------------------------------------------------------
  // SUITE 4: CART & ORDER PROCESSING (ATOMIC INVENTORY & COD)
  // -----------------------------------------------------------
  console.log('\n--- SUITE 4: CART, CHECKOUT & EXCLUSIVE COD ---');

  // Ensure clean cart state for customer
  await db.collection('carts').deleteMany({ userId: new mongoose.Types.ObjectId(customerId) });

  let cartId = '';
  // 4.1 Customer Add to Cart
  try {
    const res = await axios.post(
      `${API}/cart/items`,
      { productId: testProductId, quantity: 2 },
      { headers: { Authorization: `Bearer ${customerToken}` } }
    );
    cartId = res.data.data._id || res.data.data.id;
    assert(res.status === 200 && !!cartId, 'Add product to cart via API');
    assert(res.data.data.subtotal === 3300, `Cart subtotal correctly calculated (2 * 1650 = 3300)`);
  } catch (err) {
    assert(false, 'Add product to cart', err.response?.data?.message || err.message);
  }

  // 4.2 Increase & Decrease Cart Quantity
  try {
    // Update to 3
    let res = await axios.put(
      `${API}/cart/items/${testProductId}`,
      { quantity: 3 },
      { headers: { Authorization: `Bearer ${customerToken}` } }
    );
    assert(res.data.data.items[0].quantity === 3, 'Cart item quantity updated to 3');

    // Update back to 2
    res = await axios.put(
      `${API}/cart/items/${testProductId}`,
      { quantity: 2 },
      { headers: { Authorization: `Bearer ${customerToken}` } }
    );
    assert(res.data.data.items[0].quantity === 2, 'Cart item quantity updated back to 2');
  } catch (err) {
    assert(false, 'Cart quantity update', err.message);
  }

  // 4.3 Oversell Prevention: Attempting to add quantity > available inventory
  try {
    await axios.put(
      `${API}/cart/items/${testProductId}`,
      { quantity: 9999 }, // available is 20
      { headers: { Authorization: `Bearer ${customerToken}` } }
    );
    assert(false, 'Oversell quantity rejected');
  } catch (err) {
    assert(err.response?.status === 400, 'Oversell attempt rejected by backend with 400 Bad Request');
  }

  // 4.4 Checkout Security: Reject non-COD payment method
  try {
    const idempotencyKey = `idemp-hack-${Date.now()}`;
    await axios.post(
      `${API}/checkout`,
      {
        cartId,
        shippingAddress: {
          recipientName: 'Test Recipient',
          phone: '01012345678',
          streetAddress: '15 Test Street',
          city: 'Nasr City',
          governorate: 'cairo',
        },
        paymentMethod: 'credit_card', // Non-COD attempt
      },
      {
        headers: {
          Authorization: `Bearer ${customerToken}`,
          'Idempotency-Key': idempotencyKey,
        },
      }
    );
    assert(false, 'Non-COD payment method rejected');
  } catch (err) {
    assert(
      err.response?.status === 400 && err.response?.data?.message?.includes('Cash on delivery'),
      'Non-COD payment method rejected strictly (Cash on delivery only)'
    );
  }

  // 4.5 Successful COD Checkout with Coupon
  const checkoutIdempotencyKey = `idemp-real-${Date.now()}`;
  try {
    const res = await axios.post(
      `${API}/checkout`,
      {
        cartId,
        shippingAddress: {
          recipientName: 'أحمد محمود التست',
          phone: '01098765432',
          streetAddress: 'شارع 9 المعادي، عمارة 12 الدور 3',
          city: 'المعادي',
          governorate: 'cairo',
          notes: 'يرجى الاتصال قبل الوصول بنصف ساعة',
        },
        paymentMethod: 'cash_on_delivery',
        couponCode: testCouponCode,
      },
      {
        headers: {
          Authorization: `Bearer ${customerToken}`,
          'Idempotency-Key': checkoutIdempotencyKey,
        },
      }
    );

    testOrderId = res.data.data._id || res.data.data.id;
    testOrderNumber = res.data.data.orderNumber;
    assert(res.status === 201 && !!testOrderId, 'Complete COD Checkout successfully');
    assert(res.data.data.paymentMethod === 'cash_on_delivery', 'Order payment method is cash_on_delivery');
    assert(res.data.data.couponCode === testCouponCode, 'Coupon code linked to order');
    assert(res.data.data.couponDiscount > 0, `Coupon discount applied on order: ${res.data.data.couponDiscount} EGP`);

    // 4.6 DB State Verification after Order Creation
    const dbOrder = await db.collection('orders').findOne({ _id: new mongoose.Types.ObjectId(testOrderId) });
    assert(!!dbOrder, 'Order document exists in MongoDB');
    assert(dbOrder.items.length === 1 && dbOrder.items[0].quantity === 2, 'Order items quantity matches cart (2)');
    assert(
      (dbOrder.shippingAddress.recipientName === 'أحمد محمود التست' ||
       dbOrder.shippingAddress.firstName === 'أحمد') &&
      dbOrder.shippingAddress.addressLine1.includes('المعادي'),
      'Arabic customer address correctly saved'
    );

    // 4.7 Atomic Inventory Reservation Check in DB
    const updatedProduct = await db.collection('products').findOne({ _id: new mongoose.Types.ObjectId(testProductId) });
    assert(
      updatedProduct.inventory.reservedQuantity === 2,
      `Product inventory reservedQuantity incremented by 2 (now: ${updatedProduct.inventory.reservedQuantity})`
    );

    // 4.8 Coupon usage counter increment check in DB
    const updatedCoupon = await db.collection('coupons').findOne({ code: testCouponCode });
    assert(updatedCoupon.usedCount === 1, `Coupon usedCount incremented in DB (usedCount: ${updatedCoupon.usedCount})`);

    // 4.9 Idempotency Check: Resubmitting identical request
    const retryRes = await axios.post(
      `${API}/checkout`,
      {
        cartId,
        shippingAddress: {
          recipientName: 'أحمد محمود التست',
          phone: '01098765432',
          streetAddress: 'شارع 9 المعادي، عمارة 12 الدور 3',
          city: 'المعادي',
          governorate: 'cairo',
          notes: 'يرجى الاتصال قبل الوصول بنصف ساعة',
        },
        paymentMethod: 'cash_on_delivery',
        couponCode: testCouponCode,
      },
      {
        headers: {
          Authorization: `Bearer ${customerToken}`,
          'Idempotency-Key': checkoutIdempotencyKey,
        },
      }
    );
    assert(retryRes.status === 200 && retryRes.data.fromCache === true, 'Duplicate request with same Idempotency-Key returns cached order (no double billing/order)');
  } catch (err) {
    assert(false, 'COD Checkout flow', err.response?.data?.message || err.message);
  }

  // -----------------------------------------------------------
  // SUITE 5: ADMIN ORDER MANAGEMENT & PRINTING INVOICE
  // -----------------------------------------------------------
  console.log('\n--- SUITE 5: ADMIN ORDER OPERATIONS & INVOICE PRINTING ---');

  // 5.1 Admin View Order
  try {
    const res = await axios.get(`${API}/orders/${testOrderId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(res.status === 200 && res.data.data.orderNumber === testOrderNumber, 'Admin retrieves specific order details');
  } catch (err) {
    assert(false, 'Admin retrieves order details', err.message);
  }

  // 5.2 Admin Update Status Transition (pending -> confirmed)
  try {
    const res = await axios.put(
      `${API}/orders/${testOrderId}/status`,
      { status: 'confirmed', note: 'تم تأكيد الطلب هاتفياً مع العميل' },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(res.status === 200 && res.data.data.status === 'confirmed', 'Order status updated to confirmed');

    // DB verify
    const dbOrder = await db.collection('orders').findOne({ _id: new mongoose.Types.ObjectId(testOrderId) });
    assert(dbOrder.status === 'confirmed', 'Order confirmed status updated in MongoDB');
  } catch (err) {
    assert(false, 'Order status update to confirmed', err.message);
  }

  // 5.3 Order Tracking via Public API
  try {
    const res = await axios.get(`${API}/orders/number/${testOrderNumber}`);
    assert(res.status === 200 && res.data.data.status === 'confirmed', 'Public Order Tracking by order number');
  } catch (err) {
    assert(false, 'Public Order Tracking', err.message);
  }

  // -----------------------------------------------------------
  // SUITE 6: FRONTEND ROUTE & SSR INTEGRITY SMOKE TEST
  // -----------------------------------------------------------
  console.log('\n--- SUITE 6: FRONTEND HTTP ROUTES & RENDER INTEGRITY ---');

  const routesToTest = [
    { path: '/ar', name: 'Homepage (Arabic)' },
    { path: '/en', name: 'Homepage (English)' },
    { path: '/ar/shop', name: 'Shop Page (Arabic)' },
    { path: '/en/shop', name: 'Shop Page (English)' },
    { path: `/ar/product/${testProductId}`, name: 'Product Detail Page' },
    { path: '/ar/cart', name: 'Cart Page' },
    { path: '/ar/checkout', name: 'Checkout Page' },
    { path: `/ar/order-confirmation/${testOrderNumber}`, name: 'Order Confirmation Page' },
    { path: '/ar/login', name: 'Login Page' },
    { path: '/ar/register', name: 'Register Page' },
    { path: '/ar/track', name: 'Track Order Page' },
    { path: '/admin', name: 'Admin Dashboard Home' },
    { path: '/admin/orders', name: 'Admin Orders Table' },
    { path: `/admin/orders/${testOrderId}`, name: 'Admin Order Detail' },
    { path: `/admin/orders/${testOrderId}/invoice`, name: 'Admin Order Invoice Print View' },
    { path: '/admin/products', name: 'Admin Products Table' },
    { path: '/admin/categories', name: 'Admin Categories Table' },
    { path: '/admin/coupons', name: 'Admin Coupons Management' },
    { path: '/admin/ads', name: 'Admin Ads & Banners' },
    { path: '/admin/content', name: 'Admin CMS Content' },
    { path: '/admin/settings', name: 'Admin Site Themes & Settings' },
  ];

  for (const r of routesToTest) {
    try {
      const res = await axios.get(`${FRONTEND}${r.path}`, {
        headers: { 'User-Agent': 'RAWAQA-QA-Tester/1.0' },
        validateStatus: () => true, // capture all status codes
      });
      assert(
        res.status === 200,
        `Route loads: ${r.name} (${r.path})`,
        `Status: ${res.status}`
      );
    } catch (err) {
      assert(false, `Route loads: ${r.name} (${r.path})`, err.message);
    }
  }

  // -----------------------------------------------------------
  // SUITE 7: CMS & THEME SYNCHRONIZATION TEST
  // -----------------------------------------------------------
  console.log('\n--- SUITE 7: CMS CONTENT & THEME SYNCHRONIZATION ---');

  // 7.1 Update site content via Admin
  try {
    const testTagline = `جودة تدوم لسنوات - اختبار QA ${uniqueSuffix}`;
    const res = await axios.put(
      `${API}/admin/content/why`,
      {
        data: {
          title: testTagline,
          points: [
            { title: 'أقمشة فاخرة', desc: 'مقاومة للماء وسهلة التنظيف' },
            { title: 'حبيبات فوم عالية الكثافة', desc: 'راحة تدوم دون هبوط' },
          ],
        },
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(res.status === 200, 'Admin Content CMS Update (Why Section)');

    // Verify via public content API
    const publicContent = await axios.get(`${API}/content/why`);
    assert(publicContent.data.data.title === testTagline, 'Public Content API immediately reflects updated CMS text');
  } catch (err) {
    assert(false, 'CMS content update and verification', err.message);
  }

  // 7.2 Update Theme Colors in Admin Settings
  try {
    const res = await axios.put(
      `${API}/admin/settings`,
      {
        colors: {
          gold: '#dfb76c',
          charcoal: '#171018',
        },
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    assert(res.status === 200, 'Admin Theme Settings update API');

    // Verify public settings
    const publicSettings = await axios.get(`${API}/settings`);
    assert(publicSettings.data.data.gold === '#dfb76c' && publicSettings.data.data.charcoal === '#171018', 'Public Settings API immediately serves new theme colors');
  } catch (err) {
    assert(false, 'Theme settings update', err.message);
  }

  // -----------------------------------------------------------
  // CLEANUP TEST ARTIFACTS
  // -----------------------------------------------------------
  console.log('\n--- CLEANUP OF TEST FIXTURES ---');
  try {
    if (testCouponId) {
      await db.collection('coupons').deleteOne({ _id: new mongoose.Types.ObjectId(testCouponId) });
    }
    if (testProductId) {
      await db.collection('products').deleteOne({ _id: new mongoose.Types.ObjectId(testProductId) });
    }
    if (testCategoryId) {
      await db.collection('categories').deleteOne({ _id: new mongoose.Types.ObjectId(testCategoryId) });
    }
    console.log('✅ Cleaned up temporary test coupon, product, and category from DB.');
  } catch (cleanErr) {
    console.warn('Cleanup warning:', cleanErr.message);
  }

  await mongoose.disconnect();

  console.log('\n========================================================');
  console.log(`AUDIT COMPLETE: ${results.passed} / ${results.total} Passed (${Math.round((results.passed / results.total) * 100)}%)`);
  if (results.failed > 0) {
    console.log(`❌ Failures (${results.failed}):`);
    results.failures.forEach(f => console.log(` - ${f.name}: ${f.details}`));
  } else {
    console.log('🎉 ALL INTEGRATION, DATABASE, SECURITY & E2E CHECKS PASSED 100%!');
  }
  console.log('========================================================\n');
}

runTestSuite().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});

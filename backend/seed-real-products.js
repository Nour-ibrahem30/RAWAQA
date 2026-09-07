/**
 * Full real-data seed:
 * - Clears old products
 * - Seeds all products with real images + real prices from Inforamtions.txt
 * - Seeds admin + test user
 * - Seeds 2 default ads
 *
 * Run: node seed-real-products.js
 */
const m   = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

m.connect(process.env.MONGODB_URI).then(async () => {
  const db = m.connection;
  const now = new Date();

  // ── Get category IDs ──────────────────────────────────────────────────────
  const cats = await db.collection('categories').find({}).toArray();
  const catMap = {};
  cats.forEach(c => { catMap[c.slug] = c._id; });
  console.log('Categories found:', Object.keys(catMap));

  if (!catMap['relax'] || !catMap['kids']) {
    console.error('❌ Categories missing! Run seed-admin.js first.');
    process.exit(1);
  }

  // ── Wipe old products ─────────────────────────────────────────────────────
  const deleted = await db.collection('products').deleteMany({});
  console.log('Deleted old products:', deleted.deletedCount);

  // ── Build new products ────────────────────────────────────────────────────

  // chair-lounge-new: 3 images
  // From info: 110×110×90 cm — price 1920 EGP
  const chairImages = [1,2,3].map((n, i) => ({
    url: `/products/chair-lounge-new/img-${n}.jpg`,
    alt: `Chair Lounge ${n}`, isPrimary: i === 0, order: i,
  }));

  // 8ball-new: 4 images
  // From info: Size 2XL, 99×90×55 cm, 120 kg — price 1650 EGP
  const ballImages = [1,2,3,4].map((n, i) => ({
    url: `/products/8ball-new/img-${n}.jpg`,
    alt: `8-Ball Bean Bag ${n}`, isPrimary: i === 0, order: i,
  }));

  // football-new: 17 images
  // From info: L=1270, XL=1430, 2XL=1610, 3XL=1920 EGP
  const fbAll = Array.from({length:17}, (_, i) => ({
    url: `/products/football-new/img-${i+1}.jpg`,
    alt: `Football Bean Bag ${i+1}`, isPrimary: i === 0, order: i,
  }));
  // Split images per size (≈4 each, last size gets more)
  const fbL   = fbAll.slice(0,5);   // 5 images
  const fbXL  = fbAll.slice(5,9);   // 4 images
  const fb2XL = fbAll.slice(9,13);  // 4 images
  const fb3XL = fbAll.slice(13);    // 4 images
  // Set isPrimary for each group
  [fbL, fbXL, fb2XL, fb3XL].forEach(group => {
    group.forEach((img, i) => { img.isPrimary = i === 0; img.order = i; });
  });

  const PRODUCTS = [
    // ── 1. Chair Lounge ──────────────────────────────────────────────────────
    {
      sku:  'RWQ-CHL-001',
      slugEn: 'chair-lounge', slugAr: 'كرسي-لاونج',
      nameAr: 'كرسي لاونج',
      nameEn: 'Chair Lounge',
      descriptionAr: 'كرسي لاونج فاخر — 110×110×90 سم',
      descriptionEn: 'Premium Chair Lounge — 110×110×90 cm',
      longDescriptionAr: 'كرسي اللاونج من رواقة — تصميم أنيق يجمع بين الراحة والفخامة. الأبعاد: 110 سم × 110 سم × 90 سم. مصنوع من أجود الخامات.',
      longDescriptionEn: 'Rawaqa Chair Lounge — elegant design combining comfort and luxury. Dimensions: 110×110×90 cm. Made from premium materials.',
      price: 1920,
      compareAtPrice: 2300,
      category: catMap['relax'],
      images: chairImages,
      inventory: { onHandQuantity: 20, reservedQuantity: 0, availableQuantity: 20, lowStockThreshold: 4, allowBackorder: false, lastSyncedAt: now },
      featured: true, status: 'active',
      tags: ['لاونج', 'فاخر', 'استرخاء'],
      createdAt: now, updatedAt: now,
    },

    // ── 2. 8-Ball Bean Bag ──────────────────────────────────────────────────
    {
      sku:  'RWQ-8B-001',
      slugEn: '8ball-bean-bag', slugAr: 'بين-باج-8-بول',
      nameAr: 'بين باج 8-بول',
      nameEn: '8-Ball Bean Bag',
      descriptionAr: 'بين باج كرة بلياردو — مقاس 2XL، 99×90×55 سم، يتحمل 120 كجم',
      descriptionEn: 'Billiard ball bean bag — Size 2XL, 99×90×55 cm, 120 kg capacity',
      longDescriptionAr: 'بين باج 8-بول من رواقة — تصميم مميز على شكل كرة البلياردو. المقاس 2XL: 99 سم × 90 سم × 55 سم. يتحمل حتى 120 كجم. جلد صناعي عالي الجودة سهل التنظيف.',
      longDescriptionEn: 'Rawaqa 8-Ball Bean Bag — unique billiard ball design. Size 2XL: 99×90×55 cm, 120 kg capacity. Premium easy-clean faux leather.',
      price: 1650,
      compareAtPrice: 1950,
      category: catMap['kids'],
      images: ballImages,
      inventory: { onHandQuantity: 40, reservedQuantity: 0, availableQuantity: 40, lowStockThreshold: 8, allowBackorder: false, lastSyncedAt: now },
      featured: true, status: 'active',
      tags: ['بلياردو', 'أطفال', 'ألعاب'],
      createdAt: now, updatedAt: now,
    },

    // ── 3. Football Bean Bag — L ─────────────────────────────────────────────
    {
      sku:  'RWQ-FB-L',
      slugEn: 'football-bean-bag-l', slugAr: 'بين-باج-كورة-L',
      nameAr: 'بين باج كورة — مقاس L',
      nameEn: 'Football Bean Bag — Size L',
      descriptionAr: 'بين باج على شكل كرة القدم — مقاس L',
      descriptionEn: 'Football-shaped bean bag — Size L',
      longDescriptionAr: 'بين باج كورة القدم من رواقة — جلد صناعي أسود وأبيض. مقاس L. متوفر بـ 4 مقاسات مختلفة.',
      longDescriptionEn: 'Rawaqa Football Bean Bag — black and white faux leather. Size L. Available in 4 sizes.',
      price: 1270,
      compareAtPrice: 1500,
      category: catMap['kids'],
      images: fbL,
      inventory: { onHandQuantity: 50, reservedQuantity: 0, availableQuantity: 50, lowStockThreshold: 10, allowBackorder: false, lastSyncedAt: now },
      featured: true, status: 'active',
      tags: ['كورة', 'أطفال', 'ألعاب'],
      createdAt: now, updatedAt: now,
    },

    // ── 4. Football Bean Bag — XL ────────────────────────────────────────────
    {
      sku:  'RWQ-FB-XL',
      slugEn: 'football-bean-bag-xl', slugAr: 'بين-باج-كورة-XL',
      nameAr: 'بين باج كورة — مقاس XL',
      nameEn: 'Football Bean Bag — Size XL',
      descriptionAr: 'بين باج على شكل كرة القدم — مقاس XL',
      descriptionEn: 'Football-shaped bean bag — Size XL',
      longDescriptionAr: 'بين باج كورة القدم — مقاس XL. مثالي للكبار.',
      longDescriptionEn: 'Football Bean Bag — Size XL. Perfect for adults.',
      price: 1430,
      compareAtPrice: 1700,
      category: catMap['kids'],
      images: fbXL,
      inventory: { onHandQuantity: 35, reservedQuantity: 0, availableQuantity: 35, lowStockThreshold: 8, allowBackorder: false, lastSyncedAt: now },
      featured: false, status: 'active',
      tags: ['كورة', 'أطفال'],
      createdAt: now, updatedAt: now,
    },

    // ── 5. Football Bean Bag — 2XL ───────────────────────────────────────────
    {
      sku:  'RWQ-FB-2XL',
      slugEn: 'football-bean-bag-2xl', slugAr: 'بين-باج-كورة-2XL',
      nameAr: 'بين باج كورة — مقاس 2XL',
      nameEn: 'Football Bean Bag — Size 2XL',
      descriptionAr: 'بين باج كورة القدم — مقاس 2XL',
      descriptionEn: 'Football bean bag — Size 2XL',
      longDescriptionAr: 'بين باج كورة القدم — مقاس 2XL الكبير.',
      longDescriptionEn: 'Football Bean Bag — Large 2XL size.',
      price: 1610,
      compareAtPrice: 1900,
      category: catMap['kids'],
      images: fb2XL,
      inventory: { onHandQuantity: 30, reservedQuantity: 0, availableQuantity: 30, lowStockThreshold: 8, allowBackorder: false, lastSyncedAt: now },
      featured: false, status: 'active',
      tags: ['كورة', 'أطفال'],
      createdAt: now, updatedAt: now,
    },

    // ── 6. Football Bean Bag — 3XL ───────────────────────────────────────────
    {
      sku:  'RWQ-FB-3XL',
      slugEn: 'football-bean-bag-3xl', slugAr: 'بين-باج-كورة-3XL',
      nameAr: 'بين باج كورة — مقاس 3XL',
      nameEn: 'Football Bean Bag — Size 3XL',
      descriptionAr: 'بين باج كورة القدم — مقاس 3XL',
      descriptionEn: 'Football bean bag — Size 3XL',
      longDescriptionAr: 'بين باج كورة القدم — مقاس 3XL الأكبر والأوسع.',
      longDescriptionEn: 'Football Bean Bag — Largest 3XL size.',
      price: 1920,
      compareAtPrice: 2200,
      category: catMap['kids'],
      images: fb3XL,
      inventory: { onHandQuantity: 20, reservedQuantity: 0, availableQuantity: 20, lowStockThreshold: 5, allowBackorder: false, lastSyncedAt: now },
      featured: false, status: 'active',
      tags: ['كورة', 'أطفال'],
      createdAt: now, updatedAt: now,
    },
  ];

  const inserted = await db.collection('products').insertMany(PRODUCTS);
  console.log('\n✅ Inserted', inserted.insertedCount, 'products:');
  PRODUCTS.forEach(p => console.log(`   ${p.sku} | ${p.nameEn} | ${p.images.length} images | ${p.price} EGP`));

  // ── Seed users (if not exist) ─────────────────────────────────────────────
  console.log('\n👤 Users...');
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@rawaqa.com';
  const ADMIN_PASS  = process.env.ADMIN_PASSWORD || 'Admin@123456';

  const adminExists = await db.collection('users').findOne({ email: ADMIN_EMAIL });
  if (!adminExists) {
    await db.collection('users').insertOne({
      email: ADMIN_EMAIL,
      password: await bcrypt.hash(ADMIN_PASS, 10),
      firstName: 'Super', lastName: 'Admin',
      role: 'super_admin', isEmailVerified: true, isActive: true,
      createdAt: now, updatedAt: now,
    });
    console.log('   ✅ Admin created:', ADMIN_EMAIL);
  } else {
    // Always reset password to be sure
    await db.collection('users').updateOne(
      { email: ADMIN_EMAIL },
      { $set: { password: await bcrypt.hash(ADMIN_PASS, 10), isActive: true, role: 'super_admin' } }
    );
    console.log('   ✅ Admin password reset:', ADMIN_EMAIL);
  }

  const custExists = await db.collection('users').findOne({ email: 'customer@rawaqa.com' });
  if (!custExists) {
    await db.collection('users').insertOne({
      email: 'customer@rawaqa.com',
      password: await bcrypt.hash('Customer@123456', 10),
      firstName: 'Ahmed', lastName: 'Hassan',
      phone: '+201234567890',
      role: 'customer', isEmailVerified: true, isPhoneVerified: true, isActive: true,
      createdAt: now, updatedAt: now,
    });
    console.log('   ✅ Test customer created: customer@rawaqa.com / Customer@123456');
  } else {
    console.log('   ⚠  Customer already exists');
  }

  // ── Seed ads (if not exist) ───────────────────────────────────────────────
  console.log('\n📢 Ads...');
  const adsCount = await db.collection('ads').countDocuments({});
  if (adsCount === 0) {
    await db.collection('ads').insertMany([
      {
        titleAr: 'بين باج رواقة — راحة حقيقية',
        titleEn: 'Rawaqa Bean Bags — Real Comfort',
        subtitleAr: 'تسوق الآن واستمتع بأفضل الأسعار',
        subtitleEn: 'Shop now and enjoy the best prices',
        imageUrl: '/products/ads/ad-1.jpg',
        linkUrl: '/shop',
        placement: 'homepage_banner',
        isActive: true, order: 0,
        createdAt: now, updatedAt: now,
      },
      {
        titleAr: 'مجموعة الكراسي الجديدة',
        titleEn: 'New Chair Collection',
        subtitleAr: 'اكتشف أحدث تصاميم كراسي اللاونج',
        subtitleEn: 'Discover our latest lounge chair designs',
        imageUrl: '/products/ads/ad-2.jpg',
        linkUrl: '/shop',
        placement: 'homepage_banner',
        isActive: true, order: 1,
        createdAt: now, updatedAt: now,
      },
    ]);
    console.log('   ✅ 2 ads created');
  } else {
    console.log('   ⚠  Ads already exist:', adsCount);
  }

  console.log('\n════════════════════════════════════════════');
  console.log('🎉 SEED COMPLETE!');
  console.log('');
  console.log('  Admin     : admin@rawaqa.com / Admin@123456');
  console.log('  Customer  : customer@rawaqa.com / Customer@123456');
  console.log('  Products  :', inserted.insertedCount);
  console.log('  Dashboard : http://localhost:3001/admin');
  console.log('════════════════════════════════════════════\n');

  await m.disconnect();
  process.exit(0);
}).catch(e => { console.error('❌', e.message); process.exit(1); });

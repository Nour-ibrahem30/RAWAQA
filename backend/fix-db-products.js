const m = require('mongoose');
require('dotenv').config();

m.connect(process.env.MONGODB_URI).then(async () => {
  const col = m.connection.collection('products');

  // 1. Delete old placeholder products with no images
  const del = await col.deleteMany({ sku: { $in: ['BB-FS-001','BB-FS-002','BB-KD-001','BB-PL-001','BB-OD-001'] } });
  console.log('Deleted old products:', del.deletedCount);

  // 2. Get category IDs
  const cats = await m.connection.collection('categories').find({}).toArray();
  const catMap = {};
  cats.forEach(c => { catMap[c.slug] = c._id; });
  console.log('Categories:', Object.keys(catMap));

  // 3. Upsert missing products
  const now = new Date();
  const PRODUCTS = [
    {
      sku: 'RWQ-8B-001', slugEn: '8ball-bean-bag', slugAr: 'بين-باج-8-بول',
      nameAr: 'بين باج 8-بول', nameEn: '8-Ball Bean Bag',
      descriptionAr: 'بين باج كرة بلياردو — مقاس 2XL، 99×90×55 سم',
      descriptionEn: 'Billiard ball bean bag — Size 2XL, 99×90×55 cm',
      longDescriptionAr: 'تصميم مميز على شكل كرة البلياردو.',
      longDescriptionEn: 'Unique billiard ball design, 2XL, 120kg capacity.',
      price: 1650, compareAtPrice: 1950, category: catMap['kids'],
      images: [
        { url: '/products/8ball-bean-bag/img-1.jpg', alt: '8-Ball 1', isPrimary: true,  order: 0 },
        { url: '/products/8ball-bean-bag/img-2.jpg', alt: '8-Ball 2', isPrimary: false, order: 1 },
        { url: '/products/8ball-bean-bag/img-3.jpg', alt: '8-Ball 3', isPrimary: false, order: 2 },
        { url: '/products/8ball-bean-bag/img-4.jpg', alt: '8-Ball 4', isPrimary: false, order: 3 },
      ],
      inventory: { onHandQuantity: 40, reservedQuantity: 0, availableQuantity: 40, lowStockThreshold: 8, allowBackorder: false, lastSyncedAt: now },
      featured: true, status: 'active', tags: ['بلياردو', 'أطفال'], createdAt: now, updatedAt: now,
    },
    {
      sku: 'RWQ-FB-L', slugEn: 'football-bean-bag-l', slugAr: 'بين-باج-كورة-L',
      nameAr: 'بين باج كورة — مقاس L', nameEn: 'Football Bean Bag — Size L',
      descriptionAr: 'بين باج على شكل كرة القدم — مقاس L',
      descriptionEn: 'Football-shaped bean bag — Size L',
      longDescriptionAr: 'جلد صناعي أسود وأبيض. مقاس L.',
      longDescriptionEn: 'Black and white faux leather. Size L.',
      price: 1270, compareAtPrice: 1500, category: catMap['kids'],
      images: [
        { url: '/products/football-bean-bag/img-1.jpg',  alt: 'Football L 1',  isPrimary: true,  order: 0 },
        { url: '/products/football-bean-bag/img-2.jpg',  alt: 'Football L 2',  isPrimary: false, order: 1 },
        { url: '/products/football-bean-bag/img-3.jpg',  alt: 'Football L 3',  isPrimary: false, order: 2 },
        { url: '/products/football-bean-bag/img-4.jpg',  alt: 'Football L 4',  isPrimary: false, order: 3 },
        { url: '/products/football-bean-bag/img-5.jpg',  alt: 'Football L 5',  isPrimary: false, order: 4 },
        { url: '/products/football-bean-bag/img-6.jpg',  alt: 'Football L 6',  isPrimary: false, order: 5 },
      ],
      inventory: { onHandQuantity: 50, reservedQuantity: 0, availableQuantity: 50, lowStockThreshold: 10, allowBackorder: false, lastSyncedAt: now },
      featured: true, status: 'active', tags: ['كورة', 'أطفال'], createdAt: now, updatedAt: now,
    },
    {
      sku: 'RWQ-LC-002', slugEn: 'lounge-chair-classic', slugAr: 'كرسي-لاونج-كلاسيك',
      nameAr: 'كرسي لاونج كلاسيك', nameEn: 'Classic Lounge Chair',
      descriptionAr: 'كرسي بين باج لاونج كلاسيك، 90×99×60 سم',
      descriptionEn: 'Classic lounge bean bag, 90×99×60 cm',
      longDescriptionAr: 'كرسي اللاونج الكلاسيك من رواقة.',
      longDescriptionEn: 'Rawaqa Classic Lounge Chair.',
      price: 1815, compareAtPrice: 2100, category: catMap['relax'],
      images: [
        { url: '/products/lounge-chair/c06c5049-6ff5-46e5-91fc-fe4c697ba088.jpg', alt: 'Lounge Chair Classic', isPrimary: true,  order: 0 },
        { url: '/products/lounge-chair/ChatGPT Image Sep 5, 2026, 12_32_34 AM.jpg', alt: 'Lounge Chair Classic 2', isPrimary: false, order: 1 },
      ],
      inventory: { onHandQuantity: 30, reservedQuantity: 0, availableQuantity: 30, lowStockThreshold: 5, allowBackorder: false, lastSyncedAt: now },
      featured: false, status: 'active', tags: ['لاونج', 'كلاسيك'], createdAt: now, updatedAt: now,
    },
  ];

  for (const p of PRODUCTS) {
    const exists = await col.findOne({ sku: p.sku });
    if (exists) {
      await col.updateOne({ sku: p.sku }, { $set: { images: p.images, updatedAt: now } });
      console.log('✅ Updated images:', p.sku);
    } else {
      await col.insertOne(p);
      console.log('✅ Inserted:', p.sku, p.nameEn);
    }
  }

  // 4. Verify final state
  const all = await col.find({}, { projection: { sku: 1, nameEn: 1, 'images': 1 } }).toArray();
  console.log('\n📦 Final products in DB:');
  all.forEach(p => console.log(`  ${p.sku} | ${p.nameEn} | ${p.images?.length || 0} images`));

  await m.disconnect();
  process.exit(0);
}).catch(e => { console.error('❌', e.message); process.exit(1); });

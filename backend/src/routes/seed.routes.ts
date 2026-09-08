/**
 * ONE-TIME seed endpoint — protected by SEED_SECRET env var.
 * DELETE this file after seeding production!
 * 
 * Usage: GET /api/seed?secret=YOUR_SEED_SECRET
 */
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { env } from '../config/env';

const router = Router();

const SEED_SECRET = process.env.SEED_SECRET || 'rawaqa-seed-2026-temp';

router.get('/', async (req: Request, res: Response): Promise<void> => {
  // Security check
  if (req.query.secret !== SEED_SECRET) {
    res.status(403).json({ success: false, message: 'Forbidden' });
    return;
  }

  try {
    const db = mongoose.connection;
    const now = new Date();

    // ── Categories ──────────────────────────────────────────────────────────
    const CATS = [
      { nameAr: 'استرخاء', nameEn: 'Relax',   slug: 'relax',   slugAr: 'استرخاء', slugEn: 'relax',   sortOrder: 1, status: 'active' },
      { nameAr: 'ألعاب',   nameEn: 'Game',    slug: 'game',    slugAr: 'العاب',   slugEn: 'game',    sortOrder: 2, status: 'active' },
      { nameAr: 'أطفال',   nameEn: 'Kids',    slug: 'kids',    slugAr: 'اطفال',   slugEn: 'kids',    sortOrder: 3, status: 'active' },
      { nameAr: 'خارجي',   nameEn: 'Outdoor', slug: 'outdoor', slugAr: 'خارجي',   slugEn: 'outdoor', sortOrder: 4, status: 'active' },
    ];

    const catMap: Record<string, any> = {};
    for (const c of CATS) {
      const found = await db.collection('categories').findOneAndUpdate(
        { slug: c.slug },
        { $set: c },
        { upsert: true, returnDocument: 'after' }
      );
      catMap[c.slug] = found?._id;
    }

    // ── Admin user ───────────────────────────────────────────────────────────
    const adminEmail = env.ADMIN_EMAIL || 'admin@rawaqa.com';
    const adminPass  = env.ADMIN_PASSWORD || 'Admin@123456';
    const hashed     = await bcrypt.hash(adminPass, 10);
    await db.collection('users').updateOne(
      { email: adminEmail },
      { $set: { email: adminEmail, password: hashed, firstName: 'Super', lastName: 'Admin', role: 'super_admin', isEmailVerified: true, isActive: true, updatedAt: now } },
      { upsert: true }
    );

    // ── Products ─────────────────────────────────────────────────────────────
    await db.collection('products').deleteMany({});

    const fbAll = Array.from({ length: 17 }, (_, i) => ({
      url: `https://res.cloudinary.com/dr5welrvq/image/upload/rawaqa/products/football-new/img-${i+1}`,
      alt: `Football ${i+1}`, isPrimary: i === 0, order: i,
    }));

    const PRODUCTS = [
      {
        sku: 'RWQ-CHL-001', slugEn: 'chair-lounge', slugAr: 'كرسي-لاونج',
        nameAr: 'كرسي لاونج', nameEn: 'Chair Lounge',
        descriptionAr: 'كرسي لاونج فاخر — 110×110×90 سم', descriptionEn: 'Premium Chair Lounge — 110×110×90 cm',
        longDescriptionAr: 'كرسي اللاونج من رواقة — تصميم أنيق.', longDescriptionEn: 'Rawaqa Chair Lounge — elegant design.',
        price: 1920, compareAtPrice: 2300, category: catMap['relax'],
        images: [1,2,3].map((n,i) => ({ url: `https://res.cloudinary.com/dr5welrvq/image/upload/rawaqa/products/chair-lounge-new/img-${n}`, alt: `Chair ${n}`, isPrimary: i===0, order: i })),
        inventory: { onHandQuantity: 20, reservedQuantity: 0, availableQuantity: 20, lowStockThreshold: 4, allowBackorder: false, lastSyncedAt: now },
        featured: true, status: 'active', tags: ['لاونج', 'فاخر'], createdAt: now, updatedAt: now,
      },
      {
        sku: 'RWQ-8B-001', slugEn: '8ball-bean-bag', slugAr: 'بين-باج-8-بول',
        nameAr: 'بين باج 8-بول', nameEn: '8-Ball Bean Bag',
        descriptionAr: 'بين باج كرة بلياردو — 2XL، 99×90×55 سم', descriptionEn: 'Billiard ball bean bag — 2XL, 99×90×55 cm',
        longDescriptionAr: 'تصميم مميز على شكل كرة البلياردو.', longDescriptionEn: 'Unique billiard ball design.',
        price: 1650, compareAtPrice: 1950, category: catMap['kids'],
        images: [1,2,3,4].map((n,i) => ({ url: `https://res.cloudinary.com/dr5welrvq/image/upload/rawaqa/products/8ball-new/img-${n}`, alt: `8Ball ${n}`, isPrimary: i===0, order: i })),
        inventory: { onHandQuantity: 40, reservedQuantity: 0, availableQuantity: 40, lowStockThreshold: 8, allowBackorder: false, lastSyncedAt: now },
        featured: true, status: 'active', tags: ['بلياردو', 'أطفال'], createdAt: now, updatedAt: now,
      },
      {
        sku: 'RWQ-FB-L', slugEn: 'football-bean-bag-l', slugAr: 'بين-باج-كورة-L',
        nameAr: 'بين باج كورة — مقاس L', nameEn: 'Football Bean Bag — Size L',
        descriptionAr: 'بين باج كورة القدم — مقاس L', descriptionEn: 'Football-shaped bean bag — Size L',
        longDescriptionAr: 'جلد صناعي أسود وأبيض.', longDescriptionEn: 'Black and white faux leather.',
        price: 1270, compareAtPrice: 1500, category: catMap['kids'],
        images: fbAll.slice(0,5),
        inventory: { onHandQuantity: 50, reservedQuantity: 0, availableQuantity: 50, lowStockThreshold: 10, allowBackorder: false, lastSyncedAt: now },
        featured: true, status: 'active', tags: ['كورة', 'أطفال'], createdAt: now, updatedAt: now,
      },
      {
        sku: 'RWQ-FB-XL', slugEn: 'football-bean-bag-xl', slugAr: 'بين-باج-كورة-XL',
        nameAr: 'بين باج كورة — مقاس XL', nameEn: 'Football Bean Bag — Size XL',
        descriptionAr: 'بين باج كورة القدم — مقاس XL', descriptionEn: 'Football bean bag — Size XL',
        longDescriptionAr: 'مقاس XL', longDescriptionEn: 'Size XL',
        price: 1430, compareAtPrice: 1700, category: catMap['kids'],
        images: fbAll.slice(5,9),
        inventory: { onHandQuantity: 35, reservedQuantity: 0, availableQuantity: 35, lowStockThreshold: 8, allowBackorder: false, lastSyncedAt: now },
        featured: false, status: 'active', tags: ['كورة'], createdAt: now, updatedAt: now,
      },
      {
        sku: 'RWQ-FB-2XL', slugEn: 'football-bean-bag-2xl', slugAr: 'بين-باج-كورة-2XL',
        nameAr: 'بين باج كورة — مقاس 2XL', nameEn: 'Football Bean Bag — Size 2XL',
        descriptionAr: 'بين باج كورة القدم — مقاس 2XL', descriptionEn: 'Football bean bag — Size 2XL',
        longDescriptionAr: 'مقاس 2XL', longDescriptionEn: 'Size 2XL',
        price: 1610, compareAtPrice: 1900, category: catMap['kids'],
        images: fbAll.slice(9,13),
        inventory: { onHandQuantity: 30, reservedQuantity: 0, availableQuantity: 30, lowStockThreshold: 8, allowBackorder: false, lastSyncedAt: now },
        featured: false, status: 'active', tags: ['كورة'], createdAt: now, updatedAt: now,
      },
      {
        sku: 'RWQ-FB-3XL', slugEn: 'football-bean-bag-3xl', slugAr: 'بين-باج-كورة-3XL',
        nameAr: 'بين باج كورة — مقاس 3XL', nameEn: 'Football Bean Bag — Size 3XL',
        descriptionAr: 'بين باج كورة القدم — مقاس 3XL', descriptionEn: 'Football bean bag — Size 3XL',
        longDescriptionAr: 'مقاس 3XL الأكبر', longDescriptionEn: 'Largest 3XL size',
        price: 1920, compareAtPrice: 2200, category: catMap['kids'],
        images: fbAll.slice(13),
        inventory: { onHandQuantity: 20, reservedQuantity: 0, availableQuantity: 20, lowStockThreshold: 5, allowBackorder: false, lastSyncedAt: now },
        featured: false, status: 'active', tags: ['كورة'], createdAt: now, updatedAt: now,
      },
    ];

    await db.collection('products').insertMany(PRODUCTS);

    // ── Ads ──────────────────────────────────────────────────────────────────
    const adsCount = await db.collection('ads').countDocuments();
    if (adsCount === 0) {
      await db.collection('ads').insertMany([
        {
          titleAr: 'بين باج رواقة', titleEn: 'Rawaqa Bean Bags',
          subtitleAr: 'تسوق الآن', subtitleEn: 'Shop now',
          imageUrl: 'https://res.cloudinary.com/dr5welrvq/image/upload/rawaqa/products/ads/ad-1',
          linkUrl: '/shop', placement: 'homepage_banner', isActive: true, order: 0, createdAt: now, updatedAt: now,
        },
        {
          titleAr: 'مجموعة جديدة', titleEn: 'New Collection',
          subtitleAr: 'اكتشف التصاميم الجديدة', subtitleEn: 'Discover new designs',
          imageUrl: 'https://res.cloudinary.com/dr5welrvq/image/upload/rawaqa/products/ads/ad-2',
          linkUrl: '/shop', placement: 'homepage_banner', isActive: true, order: 1, createdAt: now, updatedAt: now,
        },
      ]);
    }

    res.json({
      success: true,
      message: '✅ Production seed complete!',
      data: {
        categories: Object.keys(catMap).length,
        products: PRODUCTS.length,
        admin: adminEmail,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

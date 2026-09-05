/**
 * RAWAQA 2.0 - Seed Script
 * Seeds: admin user + 4 categories + 8 products from the approved prototype
 *
 * Usage:
 *   npm run seed
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

import { User, UserRole } from '../models/User';
import { Category } from '../models/Category';
import { Product } from '../models/Product';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rawaqa';

// ─── Admin ────────────────────────────────────────────────────────────────────
const ADMIN = {
  firstName: 'Super',
  lastName:  'Admin',
  email:     process.env.ADMIN_EMAIL    || 'admin@rawaqa.com',
  password:  process.env.ADMIN_PASSWORD || 'Admin@123456',
  role:      UserRole.SUPER_ADMIN,
  isEmailVerified: true,
  isActive: true,
};

const CUSTOMER = {
  firstName: 'Ahmed',
  lastName:  'Test',
  email:     'customer@rawaqa.com',
  password:  'Customer@123456',
  phone:     '+201234567890',
  role:      UserRole.CUSTOMER,
  isEmailVerified: true,
  isPhoneVerified: true,
  isActive: true,
};

// ─── 4 canonical categories (from prototype) ──────────────────────────────────
const CATEGORIES = [
  {
    nameAr: 'استرخاء',
    nameEn: 'Relax',
    descriptionAr: 'كراسي بين باج فاخرة للاسترخاء وأوقات الفراغ',
    descriptionEn: 'Premium bean bags for relaxation and leisure time',
    slug: 'relax',
    sortOrder: 1,
    status: 'active',
  },
  {
    nameAr: 'ألعاب',
    nameEn: 'Game',
    descriptionAr: 'كراسي منخفضة مصممة لجلسات الألعاب الطويلة',
    descriptionEn: 'Low-profile chairs designed for long gaming sessions',
    slug: 'game',
    sortOrder: 2,
    status: 'active',
  },
  {
    nameAr: 'أطفال',
    nameEn: 'Kids',
    descriptionAr: 'كراسي صغيرة وآمنة مصممة خصيصاً للأطفال',
    descriptionEn: 'Small, safe chairs specially designed for children',
    slug: 'kids',
    sortOrder: 3,
    status: 'active',
  },
  {
    nameAr: 'خارجي',
    nameEn: 'Outdoor',
    descriptionAr: 'كراسي مقاومة للعوامل الجوية للاستخدام الخارجي',
    descriptionEn: 'Weather-resistant chairs for outdoor use',
    slug: 'outdoor',
    sortOrder: 4,
    status: 'active',
  },
];

// ─── 8 Real products from product folders ─────────────────────────────────────
const buildProducts = (catIds: Record<string, string>) => [
  // ── 1. Lounge Chair — 90×99×60 cm — 1815 EGP ──────────────────────────
  {
    sku: 'RWQ-LC-001',
    nameAr: 'كرسي لاونج',
    nameEn: 'Lounge Chair',
    descriptionAr: 'كرسي بين باج فاخر بتصميم لاونج مريح، مقاس 90×99×60 سم',
    descriptionEn: 'Premium bean bag with lounge chair design, 90×99×60 cm',
    longDescriptionAr: 'كرسي اللاونج من رواقة — تصميم فريد يجمع بين راحة البين باج وأناقة الكرسي. مصنوع من جلد صناعي فاخر ناعم الملمس، بمقاييس مريحة 90 سم عرض × 99 سم عمق × 60 سم ارتفاع. مثالي لغرف المعيشة والديوانيات.',
    longDescriptionEn: 'The Rawaqa Lounge Chair — a unique design combining the comfort of a bean bag with the elegance of an armchair. Made from soft premium faux leather, 90cm W × 99cm D × 60cm H. Perfect for living rooms and lounges.',
    price: 1815,
    compareAtPrice: 2100,
    category: catIds['relax'],
    images: ['/products/lounge-chair/img-1.jpg', '/products/lounge-chair/img-2.jpg'],
    inventory: { onHandQuantity: 25, reservedQuantity: 0, availableQuantity: 25, lowStockThreshold: 5, allowBackorder: false },
    featured: true,
    status: 'active',
    tags: ['لاونج', 'جلد', 'استرخاء'],
  },

  // ── 2. Classic Lounge Chair variant ────────────────────────────────────
  {
    sku: 'RWQ-LC-002',
    nameAr: 'كرسي لاونج كلاسيك',
    nameEn: 'Classic Lounge Chair',
    descriptionAr: 'كرسي بين باج لاونج كلاسيك بألوان متعددة، 90×99×60 سم',
    descriptionEn: 'Classic lounge bean bag in multiple colors, 90×99×60 cm',
    longDescriptionAr: 'كرسي اللاونج الكلاسيك من رواقة — تصميم خالد يناسب جميع الديكورات. مقاييس 90×99×60 سم، جلد صناعي سهل التنظيف.',
    longDescriptionEn: 'Rawaqa Classic Lounge Chair — timeless design for all decors. 90×99×60 cm, easy-clean faux leather.',
    price: 1815,
    compareAtPrice: 2100,
    category: catIds['relax'],
    images: ['/products/lounge-chair/img-2.jpg', '/products/lounge-chair/img-1.jpg'],
    inventory: { onHandQuantity: 30, reservedQuantity: 0, availableQuantity: 30, lowStockThreshold: 5, allowBackorder: false },
    featured: false,
    status: 'active',
    tags: ['لاونج', 'كلاسيك'],
  },

  // ── 3. 8-Ball Bean Bag 2XL — 99×90×55 cm — 120 kg — 1650 EGP ──────────
  {
    sku: 'RWQ-8B-001',
    nameAr: 'بين باج 8-بول',
    nameEn: '8-Ball Bean Bag',
    descriptionAr: 'بين باج كرة بلياردو — مقاس 2XL، 99×90×55 سم، يتحمل 120 كجم',
    descriptionEn: 'Billiard ball bean bag — Size 2XL, 99×90×55 cm, holds 120 kg',
    longDescriptionAr: 'بين باج 8-بول من رواقة — تصميم مميز على شكل كرة البلياردو الصفراء. مقاس 2XL بأبعاد 99×90×55 سم، يتحمل وزن حتى 120 كجم. جلد صناعي سهل التنظيف.',
    longDescriptionEn: 'Rawaqa 8-Ball Bean Bag — unique billiard ball design. Size 2XL, 99×90×55cm, weight capacity 120kg. Easy-clean faux leather.',
    price: 1650,
    compareAtPrice: 1950,
    category: catIds['kids'],
    images: ['/products/8ball-bean-bag/img-1.jpg', '/products/8ball-bean-bag/img-2.jpg', '/products/8ball-bean-bag/img-3.jpg'],
    inventory: { onHandQuantity: 40, reservedQuantity: 0, availableQuantity: 40, lowStockThreshold: 8, allowBackorder: false },
    featured: true,
    status: 'active',
    tags: ['بلياردو', 'أطفال', 'ديكور'],
  },

  // ── 4. Football Bean Bag — L — 1270 EGP ────────────────────────────────
  {
    sku: 'RWQ-FB-L',
    nameAr: 'بين باج كورة — مقاس L',
    nameEn: 'Football Bean Bag — Size L',
    descriptionAr: 'بين باج على شكل كرة القدم — مقاس L',
    descriptionEn: 'Football-shaped bean bag — Size L',
    longDescriptionAr: 'بين باج كورة القدم من رواقة — جلد صناعي أسود وأبيض. متوفر بـ 4 مقاسات. مقاس L.',
    longDescriptionEn: 'Rawaqa Football Bean Bag — black and white faux leather. Available in 4 sizes. Size L.',
    price: 1270,
    compareAtPrice: 1500,
    category: catIds['kids'],
    images: ['/products/football-bean-bag/img-1.jpg', '/products/football-bean-bag/img-2.jpg', '/products/football-bean-bag/img-3.jpg', '/products/football-bean-bag/img-4.jpg', '/products/football-bean-bag/img-5.jpg', '/products/football-bean-bag/img-6.jpg'],
    inventory: { onHandQuantity: 50, reservedQuantity: 0, availableQuantity: 50, lowStockThreshold: 10, allowBackorder: false },
    featured: true,
    status: 'active',
    tags: ['كورة', 'أطفال', 'ألعاب'],
  },

  // ── 5. Football Bean Bag — XL — 1430 EGP ───────────────────────────────
  {
    sku: 'RWQ-FB-XL',
    nameAr: 'بين باج كورة — مقاس XL',
    nameEn: 'Football Bean Bag — Size XL',
    descriptionAr: 'بين باج على شكل كرة القدم — مقاس XL',
    descriptionEn: 'Football-shaped bean bag — Size XL',
    longDescriptionAr: 'بين باج كورة القدم — مقاس XL.',
    longDescriptionEn: 'Football Bean Bag — Size XL.',
    price: 1430,
    compareAtPrice: 1700,
    category: catIds['kids'],
    images: ['/products/football-bean-bag/img-2.jpg', '/products/football-bean-bag/img-1.jpg'],
    inventory: { onHandQuantity: 35, reservedQuantity: 0, availableQuantity: 35, lowStockThreshold: 8, allowBackorder: false },
    featured: false,
    status: 'active',
    tags: ['كورة', 'أطفال'],
  },

  // ── 6. Football Bean Bag — 2XL — 1610 EGP ──────────────────────────────
  {
    sku: 'RWQ-FB-2XL',
    nameAr: 'بين باج كورة — مقاس 2XL',
    nameEn: 'Football Bean Bag — Size 2XL',
    descriptionAr: 'بين باج على شكل كرة القدم — مقاس 2XL',
    descriptionEn: 'Football-shaped bean bag — Size 2XL',
    longDescriptionAr: 'بين باج كورة القدم — مقاس 2XL الكبير.',
    longDescriptionEn: 'Football Bean Bag — Large 2XL size.',
    price: 1610,
    compareAtPrice: 1900,
    category: catIds['kids'],
    images: ['/products/football-bean-bag/img-3.jpg', '/products/football-bean-bag/img-4.jpg'],
    inventory: { onHandQuantity: 30, reservedQuantity: 0, availableQuantity: 30, lowStockThreshold: 8, allowBackorder: false },
    featured: false,
    status: 'active',
    tags: ['كورة', 'أطفال'],
  },

  // ── 7. Football Bean Bag — 3XL — 1920 EGP ──────────────────────────────
  {
    sku: 'RWQ-FB-3XL',
    nameAr: 'بين باج كورة — مقاس 3XL',
    nameEn: 'Football Bean Bag — Size 3XL',
    descriptionAr: 'بين باج على شكل كرة القدم — مقاس 3XL',
    descriptionEn: 'Football-shaped bean bag — Size 3XL',
    longDescriptionAr: 'بين باج كورة القدم — مقاس 3XL الأكبر.',
    longDescriptionEn: 'Football Bean Bag — Largest 3XL size.',
    price: 1920,
    compareAtPrice: 2200,
    category: catIds['kids'],
    images: ['/products/football-bean-bag/img-5.jpg', '/products/football-bean-bag/img-6.jpg'],
    inventory: { onHandQuantity: 20, reservedQuantity: 0, availableQuantity: 20, lowStockThreshold: 5, allowBackorder: false },
    featured: false,
    status: 'active',
    tags: ['كورة', 'أطفال'],
  },

  // ── 8. Chair Lounge (Black Velvet + Ottoman) — 110×110×90 — 1920 EGP ───
  {
    sku: 'RWQ-CHL-001',
    nameAr: 'كرسي لاونج مخمل + فوتة',
    nameEn: 'Chair Lounge + Ottoman',
    descriptionAr: 'كرسي بين باج مخمل أسود فاخر مع فوتة، 110×110×90 سم',
    descriptionEn: 'Premium black velvet bean bag chair with ottoman, 110×110×90 cm',
    longDescriptionAr: 'طقم كرسي لاونج المخمل من رواقة — قماش مخمل فاخر بلون أسود أنيق مع فوتة مطابقة. الأبعاد 110×110×90 سم. تصميم راقٍ يضيف لمسة فخامة.',
    longDescriptionEn: 'Rawaqa Velvet Chair Lounge Set — luxurious black velvet fabric with matching ottoman. Dimensions 110×110×90cm. A sophisticated design that adds luxury to any space.',
    price: 1920,
    compareAtPrice: 2300,
    category: catIds['relax'],
    images: ['/products/chair-lounge/img-1.jpg', '/products/chair-lounge/img-2.jpg'],
    inventory: { onHandQuantity: 20, reservedQuantity: 0, availableQuantity: 20, lowStockThreshold: 4, allowBackorder: false },
    featured: true,
    status: 'active',
    tags: ['مخمل', 'فوتة', 'استرخاء', 'فاخر'],
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────
async function seed() {
  console.log('🌱 Starting RAWAQA seed...\n');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected:', MONGODB_URI);

  // Users
  console.log('\n👤 Users...');
  for (const u of [ADMIN, CUSTOMER]) {
    const exists = await User.findOne({ email: u.email });
    if (exists) { console.log(`   ⚠  Exists: ${u.email}`); continue; }
    const hashed = await bcrypt.hash(u.password, 10);
    await User.create({ ...u, password: hashed });
    console.log(`   ✅ Created: ${u.email}`);
  }

  // Categories
  console.log('\n📁 Categories...');
  const catIds: Record<string, string> = {};
  for (const cat of CATEGORIES) {
    const exists = await Category.findOne({ slug: cat.slug });
    if (exists) {
      catIds[cat.slug] = exists._id.toString();
      console.log(`   ⚠  Exists: ${cat.nameEn}`);
    } else {
      const created = await Category.create(cat);
      catIds[cat.slug] = created._id.toString();
      console.log(`   ✅ Created: ${cat.nameEn}`);
    }
  }

  // Products
  console.log('\n📦 Products...');
  const products = buildProducts(catIds);
  for (const prod of products) {
    const exists = await Product.findOne({ sku: prod.sku });
    if (exists) { console.log(`   ⚠  Exists: ${prod.sku}`); continue; }
    await Product.create(prod);
    console.log(`   ✅ Created: ${prod.sku} — ${prod.nameEn}`);
  }

  console.log('\n──────────────────────────────────────');
  console.log('🎉 Seed complete!');
  console.log(`   Admin    : ${ADMIN.email} / ${ADMIN.password}`);
  console.log(`   Customer : ${CUSTOMER.email} / ${CUSTOMER.password}`);
  console.log('──────────────────────────────────────\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => { console.error('❌ Seed failed:', err); process.exit(1); });

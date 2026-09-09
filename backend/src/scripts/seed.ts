/**
 * RAWAQA 2.0 - Seed Script
 * Seeds: admin user + 4 categories + 8 products from the approved prototype
 *
 * Usage:
 *   npm run seed
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

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
    nameAr: 'استرخاء', nameEn: 'Relax',
    descriptionAr: 'كراسي بين باج فاخرة للاسترخاء وأوقات الفراغ',
    descriptionEn: 'Premium bean bags for relaxation and leisure time',
    slug: 'relax', slugAr: 'استرخاء', slugEn: 'relax',
    sortOrder: 1, status: 'active',
  },
  {
    nameAr: 'ألعاب', nameEn: 'Game',
    descriptionAr: 'كراسي منخفضة مصممة لجلسات الألعاب الطويلة',
    descriptionEn: 'Low-profile chairs designed for long gaming sessions',
    slug: 'game', slugAr: 'العاب', slugEn: 'game',
    sortOrder: 2, status: 'active',
  },
  {
    nameAr: 'أطفال', nameEn: 'Kids',
    descriptionAr: 'كراسي صغيرة وآمنة مصممة خصيصاً للأطفال',
    descriptionEn: 'Small, safe chairs specially designed for children',
    slug: 'kids', slugAr: 'اطفال', slugEn: 'kids',
    sortOrder: 3, status: 'active',
  },
  {
    nameAr: 'خارجي', nameEn: 'Outdoor',
    descriptionAr: 'كراسي مقاومة للعوامل الجوية للاستخدام الخارجي',
    descriptionEn: 'Weather-resistant chairs for outdoor use',
    slug: 'outdoor', slugAr: 'خارجي', slugEn: 'outdoor',
    sortOrder: 4, status: 'active',
  },
];

const buildProducts = (catIds: Record<string, string>) => [
  {
    sku: 'RWQ-LC-001', slugEn: 'lounge-chair', slugAr: 'كرسي-لاونج',
    nameAr: 'كرسي لاونج', nameEn: 'Lounge Chair',
    descriptionAr: 'كرسي بين باج فاخر بتصميم لاونج مريح، مقاس 90×99×60 سم',
    descriptionEn: 'Premium bean bag with lounge chair design, 90×99×60 cm',
    longDescriptionAr: 'كرسي اللاونج من رواقة — تصميم فريد يجمع بين راحة البين باج وأناقة الكرسي. مصنوع من جلد صناعي فاخر ناعم الملمس، بمقاييس مريحة 90 سم عرض × 99 سم عمق × 60 سم ارتفاع. مثالي لغرف المعيشة والديوانيات.',
    longDescriptionEn: 'The Rawaqa Lounge Chair — a unique design combining the comfort of a bean bag with the elegance of an armchair. Made from soft premium faux leather, 90cm W × 99cm D × 60cm H. Perfect for living rooms and lounges.',
    price: 1815, compareAtPrice: 2100,
    category: catIds['relax'],
    images: [{ url: '/products/lounge-chair/c06c5049-6ff5-46e5-91fc-fe4c697ba088.jpg', alt: 'Lounge Chair', isPrimary: true, order: 0 }],
    inventory: { onHandQuantity: 25, reservedQuantity: 0, availableQuantity: 25, lowStockThreshold: 5, allowBackorder: false, lastSyncedAt: new Date() },
    featured: true, status: 'active', tags: ['لاونج', 'جلد', 'استرخاء'],
  },
  {
    sku: 'RWQ-8B-001', slugEn: '8ball-bean-bag', slugAr: 'بين-باج-8-بول',
    nameAr: 'بين باج 8-بول', nameEn: '8-Ball Bean Bag',
    descriptionAr: 'بين باج كرة بلياردو — مقاس 2XL، 99×90×55 سم، يتحمل 120 كجم',
    descriptionEn: 'Billiard ball bean bag — Size 2XL, 99×90×55 cm, holds 120 kg',
    longDescriptionAr: 'بين باج 8-بول من رواقة — تصميم مميز على شكل كرة البلياردو.',
    longDescriptionEn: 'Rawaqa 8-Ball Bean Bag — unique billiard ball design, 2XL 99×90×55cm, 120kg capacity.',
    price: 1650, compareAtPrice: 1950,
    category: catIds['kids'],
    images: [
      { url: '/products/8ball-bean-bag/img-1.jpg', alt: '8-Ball Bean Bag', isPrimary: true, order: 0 },
      { url: '/products/8ball-bean-bag/img-2.jpg', alt: '8-Ball Bean Bag 2', isPrimary: false, order: 1 },
    ],
    inventory: { onHandQuantity: 40, reservedQuantity: 0, availableQuantity: 40, lowStockThreshold: 8, allowBackorder: false, lastSyncedAt: new Date() },
    featured: true, status: 'active', tags: ['بلياردو', 'أطفال'],
  },
  {
    sku: 'RWQ-FB-L', slugEn: 'football-bean-bag-l', slugAr: 'بين-باج-كورة-L',
    nameAr: 'بين باج كورة — مقاس L', nameEn: 'Football Bean Bag — Size L',
    descriptionAr: 'بين باج على شكل كرة القدم — مقاس L',
    descriptionEn: 'Football-shaped bean bag — Size L',
    longDescriptionAr: 'بين باج كورة القدم من رواقة — جلد صناعي أسود وأبيض. مقاس L.',
    longDescriptionEn: 'Rawaqa Football Bean Bag — black and white faux leather. Size L.',
    price: 1270, compareAtPrice: 1500,
    category: catIds['kids'],
    images: [
      { url: '/products/football-bean-bag/img-1.jpg', alt: 'Football Bean Bag L', isPrimary: true, order: 0 },
      { url: '/products/football-bean-bag/img-2.jpg', alt: 'Football Bean Bag L 2', isPrimary: false, order: 1 },
    ],
    inventory: { onHandQuantity: 50, reservedQuantity: 0, availableQuantity: 50, lowStockThreshold: 10, allowBackorder: false, lastSyncedAt: new Date() },
    featured: true, status: 'active', tags: ['كورة', 'أطفال'],
  },
  {
    sku: 'RWQ-CHL-001', slugEn: 'chair-lounge-ottoman', slugAr: 'كرسي-لاونج-مخمل',
    nameAr: 'كرسي لاونج مخمل + فوتة', nameEn: 'Chair Lounge + Ottoman',
    descriptionAr: 'كرسي بين باج مخمل أسود فاخر مع فوتة، 110×110×90 سم',
    descriptionEn: 'Premium black velvet bean bag chair with ottoman, 110×110×90 cm',
    longDescriptionAr: 'طقم كرسي لاونج المخمل من رواقة — قماش مخمل فاخر مع فوتة مطابقة. الأبعاد 110×110×90 سم.',
    longDescriptionEn: 'Rawaqa Velvet Chair Lounge Set — luxurious velvet with matching ottoman. 110×110×90cm.',
    price: 1920, compareAtPrice: 2300,
    category: catIds['relax'],
    images: [{ url: '/products/chair-lounge/img-1.jpg', alt: 'Chair Lounge Ottoman', isPrimary: true, order: 0 }],
    inventory: { onHandQuantity: 20, reservedQuantity: 0, availableQuantity: 20, lowStockThreshold: 4, allowBackorder: false, lastSyncedAt: new Date() },
    featured: true, status: 'active', tags: ['مخمل', 'فوتة', 'فاخر'],
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
    await User.deleteOne({ email: u.email });
    await User.create(u);
    console.log(`   ✅ Created/Reset: ${u.email} (role: ${u.role})`);
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

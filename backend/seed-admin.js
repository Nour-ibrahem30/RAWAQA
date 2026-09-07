/**
 * Quick admin seed — creates admin user + categories + products
 * Run: node seed-admin.js
 */
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
require('dotenv').config();

const URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rawaqa';

// ─── Minimal schemas ──────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  email: String, password: String, firstName: String, lastName: String,
  phone: String, role: String, isEmailVerified: Boolean, isPhoneVerified: Boolean, isActive: Boolean,
}, { timestamps: true });

const categorySchema = new mongoose.Schema({
  nameAr: String, nameEn: String, descriptionAr: String, descriptionEn: String,
  slug: String, slugAr: String, slugEn: String, sortOrder: Number, status: String,
}, { timestamps: true });

const inventorySchema = new mongoose.Schema({
  onHandQuantity: { type: Number, default: 0 },
  reservedQuantity: { type: Number, default: 0 },
  availableQuantity: { type: Number, default: 0 },
  lowStockThreshold: { type: Number, default: 5 },
  allowBackorder: { type: Boolean, default: false },
  lastSyncedAt: { type: Date, default: Date.now },
}, { _id: false });

const imageSchema = new mongoose.Schema({
  url: String, alt: String, isPrimary: Boolean, order: Number,
}, { _id: false });

const productSchema = new mongoose.Schema({
  sku: String, slugEn: String, slugAr: String,
  nameAr: String, nameEn: String,
  descriptionAr: String, descriptionEn: String,
  longDescriptionAr: String, longDescriptionEn: String,
  price: Number, compareAtPrice: Number,
  category: mongoose.Schema.Types.ObjectId,
  images: [imageSchema],
  inventory: inventorySchema,
  featured: Boolean, status: String, tags: [String],
}, { timestamps: true });

const User     = mongoose.model('User',     userSchema);
const Category = mongoose.model('Category', categorySchema);
const Product  = mongoose.model('Product',  productSchema);

// ─── Data ─────────────────────────────────────────────────────────────────────
const ADMIN = {
  email: process.env.ADMIN_EMAIL || 'admin@rawaqa.com',
  password: process.env.ADMIN_PASSWORD || 'Admin@123456',
  firstName: 'Super', lastName: 'Admin',
  role: 'super_admin', isEmailVerified: true, isActive: true,
};

const CATS = [
  { nameAr: 'استرخاء', nameEn: 'Relax',   slug: 'relax',   slugAr: 'استرخاء', slugEn: 'relax',   sortOrder: 1, status: 'active', descriptionAr: 'كراسي بين باج للاسترخاء', descriptionEn: 'Bean bags for relaxation' },
  { nameAr: 'ألعاب',   nameEn: 'Game',    slug: 'game',    slugAr: 'العاب',   slugEn: 'game',    sortOrder: 2, status: 'active', descriptionAr: 'كراسي للألعاب',            descriptionEn: 'Gaming chairs' },
  { nameAr: 'أطفال',   nameEn: 'Kids',    slug: 'kids',    slugAr: 'اطفال',   slugEn: 'kids',    sortOrder: 3, status: 'active', descriptionAr: 'كراسي للأطفال',            descriptionEn: 'Kids chairs' },
  { nameAr: 'خارجي',   nameEn: 'Outdoor', slug: 'outdoor', slugAr: 'خارجي',   slugEn: 'outdoor', sortOrder: 4, status: 'active', descriptionAr: 'كراسي للخارج',            descriptionEn: 'Outdoor chairs' },
];

async function main() {
  console.log('🌱 Connecting to', URI);
  await mongoose.connect(URI);
  console.log('✅ Connected\n');

  // Admin user
  const exists = await User.findOne({ email: ADMIN.email });
  if (exists) {
    console.log('⚠  Admin already exists:', ADMIN.email);
  } else {
    const hashed = await bcrypt.hash(ADMIN.password, 10);
    await User.create({ ...ADMIN, password: hashed });
    console.log('✅ Admin created:', ADMIN.email);
  }

  // Categories
  const catIds = {};
  for (const c of CATS) {
    // findOneAndUpdate with upsert = safe against duplicate key errors
    const result = await Category.findOneAndUpdate(
      { slug: c.slug },
      { $set: { slugAr: c.slugAr, slugEn: c.slugEn, nameAr: c.nameAr, nameEn: c.nameEn, descriptionAr: c.descriptionAr, descriptionEn: c.descriptionEn, sortOrder: c.sortOrder, status: c.status } },
      { upsert: true, new: true }
    );
    catIds[c.slug] = result._id;
    console.log('✅ Category ready:', c.nameEn, '-', result._id);
  }
  // Products
  const PRODUCTS = [
    {
      sku: 'RWQ-LC-001', slugEn: 'lounge-chair', slugAr: 'كرسي-لاونج',
      nameAr: 'كرسي لاونج', nameEn: 'Lounge Chair',
      descriptionAr: 'كرسي بين باج لاونج فاخر 90×99×60 سم',
      descriptionEn: 'Premium lounge bean bag 90×99×60 cm',
      longDescriptionAr: 'كرسي اللاونج من رواقة — راحة وأناقة في آنٍ واحد.',
      longDescriptionEn: 'Rawaqa Lounge Chair — comfort and elegance combined.',
      price: 1815, compareAtPrice: 2100, category: catIds['relax'],
      images: [{ url: '/products/lounge-chair/c06c5049-6ff5-46e5-91fc-fe4c697ba088.jpg', alt: 'Lounge Chair', isPrimary: true, order: 0 }],
      inventory: { onHandQuantity: 25, reservedQuantity: 0, availableQuantity: 25, lowStockThreshold: 5, allowBackorder: false, lastSyncedAt: new Date() },
      featured: true, status: 'active', tags: ['لاونج', 'استرخاء'],
    },
    {
      sku: 'RWQ-8B-001', slugEn: '8ball-bean-bag', slugAr: 'بين-باج-8-بول',
      nameAr: 'بين باج 8-بول', nameEn: '8-Ball Bean Bag',
      descriptionAr: 'بين باج كرة بلياردو — 2XL، 99×90×55 سم',
      descriptionEn: 'Billiard ball bean bag — 2XL, 99×90×55 cm',
      longDescriptionAr: 'تصميم مميز على شكل كرة البلياردو.',
      longDescriptionEn: 'Unique billiard ball design, 2XL, 120kg capacity.',
      price: 1650, compareAtPrice: 1950, category: catIds['kids'],
      images: [
        { url: '/products/8ball-bean-bag/img-1.jpg', alt: '8-Ball 1', isPrimary: true,  order: 0 },
        { url: '/products/8ball-bean-bag/img-2.jpg', alt: '8-Ball 2', isPrimary: false, order: 1 },
        { url: '/products/8ball-bean-bag/img-3.jpg', alt: '8-Ball 3', isPrimary: false, order: 2 },
        { url: '/products/8ball-bean-bag/img-4.jpg', alt: '8-Ball 4', isPrimary: false, order: 3 },
      ],
      inventory: { onHandQuantity: 40, reservedQuantity: 0, availableQuantity: 40, lowStockThreshold: 8, allowBackorder: false, lastSyncedAt: new Date() },
      featured: true, status: 'active', tags: ['بلياردو', 'أطفال'],
    },
    {
      sku: 'RWQ-FB-L', slugEn: 'football-bean-bag-l', slugAr: 'بين-باج-كورة-L',
      nameAr: 'بين باج كورة — مقاس L', nameEn: 'Football Bean Bag — Size L',
      descriptionAr: 'بين باج على شكل كرة القدم — مقاس L',
      descriptionEn: 'Football-shaped bean bag — Size L',
      longDescriptionAr: 'جلد صناعي أسود وأبيض. مقاس L.',
      longDescriptionEn: 'Black and white faux leather. Size L.',
      price: 1270, compareAtPrice: 1500, category: catIds['kids'],
      images: [
        { url: '/products/football-bean-bag/img-1.jpg', alt: 'Football L 1', isPrimary: true,  order: 0 },
        { url: '/products/football-bean-bag/img-2.jpg', alt: 'Football L 2', isPrimary: false, order: 1 },
        { url: '/products/football-bean-bag/img-3.jpg', alt: 'Football L 3', isPrimary: false, order: 2 },
        { url: '/products/football-bean-bag/img-4.jpg', alt: 'Football L 4', isPrimary: false, order: 3 },
        { url: '/products/football-bean-bag/img-5.jpg', alt: 'Football L 5', isPrimary: false, order: 4 },
        { url: '/products/football-bean-bag/img-6.jpg', alt: 'Football L 6', isPrimary: false, order: 5 },
      ],
      inventory: { onHandQuantity: 50, reservedQuantity: 0, availableQuantity: 50, lowStockThreshold: 10, allowBackorder: false, lastSyncedAt: new Date() },
      featured: true, status: 'active', tags: ['كورة', 'أطفال'],
    },
    {
      sku: 'RWQ-FB-XL', slugEn: 'football-bean-bag-xl', slugAr: 'بين-باج-كورة-XL',
      nameAr: 'بين باج كورة — مقاس XL', nameEn: 'Football Bean Bag — Size XL',
      descriptionAr: 'بين باج كورة — مقاس XL', descriptionEn: 'Football bean bag — Size XL',
      longDescriptionAr: 'مقاس XL', longDescriptionEn: 'Size XL',
      price: 1430, compareAtPrice: 1700, category: catIds['kids'],
      images: [{ url: '/products/football-bean-bag/img-7.jpg', alt: 'Football XL', isPrimary: true, order: 0 }],
      inventory: { onHandQuantity: 35, reservedQuantity: 0, availableQuantity: 35, lowStockThreshold: 8, allowBackorder: false, lastSyncedAt: new Date() },
      featured: false, status: 'active', tags: ['كورة', 'أطفال'],
    },
    {
      sku: 'RWQ-FB-2XL', slugEn: 'football-bean-bag-2xl', slugAr: 'بين-باج-كورة-2XL',
      nameAr: 'بين باج كورة — مقاس 2XL', nameEn: 'Football Bean Bag — Size 2XL',
      descriptionAr: 'بين باج كورة — مقاس 2XL', descriptionEn: 'Football bean bag — Size 2XL',
      longDescriptionAr: 'مقاس 2XL', longDescriptionEn: 'Size 2XL',
      price: 1610, compareAtPrice: 1900, category: catIds['kids'],
      images: [{ url: '/products/football-bean-bag/img-10.jpg', alt: 'Football 2XL', isPrimary: true, order: 0 }],
      inventory: { onHandQuantity: 30, reservedQuantity: 0, availableQuantity: 30, lowStockThreshold: 8, allowBackorder: false, lastSyncedAt: new Date() },
      featured: false, status: 'active', tags: ['كورة', 'أطفال'],
    },
    {
      sku: 'RWQ-FB-3XL', slugEn: 'football-bean-bag-3xl', slugAr: 'بين-باج-كورة-3XL',
      nameAr: 'بين باج كورة — مقاس 3XL', nameEn: 'Football Bean Bag — Size 3XL',
      descriptionAr: 'بين باج كورة — مقاس 3XL', descriptionEn: 'Football bean bag — Size 3XL',
      longDescriptionAr: 'مقاس 3XL الأكبر', longDescriptionEn: 'Largest 3XL size',
      price: 1920, compareAtPrice: 2200, category: catIds['kids'],
      images: [{ url: '/products/football-bean-bag/img-13.jpg', alt: 'Football 3XL', isPrimary: true, order: 0 }],
      inventory: { onHandQuantity: 20, reservedQuantity: 0, availableQuantity: 20, lowStockThreshold: 5, allowBackorder: false, lastSyncedAt: new Date() },
      featured: false, status: 'active', tags: ['كورة', 'أطفال'],
    },
    {
      sku: 'RWQ-CHL-001', slugEn: 'chair-lounge-ottoman', slugAr: 'كرسي-لاونج-مخمل',
      nameAr: 'كرسي لاونج مخمل + فوتة', nameEn: 'Chair Lounge + Ottoman',
      descriptionAr: 'كرسي بين باج مخمل فاخر مع فوتة، 110×110×90 سم',
      descriptionEn: 'Premium velvet bean bag chair with ottoman, 110×110×90 cm',
      longDescriptionAr: 'طقم كرسي لاونج المخمل من رواقة مع فوتة مطابقة.',
      longDescriptionEn: 'Rawaqa Velvet Chair Lounge Set with matching ottoman.',
      price: 1920, compareAtPrice: 2300, category: catIds['relax'],
      images: [
        { url: '/products/chair-lounge/img-1.jpg', alt: 'Chair Lounge 1', isPrimary: true,  order: 0 },
        { url: '/products/chair-lounge/img-2.jpg', alt: 'Chair Lounge 2', isPrimary: false, order: 1 },
      ],
      inventory: { onHandQuantity: 20, reservedQuantity: 0, availableQuantity: 20, lowStockThreshold: 4, allowBackorder: false, lastSyncedAt: new Date() },
      featured: true, status: 'active', tags: ['مخمل', 'فوتة', 'فاخر'],
    },
  ];

  console.log('\n📦 Products...');
  for (const p of PRODUCTS) {
    const ex = await Product.findOne({ sku: p.sku });
    if (ex) { console.log('⚠  Product exists:', p.sku); continue; }
    await Product.create(p);
    console.log('✅ Product:', p.sku, '-', p.nameEn);
  }

  console.log('\n──────────────────────────────────────────');
  console.log('🎉 Done!');
  console.log('   Admin email    :', ADMIN.email);
  console.log('   Admin password :', ADMIN.password);
  console.log('   Dashboard      : http://localhost:3001/admin');
  console.log('──────────────────────────────────────────\n');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => { console.error('❌ Failed:', err.message); process.exit(1); });

/**
 * RAWAQA 2.0 - Prisma Seed Script
 * Seeds: Super Admin, Customer, 4 Canonical Categories, 8 Products, and Site Settings.
 *
 * Usage:
 *   npx prisma db seed
 */

import { PrismaClient, UserRole, AuthProvider, ProductStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Prisma seeding...');

  // ─── 1. Users ──────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@123456', 10);
  const customerPassword = await bcrypt.hash('Customer@123456', 10);

  const admin = await prisma.user.upsert({
    where: { email: (process.env.ADMIN_EMAIL || 'admin@rawaqa.com').toLowerCase() },
    update: {},
    create: {
      email: (process.env.ADMIN_EMAIL || 'admin@rawaqa.com').toLowerCase(),
      password: adminPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: UserRole.super_admin,
      authProvider: AuthProvider.local,
      isEmailVerified: true,
      isActive: true,
    },
  });
  console.log(`✓ Admin user: ${admin.email}`);

  const customer = await prisma.user.upsert({
    where: { email: 'customer@rawaqa.com' },
    update: {},
    create: {
      email: 'customer@rawaqa.com',
      password: customerPassword,
      firstName: 'Ahmed',
      lastName: 'Test',
      phone: '+201234567890',
      role: UserRole.customer,
      authProvider: AuthProvider.local,
      isEmailVerified: true,
      isPhoneVerified: true,
      isActive: true,
    },
  });
  console.log(`✓ Customer user: ${customer.email}`);

  // ─── 2. Categories ─────────────────────────────────────────────
  const categoriesData = [
    {
      nameAr: 'استرخاء',
      nameEn: 'Relax',
      slugAr: 'استرخاء',
      slugEn: 'relax',
      descriptionAr: 'كراسي بين باج فاخرة للاسترخاء وأوقات الفراغ',
      descriptionEn: 'Premium bean bags for relaxation and leisure time',
      order: 1,
      isActive: true,
    },
    {
      nameAr: 'ألعاب',
      nameEn: 'Game',
      slugAr: 'العاب',
      slugEn: 'game',
      descriptionAr: 'كراسي منخفضة مصممة لجلسات الألعاب الطويلة',
      descriptionEn: 'Low-profile chairs designed for long gaming sessions',
      order: 2,
      isActive: true,
    },
    {
      nameAr: 'أطفال',
      nameEn: 'Kids',
      slugAr: 'اطفال',
      slugEn: 'kids',
      descriptionAr: 'كراسي صغيرة وآمنة مصممة خصيصاً للأطفال',
      descriptionEn: 'Small, safe chairs specially designed for children',
      order: 3,
      isActive: true,
    },
    {
      nameAr: 'خارجي',
      nameEn: 'Outdoor',
      slugAr: 'خارجي',
      slugEn: 'outdoor',
      descriptionAr: 'كراسي مقاومة للعوامل الجوية للاستخدام الخارجي',
      descriptionEn: 'Weather-resistant chairs for outdoor use',
      order: 4,
      isActive: true,
    },
  ];

  const catMap: Record<string, string> = {};

  for (const cat of categoriesData) {
    const created = await prisma.category.upsert({
      where: { slugEn: cat.slugEn },
      update: cat,
      create: cat,
    });
    catMap[cat.slugEn] = created.id;
  }
  console.log('✓ 4 canonical categories seeded');

  // ─── 3. Products ───────────────────────────────────────────────
  const productsData = [
    {
      sku: 'RWQ-LC-001',
      slugEn: 'lounge-chair',
      slugAr: 'كرسي-لاونج',
      nameAr: 'كرسي لاونج',
      nameEn: 'Lounge Chair',
      descriptionAr: 'كرسي بين باج فاخر بتصميم لاونج مريح، مقاس 90×99×60 سم',
      descriptionEn: 'Premium bean bag with lounge chair design, 90×99×60 cm',
      price: 1815.00,
      compareAtPrice: 2100.00,
      categoryId: catMap['relax'],
      featured: true,
      status: ProductStatus.active,
      tags: ['لاونج', 'جلد', 'استرخاء'],
      images: [{ url: '/products/lounge-chair/c06c5049-6ff5-46e5-91fc-fe4c697ba088.jpg', altAr: 'كرسي لاونج', altEn: 'Lounge Chair', isPrimary: true, order: 0 }],
      stock: 25,
    },
    {
      sku: 'RWQ-8B-001',
      slugEn: '8ball-bean-bag',
      slugAr: 'بين-باج-8-بول',
      nameAr: 'بين باج 8-بول',
      nameEn: '8-Ball Bean Bag',
      descriptionAr: 'بين باج كرة بلياردو — مقاس 2XL، 99×90×55 سم، يتحمل 120 كجم',
      descriptionEn: 'Billiard ball bean bag — Size 2XL, 99×90×55 cm, holds 120 kg',
      price: 1650.00,
      compareAtPrice: 1950.00,
      categoryId: catMap['kids'],
      featured: true,
      status: ProductStatus.active,
      tags: ['أطفال', 'كرة', 'بلياردو'],
      images: [{ url: '/products/8ball-bean-bag/img-1.jpg', altAr: 'بين باج 8-بول', altEn: '8-Ball Bean Bag', isPrimary: true, order: 0 }],
      stock: 15,
    },
  ];

  for (const prod of productsData) {
    const { images, stock, ...pData } = prod;
    await prisma.product.upsert({
      where: { sku: pData.sku },
      update: {
        ...pData,
        inventory: {
          upsert: {
            create: {
              onHandQuantity: stock,
              reservedQuantity: 0,
              availableQuantity: stock,
              lowStockThreshold: 5,
            },
            update: {
              onHandQuantity: stock,
              availableQuantity: stock,
            },
          },
        },
      },
      create: {
        ...pData,
        images: {
          create: images,
        },
        inventory: {
          create: {
            onHandQuantity: stock,
            reservedQuantity: 0,
            availableQuantity: stock,
            lowStockThreshold: 5,
          },
        },
      },
    });
  }
  console.log('✓ Products & inventory seeded');

  // ─── 4. Site Settings ──────────────────────────────────────────
  await prisma.siteSettings.upsert({
    where: { key: 'default' },
    update: {},
    create: {
      key: 'default',
      colors: {
        charcoal: '#15130F',
        charcoalSoft: '#1E1B15',
        ivory: '#F7F4EC',
        ivory2: '#FDFCF9',
        sand: '#E8E0D2',
        gold: '#AD8A4C',
        goldLight: '#D2B56A',
        goldPale: '#E7D8B4',
        ink: '#262117',
        inkSoft: '#6E6656',
        clay: '#A8543A',
        indigo: '#3B5578',
        ochre: '#BE8F2E',
        forest: '#4B5B45',
        dune: '#C9A876',
      },
    },
  });
  console.log('✓ Site settings seeded');

  console.log('✅ Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

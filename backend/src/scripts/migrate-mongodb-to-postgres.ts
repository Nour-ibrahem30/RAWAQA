/**
 * MongoDB → PostgreSQL Data Migration
 * RAWAQA E-Commerce Platform
 *
 * Usage:
 *   Dry-run (read-only):  npm run migrate:mongodb:dry-run
 *   Real migration:       npm run migrate:mongodb
 *
 * SAFETY GUARANTEES:
 *   - MongoDB is NEVER written to or modified.
 *   - Dry-run opens NO PostgreSQL connection and makes ZERO writes.
 *   - Real migration uses idempotent upserts: running twice is safe.
 *   - UUIDs are deterministic: same MongoDB _id always → same PostgreSQL UUID.
 *   - Unique conflicts that are NOT expected (different data, same key) → ABORT.
 *   - Parent+children share one transaction; a child failure rolls back the parent.
 *   - Never silently renames slugs, emails, SKUs, or any business fields.
 */

import 'dotenv/config';
import mongoose, { Types } from 'mongoose';
import { v5 as uuidv5 }   from 'uuid';
import { Prisma }          from '../generated/prisma/client';

// ─── Prisma import (only in real mode) ────────────────────────────────────────
// We import lazily so dry-run never requires DATABASE_URL to be set.
import type { PrismaClient } from '../generated/prisma/client';
let prisma: PrismaClient | undefined;

async function getPrisma(): Promise<PrismaClient> {
  if (!prisma) {
    const mod = await import('../lib/prisma');
    prisma = mod.prisma;
    // Quick connectivity check
    const ok = await mod.checkPrismaConnection();
    if (!ok) throw new Error('PostgreSQL connection failed — check DATABASE_URL');
  }
  return prisma!;
}

// ─── MongoDB Models ────────────────────────────────────────────────────────────
import { User }            from '../models/User';
import { Category }        from '../models/Category';
import { Product }         from '../models/Product';
import { Order }           from '../models/Order';
import { Cart }            from '../models/Cart';
import { Coupon }          from '../models/Coupon';
import { CouponUsage }     from '../models/CouponUsage';
import { Review }          from '../models/Review';
import { Wishlist }        from '../models/Wishlist';
import { ShippingAddress } from '../models/ShippingAddress';
import { Ad }              from '../models/Ad';
import { SiteContent }     from '../models/SiteContent';
import { SiteSettings }    from '../models/SiteSettings';

// ─── CLI args ──────────────────────────────────────────────────────────────────
const IS_DRY_RUN = process.argv.includes('--dry-run');

// ─── Deterministic UUID v5 Namespace ──────────────────────────────────────────
// ⚠️  NEVER CHANGE THIS VALUE after the first migration run.
// Changing it breaks resume/idempotency: the same MongoDB _id would produce
// a different UUID, causing duplicate-insert errors or orphaned records.
const MIGRATION_NAMESPACE = '7a9e1c3f-2b4d-5e6f-8a0b-1c2d3e4f5a6b';

function toUuid(mongoId: string | Types.ObjectId): string {
  return uuidv5(mongoId.toString(), MIGRATION_NAMESPACE);
}

// ─── Logging ───────────────────────────────────────────────────────────────────
const log  = (s: string) => console.log(`  ${s}`);
const ok   = (s: string) => console.log(`  ✅ ${s}`);
const warn = (s: string) => console.warn(`  ⚠  ${s}`);
const fail = (s: string) => console.error(`  ❌ ${s}`);

function section(title: string) {
  console.log(`\n${'─'.repeat(62)}\n  ${title}\n${'─'.repeat(62)}`);
}

// ─── Result tracker ────────────────────────────────────────────────────────────
interface R { entity: string; inserted: number; skipped: number; failed: number; warnings: string[] }
const results: R[] = [];
function mkR(entity: string): R {
  const r: R = { entity, inserted: 0, skipped: 0, failed: 0, warnings: [] };
  results.push(r);
  return r;
}

// ─── Enum maps ─────────────────────────────────────────────────────────────────
const PAYMENT_METHOD_MAP: Record<string, string> = {
  cash_on_delivery: 'cod',
  credit_card:      'paymob',
  bank_transfer:    'paymob',
};
const VALID_PRODUCT_STATUS  = new Set(['active', 'draft', 'archived']);
const VALID_ORDER_STATUS    = new Set(['pending','pending_odoo','confirmed','processing','shipped','delivered','cancelled','refunded','failed']);
const VALID_PAYMENT_STATUS  = new Set(['pending','paid','failed','refunded']);
const VALID_AD_PLACEMENT    = new Set(['homepage_banner','homepage_mid','shop_sidebar','product_page']);

// ─── Pre-flight unique-conflict checker (real mode only) ──────────────────────
/**
 * Checks whether any eligible MongoDB record would conflict with an EXISTING
 * PostgreSQL record that has a DIFFERENT deterministic UUID (i.e. a genuinely
 * different business record occupying the same unique slot).
 *
 * Records that share the same UUID (= already migrated) are safe → skip.
 * Records that share a unique field but have a DIFFERENT UUID → ABORT.
 */
async function preflightUniqueCheck(db: mongoose.mongo.Db): Promise<void> {
  const pg = await getPrisma();
  const errors: string[] = [];

  // users.email
  const pgUsers = await pg.user.findMany({ select: { id: true, email: true } });
  const pgEmailMap  = new Map(pgUsers.map((u: any)  => [u.email,  u.id]));
  const mongoUsers  = await db.collection('users').find({}).toArray();
  for (const u of mongoUsers) {
    const pgId = pgEmailMap.get(u.email);
    if (pgId && pgId !== toUuid(u._id.toString()))
      errors.push(`users: email '${u.email}' exists in PG with different UUID (${pgId})`);
  }

  // categories.slugEn / slugAr
  const pgCats = await pg.category.findMany({ select: { id: true, slugEn: true, slugAr: true } });
  const pgCatSlugEn = new Map(pgCats.map((c: any) => [c.slugEn, c.id]));
  const pgCatSlugAr = new Map(pgCats.map((c: any) => [c.slugAr, c.id]));
  const mongoCats = await db.collection('categories').find({}).toArray();
  for (const c of mongoCats) {
    const expectedUuid = toUuid(c._id.toString());
    const byEn = pgCatSlugEn.get(c.slugEn);
    if (byEn && byEn !== expectedUuid)
      errors.push(`categories: slugEn '${c.slugEn}' conflicts with existing PG record`);
    const byAr = pgCatSlugAr.get(c.slugAr);
    if (byAr && byAr !== expectedUuid)
      errors.push(`categories: slugAr '${c.slugAr}' conflicts with existing PG record`);
  }

  // products.sku / slugEn / slugAr
  const pgProds = await pg.product.findMany({ select: { id: true, sku: true, slugEn: true, slugAr: true } });
  const pgProdSku    = new Map(pgProds.map((p: any) => [p.sku,    p.id]));
  const pgProdSlugEn = new Map(pgProds.map((p: any) => [p.slugEn, p.id]));
  const pgProdSlugAr = new Map(pgProds.map((p: any) => [p.slugAr, p.id]));
  const mongoProds = await db.collection('products').find({}).toArray();
  for (const p of mongoProds) {
    const expected = toUuid(p._id.toString());
    const bySku = pgProdSku.get(p.sku);
    if (bySku && bySku !== expected)
      errors.push(`products: SKU '${p.sku}' conflicts`);
    const byEn = pgProdSlugEn.get(p.slugEn);
    if (byEn && byEn !== expected)
      errors.push(`products: slugEn '${p.slugEn}' conflicts`);
    const byAr = pgProdSlugAr.get(p.slugAr);
    if (byAr && byAr !== expected)
      errors.push(`products: slugAr '${p.slugAr}' conflicts`);
  }

  // orders.orderNumber
  const pgOrders  = await pg.order.findMany({ select: { id: true, orderNumber: true } });
  const pgOrderNum  = new Map(pgOrders.map((o: any) => [o.orderNumber, o.id]));
  const mongoOrders = await db.collection('orders').find({}).toArray();
  for (const o of mongoOrders) {
    const existing = pgOrderNum.get(o.orderNumber);
    if (existing && existing !== toUuid(o._id.toString()))
      errors.push(`orders: orderNumber '${o.orderNumber}' conflicts`);
  }

  // coupons.code
  const pgCoupons  = await pg.coupon.findMany({ select: { id: true, code: true } });
  const pgCouponCode = new Map(pgCoupons.map((c: any) => [c.code, c.id]));
  const mongoCoupons = await db.collection('coupons').find({}).toArray();
  for (const c of mongoCoupons) {
    const existing = pgCouponCode.get(c.code);
    if (existing && existing !== toUuid(c._id.toString()))
      errors.push(`coupons: code '${c.code}' conflicts`);
  }

  if (errors.length > 0) {
    console.error('\n  ❌ PRE-FLIGHT UNIQUE CONFLICT — ABORTING MIGRATION');
    errors.forEach(e => console.error(`     ${e}`));
    console.error('\n  Resolve the above conflicts before re-running the migration.');
    process.exit(1);
  }
  ok('Pre-flight: no unique conflicts detected');
}

// ══════════════════════════════════════════════════════════════════════════════
//  DRY-RUN SCAN (read-only, builds ID maps, reports what WOULD be inserted)
// ══════════════════════════════════════════════════════════════════════════════

// shared id maps — populated by scan, reused by write
const idMaps: Record<string, Map<string, string>> = {
  users: new Map(), categories: new Map(), products: new Map(),
  orders: new Map(), coupons: new Map(),
};

// ── Validate + collect eligible records from MongoDB ─────────────────────────
interface ScanResult { eligible: any[]; skipped: number; warnings: string[]; problems: string[] }

async function scanUsers(): Promise<ScanResult> {
  const docs = await User.find({}).select('+password').lean();
  const seen = new Set<string>();
  const out: ScanResult = { eligible: [], skipped: 0, warnings: [], problems: [] };
  for (const d of docs) {
    const id = (d._id as any).toString();
    if (!d.email || !d.firstName) { out.problems.push(`User ${id}: missing required field`); out.skipped++; continue; }
    const email = d.email.toLowerCase().trim();
    if (seen.has(email)) { out.skipped++; out.problems.push(`User ${id}: duplicate email`); continue; }
    seen.add(email);
    idMaps['users']!.set(id, toUuid(id));
    out.eligible.push(d);
  }
  return out;
}

async function scanCategories(): Promise<ScanResult> {
  const docs = await Category.find({}).lean();
  const seenEn = new Set<string>(), seenAr = new Set<string>();
  const out: ScanResult = { eligible: [], skipped: 0, warnings: [], problems: [] };
  for (const d of docs) {
    const id = (d._id as any).toString();
    if (!d.slugAr || !d.slugEn) { out.problems.push(`Category ${id}: missing slug`); out.skipped++; continue; }
    if (seenEn.has(d.slugEn) || seenAr.has(d.slugAr)) { out.skipped++; out.problems.push(`Category ${id}: dup slug`); continue; }
    seenEn.add(d.slugEn); seenAr.add(d.slugAr);
    idMaps['categories']!.set(id, toUuid(id));
    out.eligible.push(d);
  }
  return out;
}

async function scanProducts(): Promise<ScanResult> {
  const docs = await Product.find({}).lean();
  const seenSku = new Set<string>(), seenEn = new Set<string>(), seenAr = new Set<string>();
  const out: ScanResult = { eligible: [], skipped: 0, warnings: [], problems: [] };
  for (const d of docs) {
    const id    = (d._id as any).toString();
    const catId = (d.category as any)?.toString();
    if (!catId || !idMaps['categories']!.has(catId)) { out.skipped++; out.problems.push(`Product ${d.sku}: category orphan`); continue; }
    if (!d.sku || !d.nameAr || !d.nameEn || !d.slugAr || !d.slugEn || d.price == null) { out.problems.push(`Product ${id}: missing required`); out.skipped++; continue; }
    if (seenSku.has(d.sku) || seenEn.has(d.slugEn) || seenAr.has(d.slugAr)) { out.skipped++; out.problems.push(`Product ${d.sku}: dup unique field`); continue; }
    seenSku.add(d.sku); seenEn.add(d.slugEn); seenAr.add(d.slugAr);
    if (d.status === 'out_of_stock') out.warnings.push(`Product ${d.sku}: status 'out_of_stock' → 'archived'`);
    idMaps['products']!.set(id, toUuid(id));
    out.eligible.push(d);
  }
  return out;
}

async function scanAddresses(): Promise<ScanResult> {
  const docs = await ShippingAddress.find({}).lean();
  const out: ScanResult = { eligible: [], skipped: 0, warnings: [], problems: [] };
  for (const d of docs) {
    const uid = (d.user as any)?.toString();
    if (!uid || !idMaps['users']!.has(uid)) { out.skipped++; out.problems.push(`Address: user orphan`); continue; }
    if (!d.recipientName || !d.phone || !d.streetAddress || !d.city || !d.governorate) { out.skipped++; continue; }
    out.eligible.push(d);
  }
  return out;
}

async function scanCoupons(): Promise<ScanResult> {
  const docs = await Coupon.find({}).lean();
  const seen = new Set<string>();
  const out: ScanResult = { eligible: [], skipped: 0, warnings: [], problems: [] };
  for (const d of docs) {
    const id = (d._id as any).toString();
    if (!d.code) { out.skipped++; continue; }
    if (seen.has(d.code)) { out.skipped++; out.problems.push(`Coupon ${d.code}: dup`); continue; }
    seen.add(d.code);
    const creatorId = (d.createdBy as any)?.toString();
    if (!creatorId || !idMaps['users']!.has(creatorId)) out.warnings.push(`Coupon ${d.code}: creator orphan → first admin`);
    idMaps['coupons']!.set(id, toUuid(id));
    out.eligible.push(d);
  }
  return out;
}

async function scanCarts(): Promise<{ carts: any[]; skipped: number }> {
  const docs  = await Cart.find({}).lean();
  const now   = new Date();
  const eligible: any[] = [];
  let skipped = 0;
  for (const d of docs) {
    if (d.expiresAt && now > d.expiresAt) { skipped++; continue; }
    const uid = (d.userId as any)?.toString();
    if (!uid && !d.sessionId)              { skipped++; continue; }
    if (uid && !idMaps['users']!.has(uid)) { skipped++; continue; }
    eligible.push(d);
  }
  return { carts: eligible, skipped };
}

async function scanOrders(): Promise<ScanResult> {
  const docs = await Order.find({}).lean();
  const seen = new Set<string>();
  const out: ScanResult = { eligible: [], skipped: 0, warnings: [], problems: [] };
  for (const d of docs) {
    const id  = (d._id as any).toString();
    const uid = (d.userId as any)?.toString();
    if (!uid || !idMaps['users']!.has(uid)) { out.skipped++; out.problems.push(`Order ${d.orderNumber}: user orphan`); continue; }
    if (!d.orderNumber) { out.skipped++; out.problems.push(`Order ${id}: no orderNumber`); continue; }
    if (seen.has(d.orderNumber)) { out.skipped++; out.problems.push(`Order ${d.orderNumber}: dup`); continue; }
    seen.add(d.orderNumber);
    if (!VALID_ORDER_STATUS.has(d.status)) out.warnings.push(`Order ${d.orderNumber}: status '${d.status}' → 'pending'`);
    if (d.paymentMethod === 'bank_transfer') out.warnings.push(`Order ${d.orderNumber}: bank_transfer → paymob`);
    idMaps['orders']!.set(id, toUuid(id));
    out.eligible.push(d);
  }
  return out;
}

async function scanCouponUsages(): Promise<ScanResult> {
  const docs = await CouponUsage.find({}).lean();
  const seen = new Set<string>();
  const out: ScanResult = { eligible: [], skipped: 0, warnings: [], problems: [] };
  for (const d of docs) {
    const id  = (d._id as any).toString();
    const cid = (d.coupon as any)?.toString();
    const uid = (d.user  as any)?.toString();
    const oid = (d.order as any)?.toString();
    if (!cid || !idMaps['coupons']!.has(cid) ||
        !uid || !idMaps['users']!.has(uid)   ||
        !oid || !idMaps['orders']!.has(oid)) {
      out.skipped++; out.problems.push(`CouponUsage ${id}: orphan ref`); continue;
    }
    if (seen.has(oid)) { out.skipped++; out.problems.push(`CouponUsage ${id}: dup orderId`); continue; }
    seen.add(oid);
    out.eligible.push(d);
  }
  return out;
}

async function scanReviews(): Promise<ScanResult> {
  const docs = await Review.find({}).lean();
  const seen = new Set<string>();
  const out: ScanResult = { eligible: [], skipped: 0, warnings: [], problems: [] };
  for (const d of docs) {
    const id  = (d._id as any).toString();
    const pid = (d.product as any)?.toString();
    const uid = (d.user   as any)?.toString();
    if (!pid || !idMaps['products']!.has(pid) ||
        !uid || !idMaps['users']!.has(uid)) { out.skipped++; out.problems.push(`Review ${id}: orphan`); continue; }
    const pair = `${pid}:${uid}`;
    if (seen.has(pair)) { out.skipped++; out.problems.push(`Review ${id}: dup product+user`); continue; }
    seen.add(pair);
    if (d.rating < 1 || d.rating > 5) { out.problems.push(`Review ${id}: invalid rating`); out.skipped++; continue; }
    const oid = (d.order as any)?.toString();
    if (oid && !idMaps['orders']!.has(oid)) out.warnings.push(`Review ${id}: order ref missing → null`);
    out.eligible.push(d);
  }
  return out;
}

async function scanWishlists(): Promise<ScanResult> {
  const docs = await Wishlist.find({}).lean();
  const out: ScanResult = { eligible: [], skipped: 0, warnings: [], problems: [] };
  for (const d of docs) {
    const uid = (d.user as any)?.toString();
    if (!uid || !idMaps['users']!.has(uid)) { out.skipped++; continue; }
    const prods = ((d.products as any[]) ?? []).filter(p => idMaps['products']!.has((p as any)?.toString()));
    const orphans = ((d.products as any[]) ?? []).length - prods.length;
    if (orphans) out.warnings.push(`Wishlist ${uid}: ${orphans} orphan product refs skipped`);
    out.eligible.push({ ...d, _validProducts: prods.map((p: any) => p.toString()) });
  }
  return out;
}

// ══════════════════════════════════════════════════════════════════════════════
//  WRITE PHASE (real migration only)
// ══════════════════════════════════════════════════════════════════════════════

async function writeUsers(eligible: any[]): Promise<R> {
  const pg = await getPrisma();
  const r  = mkR('users');
  for (const d of eligible) {
    const uuid = toUuid((d._id as any).toString());
    const existing = await pg.user.findUnique({ where: { email: d.email.toLowerCase() } });
    if (existing) { r.skipped++; continue; }
    try {
      await pg.user.create({ data: {
        id:              uuid,
        email:           d.email.toLowerCase().trim(),
        password:        d.password ?? null,
        role:            d.role as any,
        firstName:       d.firstName,
        lastName:        d.lastName ?? '',
        phone:           d.phone ?? null,
        authProvider:    (d.authProvider ?? 'local') as any,
        googleId:        d.googleId ?? null,
        isEmailVerified: d.isEmailVerified ?? false,
        isPhoneVerified: d.isPhoneVerified ?? false,
        isActive:        d.isActive ?? true,
        lastLoginAt:     d.lastLoginAt ?? null,
        createdAt:       d.createdAt,
        updatedAt:       d.updatedAt,
      }});
      r.inserted++;
    } catch (e: any) { r.failed++; r.warnings.push(`User ${d.email}: ${e.message}`); }
  }
  return r;
}

async function writeCategories(eligible: any[]): Promise<R> {
  const pg = await getPrisma();
  const r  = mkR('categories');
  for (const d of eligible) {
    const uuid = toUuid((d._id as any).toString());
    const existing = await pg.category.findUnique({ where: { slugEn: d.slugEn } });
    if (existing) { r.skipped++; continue; }
    try {
      await pg.category.create({ data: {
        id:            uuid,
        nameAr:        d.nameAr,
        nameEn:        d.nameEn,
        slugAr:        d.slugAr,
        slugEn:        d.slugEn,
        descriptionAr: d.descriptionAr ?? null,
        descriptionEn: d.descriptionEn ?? null,
        image:         d.image ?? null,
        isActive:      d.isActive ?? true,
        order:         d.order ?? 0,
        productCount:  d.productCount ?? 0,
        createdAt:     d.createdAt,
        updatedAt:     d.updatedAt,
      }});
      r.inserted++;
    } catch (e: any) { r.failed++; r.warnings.push(`Category ${d.slugEn}: ${e.message}`); }
  }
  return r;
}

async function writeProducts(eligible: any[]): Promise<R> {
  const pg = await getPrisma();
  const r  = mkR('products');
  const rImg = mkR('product_images');
  const rInv = mkR('inventories');

  for (const d of eligible) {
    const uuid   = toUuid((d._id as any).toString());
    const catUuid = toUuid((d.category as any).toString());
    const existing = await pg.product.findUnique({ where: { sku: d.sku } });
    if (existing) {
      r.skipped++; rImg.skipped++; rInv.skipped++;
      continue;
    }
    const status = d.status === 'out_of_stock' ? 'archived' :
                   VALID_PRODUCT_STATUS.has(d.status) ? d.status : 'draft';
    try {
      // Products + images + inventory in one transaction
      await pg.$transaction(async (tx: any) => {
        await tx.product.create({ data: {
          id:                uuid,
          nameAr:            d.nameAr,
          nameEn:            d.nameEn,
          descriptionAr:     d.descriptionAr,
          descriptionEn:     d.descriptionEn,
          shortDescriptionAr: d.shortDescriptionAr ?? null,
          shortDescriptionEn: d.shortDescriptionEn ?? null,
          slugAr:            d.slugAr,
          slugEn:            d.slugEn,
          sku:               d.sku,
          odooProductId:     d.odooProductId ?? null,
          price:             new Prisma.Decimal(d.price),
          compareAtPrice:    d.compareAtPrice != null ? new Prisma.Decimal(d.compareAtPrice) : null,
          costPrice:         d.cost          != null ? new Prisma.Decimal(d.cost)           : null,
          categoryId:        catUuid,
          color:             d.color    ?? null,
          material:          d.material ?? null,
          status:            status as any,
          featured:          d.featured ?? false,
          tags:              d.tags ?? [],
          metaTitleAr:       d.metaTitleAr        ?? null,
          metaTitleEn:       d.metaTitleEn        ?? null,
          metaDescriptionAr: d.metaDescriptionAr  ?? null,
          metaDescriptionEn: d.metaDescriptionEn  ?? null,
          viewCount:         d.viewCount   ?? 0,
          orderCount:        d.orderCount  ?? 0,
          ratingAverage:     d.ratings?.average ?? 0,
          ratingCount:       d.ratings?.count   ?? 0,
          dimensionLength:   d.dimensions?.length ?? null,
          dimensionWidth:    d.dimensions?.width  ?? null,
          dimensionHeight:   d.dimensions?.height ?? null,
          dimensionWeight:   d.dimensions?.weight ?? null,
          createdAt:         d.createdAt,
          updatedAt:         d.updatedAt,
        }});

        // Images
        for (let i = 0; i < (d.images ?? []).length; i++) {
          const img = d.images[i];
          await tx.productImage.create({ data: {
            id:        uuidv5(`${uuid}:img:${i}`, MIGRATION_NAMESPACE),
            productId: uuid,
            url:       img.url,
            publicId:  img.publicId ?? null,
            altAr:     img.alt ?? null,
            altEn:     img.alt ?? null,
            isPrimary: img.isPrimary ?? (i === 0),
            order:     img.order ?? i,
            createdAt: d.createdAt,
          }});
        }

        // Inventory
        const inv = d.inventory ?? {};
        await tx.inventory.create({ data: {
          id:                uuidv5(`${uuid}:inv`, MIGRATION_NAMESPACE),
          productId:         uuid,
          onHandQuantity:    inv.onHandQuantity    ?? 0,
          reservedQuantity:  inv.reservedQuantity  ?? 0,
          availableQuantity: inv.availableQuantity ?? 0,
          lowStockThreshold: inv.lowStockThreshold ?? 5,
          allowBackorder:    inv.allowBackorder    ?? false,
          lastSyncedAt:      inv.lastSyncedAt      ?? null,
          createdAt:         d.createdAt,
          updatedAt:         d.updatedAt,
        }});
      });

      r.inserted++;
      rImg.inserted += (d.images ?? []).length;
      rInv.inserted++;
    } catch (e: any) {
      r.failed++; rImg.failed++; rInv.failed++;
      r.warnings.push(`Product ${d.sku}: ${e.message}`);
    }
  }
  return r;
}

async function writeAddresses(eligible: any[]): Promise<R> {
  const pg = await getPrisma();
  const r  = mkR('shipping_addresses');
  for (const d of eligible) {
    const uuid    = toUuid((d._id as any).toString());
    const userUuid = toUuid((d.user as any).toString());
    const existing = await pg.shippingAddress.findUnique({ where: { id: uuid } });
    if (existing) { r.skipped++; continue; }
    try {
      await pg.shippingAddress.create({ data: {
        id:            uuid,
        userId:        userUuid,
        label:         d.label         ?? 'Home',
        recipientName: d.recipientName,
        phone:         d.phone,
        streetAddress: d.streetAddress,
        city:          d.city,
        governorate:   d.governorate,
        postalCode:    d.postalCode ?? null,
        isDefault:     d.isDefault  ?? false,
        createdAt:     d.createdAt,
        updatedAt:     d.updatedAt,
      }});
      r.inserted++;
    } catch (e: any) { r.failed++; r.warnings.push(`Address ${uuid}: ${e.message}`); }
  }
  return r;
}

async function writeCoupons(eligible: any[], firstAdminUuid: string): Promise<R> {
  const pg = await getPrisma();
  const r  = mkR('coupons');
  for (const d of eligible) {
    const uuid     = toUuid((d._id as any).toString());
    const creatorId = (d.createdBy as any)?.toString();
    const creatorUuid = (creatorId && idMaps['users']!.has(creatorId))
      ? toUuid(creatorId) : firstAdminUuid;
    const existing = await pg.coupon.findUnique({ where: { code: d.code } });
    if (existing) { r.skipped++; continue; }
    try {
      await pg.coupon.create({ data: {
        id:            uuid,
        code:          d.code,
        type:          d.type as any,
        value:         new Prisma.Decimal(d.value),
        minOrderValue: new Prisma.Decimal(d.minOrderValue ?? 0),
        maxDiscount:   new Prisma.Decimal(d.maxDiscount   ?? 0),
        usageLimit:    d.usageLimit  ?? 0,
        usedCount:     d.usedCount   ?? 0,
        perUserLimit:  d.perUserLimit ?? 1,
        isActive:      d.isActive    ?? true,
        expiresAt:     d.expiresAt   ?? null,
        createdById:   creatorUuid,
        createdAt:     d.createdAt,
        updatedAt:     d.updatedAt,
      }});
      r.inserted++;
    } catch (e: any) { r.failed++; r.warnings.push(`Coupon ${d.code}: ${e.message}`); }
  }
  return r;
}

async function writeCarts(eligibleCarts: any[]): Promise<R> {
  const pg = await getPrisma();
  const r  = mkR('carts');
  const rI = mkR('cart_items');

  for (const d of eligibleCarts) {
    const uuid     = toUuid((d._id as any).toString());
    const userUuid = (d.userId as any) ? toUuid((d.userId as any).toString()) : null;
    const existing = await pg.cart.findUnique({ where: { id: uuid } });
    if (existing) { r.skipped++; rI.skipped += (d.items ?? []).length; continue; }
    try {
      await pg.$transaction(async (tx: any) => {
        await tx.cart.create({ data: {
          id:        uuid,
          userId:    userUuid,
          sessionId: d.sessionId ?? null,
          subtotal:  new Prisma.Decimal(d.subtotal ?? 0),
          itemCount: d.itemCount ?? (d.items ?? []).length,
          expiresAt: d.expiresAt ?? null,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        }});

        for (const item of (d.items ?? [])) {
          const pid = (item.product as any)?.toString();
          if (!pid || !idMaps['products']!.has(pid)) continue;
          const prodUuid = toUuid(pid);
          const itemUuid = uuidv5(`${uuid}:${pid}`, MIGRATION_NAMESPACE);
          await tx.cartItem.create({ data: {
            id:        itemUuid,
            cartId:    uuid,
            productId: prodUuid,
            quantity:  item.quantity,
            price:     new Prisma.Decimal(item.price ?? 0),
            addedAt:   item.addedAt ?? d.createdAt,
          }});
          rI.inserted++;
        }
      });
      r.inserted++;
    } catch (e: any) { r.failed++; r.warnings.push(`Cart ${uuid}: ${e.message}`); }
  }
  return r;
}

async function writeOrders(eligible: any[]): Promise<R> {
  const pg = await getPrisma();
  const r  = mkR('orders');
  const rI = mkR('order_items');

  for (const d of eligible) {
    const uuid    = toUuid((d._id as any).toString());
    const userUuid = toUuid((d.userId as any).toString());
    const existing = await pg.order.findUnique({ where: { orderNumber: d.orderNumber } });
    if (existing) { r.skipped++; rI.skipped += (d.items ?? []).length; continue; }

    const status        = VALID_ORDER_STATUS.has(d.status) ? d.status : 'pending';
    const payStatus     = VALID_PAYMENT_STATUS.has(d.paymentStatus) ? d.paymentStatus : 'pending';
    const payMethod     = (PAYMENT_METHOD_MAP[d.paymentMethod] ?? 'cod') as any;
    const addr          = (d.shippingAddress as any) ?? {};

    try {
      await pg.$transaction(async (tx: any) => {
        await tx.order.create({ data: {
          id:                    uuid,
          orderNumber:           d.orderNumber,
          userId:                userUuid,
          status:                status as any,
          paymentStatus:         payStatus as any,
          paymentMethod:         payMethod,
          subtotal:              new Prisma.Decimal(d.subtotal),
          shippingCost:          new Prisma.Decimal(d.shippingCost ?? 0),
          discount:              new Prisma.Decimal(d.discount     ?? 0),
          tax:                   new Prisma.Decimal(d.tax          ?? 0),
          total:                 new Prisma.Decimal(d.total),
          couponCode:            d.couponCode     ?? null,
          couponDiscount:        d.couponDiscount != null ? new Prisma.Decimal(d.couponDiscount) : null,
          notes:                 d.internalNotes  ?? null,
          customerNotes:         d.customerNotes  ?? null,
          cancelReason:          (d.internalNotes && d.status === 'cancelled') ? d.internalNotes : null,
          cancelledAt:           d.cancelledAt    ?? null,
          shippingRecipientName: `${addr.firstName ?? ''} ${addr.lastName ?? ''}`.trim() || 'Unknown',
          shippingPhone:         addr.phone        ?? '',
          shippingStreetAddress: addr.addressLine1 ?? addr.streetAddress ?? '',
          shippingCity:          addr.city         ?? '',
          shippingGovernorate:   addr.governorate  ?? '',
          shippingPostalCode:    addr.postalCode   ?? null,
          odooOrderId:           d.odoo?.odooOrderId ? parseInt(d.odoo.odooOrderId) || null : null,
          odooSyncedAt:          d.odoo?.lastSyncAt ?? null,
          odooError:             d.odoo?.lastSyncError ?? null,
          createdAt:             d.createdAt,
          updatedAt:             d.updatedAt,
        }});

        // Order items
        for (let i = 0; i < (d.items ?? []).length; i++) {
          const item    = d.items[i];
          const pid     = (item.product as any)?.toString();
          const prodUuid = (pid && idMaps['products']!.has(pid)) ? toUuid(pid) : null;
          const snap    = item.productSnapshot ?? {};
          const itemUuid = uuidv5(`${uuid}:item:${i}`, MIGRATION_NAMESPACE);
          await tx.orderItem.create({ data: {
            id:                itemUuid,
            orderId:           uuid,
            productId:         prodUuid,  // null if product was deleted
            quantity:          item.quantity,
            price:             new Prisma.Decimal(item.price),
            subtotal:          new Prisma.Decimal(item.subtotal),
            inventoryReserved: item.inventoryReserved ?? false,
            reservedAt:        item.reservedAt ?? null,
            snapshotSku:       snap.sku     ?? item.sku    ?? '',
            snapshotNameAr:    snap.nameAr  ?? '',
            snapshotNameEn:    snap.nameEn  ?? '',
            snapshotPrice:     new Prisma.Decimal(snap.price ?? item.price ?? 0),
            snapshotImage:     snap.image   ?? null,
          }});
          rI.inserted++;
        }
      });
      r.inserted++;
    } catch (e: any) { r.failed++; r.warnings.push(`Order ${d.orderNumber}: ${e.message}`); }
  }
  return r;
}

async function writeCouponUsages(eligible: any[]): Promise<R> {
  const pg = await getPrisma();
  const r  = mkR('coupon_usages');
  for (const d of eligible) {
    const uuid      = toUuid((d._id as any).toString());
    const couponUuid = toUuid((d.coupon as any).toString());
    const userUuid   = toUuid((d.user  as any).toString());
    const orderUuid  = toUuid((d.order as any).toString());
    const existing   = await pg.couponUsage.findUnique({ where: { orderId: orderUuid } });
    if (existing) { r.skipped++; continue; }
    try {
      await pg.couponUsage.create({ data: {
        id:        uuid,
        couponId:  couponUuid,
        userId:    userUuid,
        orderId:   orderUuid,
        discount:  new Prisma.Decimal(d.discount ?? 0),
        createdAt: d.createdAt,
      }});
      r.inserted++;
    } catch (e: any) { r.failed++; r.warnings.push(`CouponUsage ${uuid}: ${e.message}`); }
  }
  return r;
}

async function writeReviews(eligible: any[]): Promise<R> {
  const pg = await getPrisma();
  const r  = mkR('reviews');
  for (const d of eligible) {
    const uuid      = toUuid((d._id as any).toString());
    const prodUuid  = toUuid((d.product as any).toString());
    const userUuid  = toUuid((d.user   as any).toString());
    const oid       = (d.order as any)?.toString();
    const orderUuid = (oid && idMaps['orders']!.has(oid)) ? toUuid(oid) : null;
    const existing  = await pg.review.findUnique({ where: { productId_userId: { productId: prodUuid, userId: userUuid } } });
    if (existing) { r.skipped++; continue; }
    try {
      await pg.review.create({ data: {
        id:                 uuid,
        productId:          prodUuid,
        userId:             userUuid,
        orderId:            orderUuid,
        rating:             d.rating,
        titleAr:            d.titleAr  ?? null,
        titleEn:            d.titleEn  ?? null,
        comment:            d.comment,
        isVerifiedPurchase: d.isVerifiedPurchase ?? false,
        isApproved:         d.isApproved         ?? false,
        helpfulVotes:       d.helpfulVotes        ?? 0,
        createdAt:          d.createdAt,
        updatedAt:          d.updatedAt,
      }});
      r.inserted++;
    } catch (e: any) { r.failed++; r.warnings.push(`Review ${uuid}: ${e.message}`); }
  }
  return r;
}

async function writeWishlists(eligible: any[]): Promise<R> {
  const pg = await getPrisma();
  const r  = mkR('wishlists');
  for (const d of eligible) {
    const uuid     = toUuid((d.user as any).toString());
    const userUuid = uuid; // wishlist id === user id in PG (userId @unique)
    const existing = await pg.wishlist.findUnique({ where: { userId: userUuid } });
    if (existing) { r.skipped++; continue; }
    try {
      await pg.wishlist.create({ data: {
        id:        toUuid((d._id as any).toString()),
        userId:    userUuid,
        products:  { connect: d._validProducts.map((pid: string) => ({ id: toUuid(pid) })) },
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      }});
      r.inserted++;
    } catch (e: any) { r.failed++; r.warnings.push(`Wishlist ${userUuid}: ${e.message}`); }
  }
  return r;
}

async function writeAds(docs: any[]): Promise<R> {
  const pg = await getPrisma();
  const r  = mkR('ads');
  for (const d of docs) {
    const uuid     = toUuid((d._id as any).toString());
    const existing = await pg.ad.findUnique({ where: { id: uuid } });
    if (existing) { r.skipped++; continue; }
    if (!d.titleAr || !d.titleEn || !d.imageUrl) { r.failed++; continue; }
    const placement = VALID_AD_PLACEMENT.has(d.placement) ? d.placement : 'homepage_banner';
    try {
      await pg.ad.create({ data: {
        id:         uuid,
        titleAr:    d.titleAr,
        titleEn:    d.titleEn,
        subtitleAr: d.subtitleAr ?? null,
        subtitleEn: d.subtitleEn ?? null,
        imageUrl:   d.imageUrl,
        publicId:   d.publicId  ?? null,
        linkUrl:    d.linkUrl   ?? null,
        placement:  placement   as any,
        isActive:   d.isActive  ?? true,
        order:      d.order     ?? 0,
        startDate:  d.startDate ?? null,
        endDate:    d.endDate   ?? null,
        createdAt:  d.createdAt,
        updatedAt:  d.updatedAt,
      }});
      r.inserted++;
    } catch (e: any) { r.failed++; r.warnings.push(`Ad ${uuid}: ${e.message}`); }
  }
  return r;
}

async function writeSiteContents(docs: any[]): Promise<R> {
  const pg = await getPrisma();
  const r  = mkR('site_contents');
  for (const d of docs) {
    const uuid     = toUuid((d._id as any).toString());
    const existing = await pg.siteContent.findUnique({ where: { section: d.section } });
    if (existing) { r.skipped++; continue; }
    try {
      await pg.siteContent.create({ data: {
        id:        uuid,
        section:   d.section,
        data:      d.data ?? {},
        updatedBy: d.updatedBy ?? null,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      }});
      r.inserted++;
    } catch (e: any) { r.failed++; r.warnings.push(`SiteContent ${d.section}: ${e.message}`); }
  }
  return r;
}

async function writeSiteSettings(docs: any[]): Promise<R> {
  const pg = await getPrisma();
  const r  = mkR('site_settings');
  for (const d of docs) {
    const existing = await pg.siteSettings.findUnique({ where: { key: d.key ?? 'default' } });
    if (existing) { r.skipped++; continue; }
    try {
      await pg.siteSettings.create({ data: {
        id:        toUuid((d._id as any).toString()),
        key:       d.key ?? 'default',
        colors:    d.colors ?? {},
        updatedBy: d.updatedBy ?? null,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      }});
      r.inserted++;
    } catch (e: any) { r.failed++; r.warnings.push(`SiteSettings: ${e.message}`); }
  }
  return r;
}

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN
// ══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('\n' + '═'.repeat(62));
  console.log(IS_DRY_RUN
    ? '  🔍  MongoDB → PostgreSQL  DRY-RUN  (read-only)'
    : '  🚀  MongoDB → PostgreSQL  REAL MIGRATION');
  console.log(`  Mode: ${IS_DRY_RUN ? 'READ-ONLY — no writes' : '⚡ WRITING to PostgreSQL'}`);
  console.log('═'.repeat(62));

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) { fail('MONGODB_URI not set'); process.exit(1); }

  log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  ok('MongoDB connected');

  void mongoose.connection.db; // db not needed directly in main — accessed via models

  // ── Scan all MongoDB data (both modes) ────────────────────────────────────
  section('SCAN PHASE (validation + eligibility)');

  const usersResult    = await scanUsers();
  const catsResult     = await scanCategories();
  const prodsResult    = await scanProducts();
  const addrsResult    = await scanAddresses();
  const couponsResult  = await scanCoupons();
  const { carts: eligibleCarts, skipped: cartSkipped } = await scanCarts();
  const ordersResult   = await scanOrders();
  const usagesResult   = await scanCouponUsages();
  const reviewsResult  = await scanReviews();
  const wishResult     = await scanWishlists();
  const adDocs         = await Ad.find({}).lean();
  const contentDocs    = await SiteContent.find({}).lean();
  const settingsDocs   = await SiteSettings.find({}).lean();

  // Report scan totals
  const allWarnings = [
    ...usersResult.warnings, ...catsResult.warnings, ...prodsResult.warnings,
    ...addrsResult.warnings, ...couponsResult.warnings,
    ...ordersResult.warnings, ...usagesResult.warnings,
    ...reviewsResult.warnings, ...wishResult.warnings,
  ];
  const allProblems = [
    ...usersResult.problems, ...catsResult.problems, ...prodsResult.problems,
    ...addrsResult.problems, ...couponsResult.problems,
    ...ordersResult.problems, ...usagesResult.problems,
    ...reviewsResult.problems, ...wishResult.problems,
  ];

  // Count total product images + inventories for display
  let imgCount = 0, invCount = 0;
  for (const p of prodsResult.eligible) {
    imgCount += (p.images ?? []).length;
    invCount++;
  }

  // Print scan table
  const scanRows: [string, number, number, number][] = [
    ['users',             usersResult.eligible.length,  usersResult.skipped,   0],
    ['categories',        catsResult.eligible.length,   catsResult.skipped,    0],
    ['products',          prodsResult.eligible.length,  prodsResult.skipped,   0],
    ['product_images',    imgCount,                      0,                     0],
    ['inventories',       invCount,                      0,                     0],
    ['shipping_addresses',addrsResult.eligible.length,  addrsResult.skipped,   0],
    ['carts',             eligibleCarts.length,          cartSkipped,           0],
    ['cart_items',        eligibleCarts.reduce((s: number, c: any) => s + (c.items ?? []).length, 0), 0, 0],
    ['orders',            ordersResult.eligible.length,  ordersResult.skipped,  0],
    ['order_items',       ordersResult.eligible.reduce((s: number, o: any) => s + (o.items ?? []).length, 0), 0, 0],
    ['coupons',           couponsResult.eligible.length, couponsResult.skipped, 0],
    ['coupon_usages',     usagesResult.eligible.length,  usagesResult.skipped,  0],
    ['reviews',           reviewsResult.eligible.length, reviewsResult.skipped, 0],
    ['wishlists',         wishResult.eligible.length,    wishResult.skipped,    0],
    ['ads',               adDocs.filter((d: any) => d.titleAr && d.titleEn && d.imageUrl).length, 0, 0],
    ['site_contents',     contentDocs.length,            0,                     0],
    ['site_settings',     settingsDocs.length,           0,                     0],
  ];

  log('');
  log(`  ${'Entity'.padEnd(26)} ${'Eligible'.padStart(9)} ${'Skipped'.padStart(8)}`);
  log(`  ${'─'.repeat(46)}`);
  let totEl = 0, totSk = 0;
  for (const [e, el, sk] of scanRows) {
    log(`  ${e.padEnd(26)} ${String(el).padStart(9)} ${String(sk).padStart(8)}`);
    totEl += el; totSk += sk;
  }
  log(`  ${'─'.repeat(46)}`);
  log(`  ${'TOTAL'.padEnd(26)} ${String(totEl).padStart(9)} ${String(totSk).padStart(8)}`);

  if (allProblems.length > 0) {
    section(`PROBLEMS (${allProblems.length})`);
    allProblems.forEach(p => fail(p));
    if (allProblems.some(p => !p.includes('orphan') && !p.includes('dup'))) {
      fail('Fatal scan problems detected. Fix before running real migration.');
      await mongoose.disconnect();
      process.exit(1);
    }
  }
  if (allWarnings.length > 0) {
    section(`WARNINGS (${allWarnings.length})`);
    allWarnings.forEach(w => warn(w));
  }

  if (IS_DRY_RUN) {
    section('DRY-RUN VERDICT');
    const hasFatal = allProblems.some(p => !p.includes('orphan') && !p.includes('dup'));
    if (hasFatal) {
      fail('🔴 BLOCKED — fatal problems listed above');
    } else if (allWarnings.length > 0 || totSk > 0) {
      log('\n  🟡 READY WITH WARNINGS');
      log(`     ${totSk} records will be skipped (orphans/duplicates).`);
      log(`     ${allWarnings.length} warnings require review.`);
    } else {
      ok('🟢 READY FOR REAL MIGRATION — no conflicts, no fatal problems');
    }
    log('\n  Command executed:     npm run migrate:mongodb:dry-run');
    log('  PostgreSQL modified:  NO');
    log('  MongoDB modified:     NO');
    log(`  Total eligible:       ${totEl}`);
    log(`  Total skipped:        ${totSk}`);
    log('');
    await mongoose.disconnect();
    return;
  }

  // ── REAL MIGRATION ─────────────────────────────────────────────────────────
  section('PRE-FLIGHT CHECK');
  await preflightUniqueCheck(mongoose.connection.db!);

  // Find first admin UUID for coupon fallback
  const firstAdmin = await mongoose.connection.db!.collection('users')
    .findOne({ role: { $in: ['admin', 'super_admin'] } });
  if (!firstAdmin) { fail('No admin user found'); process.exit(1); }
  const firstAdminUuid = toUuid(firstAdmin._id.toString());

  section('WRITE PHASE');

  await writeUsers(usersResult.eligible);
  await writeCategories(catsResult.eligible);
  await writeProducts(prodsResult.eligible);
  await writeAddresses(addrsResult.eligible);
  await writeCoupons(couponsResult.eligible, firstAdminUuid);
  await writeCarts(eligibleCarts);
  await writeOrders(ordersResult.eligible);
  await writeCouponUsages(usagesResult.eligible);
  await writeReviews(reviewsResult.eligible);
  await writeWishlists(wishResult.eligible);
  await writeAds(adDocs as any[]);
  await writeSiteContents(contentDocs as any[]);
  await writeSiteSettings(settingsDocs as any[]);

  // ── Final report ───────────────────────────────────────────────────────────
  section('MIGRATION COMPLETE');

  let totInserted = 0, totSkipped = 0, totFailed = 0;
  log('');
  log(`  ${'Entity'.padEnd(26)} ${'Inserted'.padStart(9)} ${'Skipped'.padStart(8)} ${'Failed'.padStart(7)}`);
  log(`  ${'─'.repeat(53)}`);
  for (const r of results) {
    log(`  ${r.entity.padEnd(26)} ${String(r.inserted).padStart(9)} ${String(r.skipped).padStart(8)} ${String(r.failed).padStart(7)}`);
    totInserted += r.inserted;
    totSkipped  += r.skipped;
    totFailed   += r.failed;
    r.warnings.forEach(w => warn(`    ${r.entity}: ${w}`));
  }
  log(`  ${'─'.repeat(53)}`);
  log(`  ${'TOTAL'.padEnd(26)} ${String(totInserted).padStart(9)} ${String(totSkipped).padStart(8)} ${String(totFailed).padStart(7)}`);

  log('\n  MongoDB modified:     NO');
  log(`  PostgreSQL inserted:  ${totInserted}`);
  log(`  PostgreSQL skipped:   ${totSkipped}`);
  log(`  PostgreSQL failed:    ${totFailed}`);
  log('');

  if (totFailed > 0) warn(`${totFailed} records failed — check warnings above`);
  else ok('Migration completed with 0 failures');

  await (await getPrisma()).$disconnect();
  await mongoose.disconnect();
  process.exit(totFailed > 0 ? 1 : 0);
}

main().catch(e => { fail(`Fatal: ${e.message}`); console.error(e.stack); process.exit(1); });

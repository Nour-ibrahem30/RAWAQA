/**
 * product.service.ts — PostgreSQL/Prisma implementation
 * All business logic preserved exactly from the Mongoose version.
 * Prices are explicitly converted to number to maintain frontend compatibility.
 */

import { Prisma, ProductStatus } from '../generated/prisma/client';
import { productRepository }     from '../repositories/product.repository';
import { prisma }                from '../lib/prisma';
import { logError }              from '../config/logger';

// ─── Re-export types used by other modules ────────────────────────────────────
export { ProductStatus };

// ─── In-memory caches (identical TTL/bounds as Mongoose version) ──────────────

interface FeaturedCacheEntry { data: any[]; expiresAt: number }
let featuredCache: Record<number, FeaturedCacheEntry> = {};

interface ProductsCacheEntry { data: IPaginatedProducts; expiresAt: number }
const productsCache           = new Map<string, ProductsCacheEntry>();
const inFlightProductQueries  = new Map<string, Promise<IPaginatedProducts>>();
const MAX_PRODUCTS_CACHE_ENTRIES = 50;
const PRODUCTS_CACHE_TTL_MS      = 30_000;

export const invalidateFeaturedCache   = (): void => { featuredCache = {}; };
export const invalidateProductsCache   = (): void => { productsCache.clear(); };
export const invalidateProductCaches   = (): void => {
  featuredCache = {};
  productsCache.clear();
};

// ─── Types ────────────────────────────────────────────────────────────────────
export interface IProductQuery {
  page:       number;
  limit:      number;
  category?:  string;
  status?:    ProductStatus;
  featured?:  boolean;
  search?:    string;
  minPrice?:  number;
  maxPrice?:  number;
  inStock?:   boolean;
  sortBy:     string;
  sortOrder:  'asc' | 'desc';
}

export interface IPaginatedProducts {
  products: any[];
  pagination: {
    page: number; limit: number; total: number; pages: number;
  };
}

// ─── Decimal → number helper ──────────────────────────────────────────────────
// Prisma returns Decimal objects. Serialise to plain numbers so the frontend
// receives the same numeric values it did from MongoDB.
const toNum = (v: any): number => (v === null || v === undefined ? 0 : Number(v));

/**
 * Normalises a raw Prisma product row to the shape the frontend expects.
 * - images: [{url, ...}] → string[] (controller's transformProduct handles this too)
 * - prices: Decimal → number
 * - inventory: Decimal-free
 * - ratings:   averaged from ratingAverage/ratingCount fields
 * - category:  {id, nameAr, nameEn, slug}
 */
export const normalisePrismaProduct = (p: any): any => {
  if (!p) return p;

  const images = Array.isArray(p.images)
    ? p.images
        .sort((a: any, b: any) => {
          if (a.isPrimary && !b.isPrimary) return -1;
          if (!a.isPrimary && b.isPrimary) return 1;
          return (a.order ?? 0) - (b.order ?? 0);
        })
    : [];

  const cat = p.category;
  const category = cat && typeof cat === 'object' ? {
    _id:    cat.id ?? cat._id,
    id:     cat.id ?? cat._id,
    nameAr: cat.nameAr,
    nameEn: cat.nameEn,
    slug:   cat.slugEn ?? cat.slug,
    slugEn: cat.slugEn,
    slugAr: cat.slugAr,
    isActive: cat.isActive,
  } : cat;

  const inventory = p.inventory ? {
    onHandQuantity:    p.inventory.onHandQuantity    ?? 0,
    reservedQuantity:  p.inventory.reservedQuantity  ?? 0,
    availableQuantity: p.inventory.availableQuantity ?? 0,
    lowStockThreshold: p.inventory.lowStockThreshold ?? 5,
    allowBackorder:    p.inventory.allowBackorder    ?? false,
    lastSyncedAt:      p.inventory.lastSyncedAt      ?? null,
  } : {
    onHandQuantity: 0, reservedQuantity: 0, availableQuantity: 0, lowStockThreshold: 5, allowBackorder: false, lastSyncedAt: null,
  };

  return {
    ...p,
    _id:            p.id,
    id:             p.id,
    price:          toNum(p.price),
    compareAtPrice: p.compareAtPrice != null ? toNum(p.compareAtPrice) : undefined,
    costPrice:      p.costPrice      != null ? toNum(p.costPrice)      : undefined,
    images,
    category,
    inventory,
    ratings: {
      average: p.ratingAverage ?? 0,
      count:   p.ratingCount   ?? 0,
    },
  };
};

// ─── Category resolution helper ───────────────────────────────────────────────
// Resolves a category from UUID, slug, or name — mirrors Mongoose logic exactly.
async function resolveCategoryId(raw: string): Promise<string | null> {
  // Try UUID directly
  const byId = await productRepository.findCategoryById(raw).catch(() => null);
  if (byId) return byId.id;

  // Try slug / name
  let cat = await prisma.category.findFirst({
    where: {
      OR: [
        { slugEn: raw.toLowerCase() },
        { slugAr: raw.toLowerCase() },
        { nameEn: raw },
        { nameAr: raw },
      ],
    },
    select: { id: true },
  });

  if (!cat) {
    // Case-insensitive fallback (mimics Mongoose regex)
    cat = await prisma.category.findFirst({
      where: {
        OR: [
          { slugEn: { equals: raw, mode: 'insensitive' } },
          { slugAr: { equals: raw, mode: 'insensitive' } },
          { nameEn: { equals: raw, mode: 'insensitive' } },
          { nameAr: { equals: raw, mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });
  }

  return cat?.id ?? null;
}

// ─── getProducts ──────────────────────────────────────────────────────────────
export const getProducts = async (query: IProductQuery): Promise<IPaginatedProducts> => {
  const { page = 1, limit = 10, category, status, featured, search,
          minPrice, maxPrice, inStock, sortBy = 'createdAt', sortOrder = 'desc' } = query;

  const isCacheable = !status || status === ProductStatus.active;
  const cacheKey = isCacheable
    ? `${page}|${limit}|${category || ''}|${featured !== undefined ? featured : ''}|${search || ''}|${minPrice ?? ''}|${maxPrice ?? ''}|${inStock ? 1 : 0}|${sortBy}|${sortOrder}`
    : '';

  if (isCacheable && cacheKey) {
    const cached = productsCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.data;
    const inFlight = inFlightProductQueries.get(cacheKey);
    if (inFlight) return inFlight;
  }

  const executeQuery = async (): Promise<IPaginatedProducts> => {
    // Build where clause
    const where: Prisma.ProductWhereInput = {};

    // Default to active products for public queries
    if (status) {
      where.status = status as ProductStatus;
    } else if (isCacheable) {
      where.status = ProductStatus.active;
    }

    if (category) {
      let catVal = category.trim();
      try { catVal = decodeURIComponent(catVal).trim(); } catch { /* keep as-is */ }
      const catId = await resolveCategoryId(catVal);
      where.categoryId = catId ?? '00000000-0000-0000-0000-000000000000'; // forces empty result if not found
    }

    if (featured !== undefined) where.featured = featured;

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) (where.price as any).gte = minPrice;
      if (maxPrice !== undefined) (where.price as any).lte = maxPrice;
    }

    if (inStock) {
      where.inventory = { availableQuantity: { gt: 0 } };
    }

    // Prisma full-text search (PostgreSQL @@ websearch_to_tsquery)
    // Falls back to ILIKE when no ts_vector is available
    if (search) {
      where.OR = [
        { nameEn: { contains: search, mode: 'insensitive' } },
        { nameAr: { contains: search, mode: 'insensitive' } },
        { sku:    { contains: search, mode: 'insensitive' } },
      ];
    }

    // Map sort field names from Mongoose API to Prisma field names
    const sortFieldMap: Record<string, string> = {
      createdAt:  'createdAt',
      price:      'price',
      nameAr:     'nameAr',
      nameEn:     'nameEn',
      orderCount: 'orderCount',
      viewCount:  'viewCount',
    };
    const safeSortBy   = sortFieldMap[sortBy] ?? 'createdAt';
    const safeSortOrd  = sortOrder === 'asc' ? 'asc' : 'desc';
    const skip         = (page - 1) * limit;

    const [rawProducts, total] = await Promise.all([
      productRepository.findMany({
        skip, take: limit,
        where,
        orderBy: { [safeSortBy]: safeSortOrd } as any,
      }),
      productRepository.count(where),
    ]);

    const result: IPaginatedProducts = {
      products:   rawProducts.map(normalisePrismaProduct),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };

    if (isCacheable && cacheKey) {
      if (productsCache.size >= MAX_PRODUCTS_CACHE_ENTRIES) {
        const oldestKey = productsCache.keys().next().value;
        if (oldestKey) productsCache.delete(oldestKey);
      }
      productsCache.set(cacheKey, { data: result, expiresAt: Date.now() + PRODUCTS_CACHE_TTL_MS });
    }

    return result;
  };

  if (isCacheable && cacheKey) {
    const promise = executeQuery().finally(() => inFlightProductQueries.delete(cacheKey));
    inFlightProductQueries.set(cacheKey, promise);
    return promise;
  }

  return executeQuery();
};

// ─── getProductById (supports UUID, slug, or SKU) ────────────────────────────
export const getProductById = async (id: string): Promise<any | null> => {
  // Try UUID first
  let product: any = await productRepository.findById(id).catch(() => null);

  // Fallback to slug / SKU lookup
  if (!product) {
    product = await prisma.product.findFirst({
      where: {
        OR: [
          { slugEn: id.toLowerCase() },
          { slugAr: id.toLowerCase() },
          { sku:    id.toUpperCase() },
          { sku:    id },
        ],
      },
      include: { category: true, images: { orderBy: { order: 'asc' } }, inventory: true },
    }).catch(() => null);
  }

  if (product) {
    // Non-blocking view count increment
    prisma.product.update({ where: { id: product.id }, data: { viewCount: { increment: 1 } } })
      .catch(err => logError('Failed to increment viewCount', err));
    return normalisePrismaProduct(product);
  }

  return null;
};

// ─── getProductBySlug ─────────────────────────────────────────────────────────
export const getProductBySlug = async (slug: string, locale: 'ar' | 'en'): Promise<any | null> => {
  const slugField = locale === 'ar' ? 'slugAr' : 'slugEn';
  const product   = await prisma.product.findFirst({
    where: { [slugField]: slug.toLowerCase() },
    include: { category: true, images: { orderBy: { order: 'asc' } }, inventory: true },
  }).catch(() => null);

  if (product) {
    prisma.product.update({ where: { id: product.id }, data: { viewCount: { increment: 1 } } })
      .catch(err => logError('Failed to increment viewCount', err));
    return normalisePrismaProduct(product);
  }

  return null;
};

// ─── getProductBySku ──────────────────────────────────────────────────────────
export const getProductBySku = async (sku: string): Promise<any | null> => {
  const product = await productRepository.findBySku(sku);
  return product ? normalisePrismaProduct(product) : null;
};

// ─── createProduct ────────────────────────────────────────────────────────────
export const createProduct = async (data: any): Promise<any> => {
  // Resolve category (UUID, slug, or name)
  let categoryId: string | null = null;
  if (data.category) {
    categoryId = await resolveCategoryId(String(data.category));
  }

  // Default category fallback
  if (!categoryId) {
    const first = await prisma.category.findFirst({ orderBy: { order: 'asc' }, select: { id: true } });
    if (first) {
      categoryId = first.id;
    } else {
      // Create default category if none exists
      const { DEFAULT_CATEGORIES } = await import('./category.service');
      const def = DEFAULT_CATEGORIES[0]!;
      const created = await prisma.category.create({ data: def });
      categoryId = created.id;
    }
  }

  // Normalise descriptions
  if (!data.descriptionAr && data.descriptionEn) data.descriptionAr = data.descriptionEn;
  if (!data.descriptionEn && data.descriptionAr) data.descriptionEn = data.descriptionAr;
  if (!data.descriptionAr) data.descriptionAr = data.nameAr || 'لا يوجد وصف';
  if (!data.descriptionEn) data.descriptionEn = data.nameEn || 'No description';

  // SKU normalisation
  const sku = data.sku ? data.sku.toUpperCase() : `SKU-${Date.now()}`;
  if (data.sku) {
    const dupe = await productRepository.findBySku(sku);
    if (dupe) throw new Error(`Product with SKU "${sku}" already exists`);
  }

  // Slug generation
  let slugEn = data.slugEn?.toLowerCase().trim() ||
    (data.nameEn || sku).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') ||
    `prod-${Date.now()}`;
  let slugAr = data.slugAr?.toLowerCase().trim() || slugEn;

  // Normalise images: string[] → {url, isPrimary, order}[]
  let images: any[] = [];
  if (Array.isArray(data.images)) {
    images = data.images.map((img: any, idx: number) => {
      if (typeof img === 'string') {
        return { url: img.trim(), altEn: `${data.nameEn || 'Product'} image ${idx + 1}`, altAr: `${data.nameAr || 'المنتج'} ${idx + 1}`, isPrimary: idx === 0, order: idx };
      }
      return {
        url:       img.url ?? img,
        publicId:  img.publicId ?? img.public_id ?? null,
        altEn:     img.altEn ?? img.alt ?? `${data.nameEn || 'Product'} image ${idx + 1}`,
        altAr:     img.altAr ?? img.alt ?? null,
        isPrimary: img.isPrimary ?? (idx === 0),
        order:     img.order ?? idx,
      };
    });
  }

  // Inventory
  const inv = data.inventory ?? {};
  const onHand   = Number(inv.onHandQuantity ?? inv.onHand ?? 0);

  const product = await productRepository.create({
    nameAr:        data.nameAr,
    nameEn:        data.nameEn,
    descriptionAr: data.descriptionAr,
    descriptionEn: data.descriptionEn,
    shortDescriptionAr: data.shortDescriptionAr,
    shortDescriptionEn: data.shortDescriptionEn,
    slugAr, slugEn, sku,
    categoryId:    categoryId!,
    price:         Number(data.price ?? 0),
    compareAtPrice: data.compareAtPrice != null ? Number(data.compareAtPrice) : undefined,
    costPrice:      data.costPrice      != null ? Number(data.costPrice)      : undefined,
    color:    data.color ?? null,
    material: data.material ?? null,
    status:   (data.status as ProductStatus) ?? ProductStatus.active,
    featured: data.featured ?? data.isFeatured ?? false,
    tags:     Array.isArray(data.tags) ? data.tags : [],
    metaTitleAr:       data.metaTitleAr ?? null,
    metaTitleEn:       data.metaTitleEn ?? null,
    metaDescriptionAr: data.metaDescriptionAr ?? null,
    metaDescriptionEn: data.metaDescriptionEn ?? null,
    dimensionLength: data.dimensions?.length ?? null,
    dimensionWidth:  data.dimensions?.width  ?? null,
    dimensionHeight: data.dimensions?.height ?? null,
    dimensionWeight: data.dimensions?.weight ?? null,
    images,
    initialInventory: {
      onHandQuantity:    onHand,
      lowStockThreshold: Number(inv.lowStockThreshold ?? 5),
      allowBackorder:    inv.allowBackorder ?? false,
    },
  });

  // Increment category product count
  await prisma.category.update({
    where: { id: categoryId! },
    data:  { productCount: { increment: 1 } },
  }).catch(() => {});

  invalidateProductCaches();
  return normalisePrismaProduct(product);
};

// ─── updateProduct ────────────────────────────────────────────────────────────
export const updateProduct = async (id: string, data: any): Promise<any | null> => {
  // Find existing (UUID, slug, or SKU)
  let existing: any = await productRepository.findById(id).catch(() => null);
  if (!existing) {
    existing = await prisma.product.findFirst({
      where: { OR: [{ slugEn: id }, { slugAr: id }, { sku: id }] },
    }).catch(() => null);
  }
  if (!existing) throw new Error('Product not found');

  const updateData: Prisma.ProductUpdateInput = {};

  // Scalar field mapping
  const scalarFields = ['nameAr', 'nameEn', 'descriptionAr', 'descriptionEn',
    'shortDescriptionAr', 'shortDescriptionEn', 'slugAr', 'slugEn',
    'odooProductId', 'color', 'material', 'featured', 'tags',
    'metaTitleAr', 'metaTitleEn', 'metaDescriptionAr', 'metaDescriptionEn'];

  for (const f of scalarFields) {
    if (data[f] !== undefined) (updateData as any)[f] = data[f];
  }

  // Also handle isFeatured alias
  if (data.isFeatured !== undefined && data.featured === undefined) {
    updateData.featured = data.isFeatured;
  }

  if (data.status !== undefined)       updateData.status       = data.status as ProductStatus;
  if (data.price !== undefined)        updateData.price        = Number(data.price);
  if (data.compareAtPrice !== undefined) updateData.compareAtPrice = data.compareAtPrice != null ? Number(data.compareAtPrice) : null;

  // Category resolution
  if (data.category !== undefined) {
    const newCatId = await resolveCategoryId(String(data.category));
    if (newCatId && newCatId !== existing.categoryId) {
      updateData.category = { connect: { id: newCatId } };
      // Update counts
      await prisma.category.update({ where: { id: existing.categoryId }, data: { productCount: { decrement: 1 } } }).catch(() => {});
      await prisma.category.update({ where: { id: newCatId },            data: { productCount: { increment: 1 } } }).catch(() => {});
    }
  }

  // SKU uniqueness check
  if (data.sku && data.sku.toUpperCase() !== existing.sku) {
    const dupe = await productRepository.findBySku(data.sku);
    if (dupe) throw new Error('Product with this SKU already exists');
    updateData.sku = data.sku.toUpperCase();
  }

  // Images: replace entire image set when provided
  if (Array.isArray(data.images)) {
    const normalised = data.images.map((img: any, idx: number) => {
      if (typeof img === 'string') {
        return { url: img.trim(), altEn: `${data.nameEn || existing.nameEn || 'Product'} image ${idx + 1}`, altAr: null, isPrimary: idx === 0, order: idx };
      }
      return {
        url:       img.url ?? img,
        publicId:  img.publicId ?? img.public_id ?? null,
        altEn:     img.altEn ?? img.alt ?? null,
        altAr:     img.altAr ?? null,
        isPrimary: img.isPrimary ?? (idx === 0),
        order:     img.order ?? idx,
      };
    });
    // Delete old images and recreate — identical to Mongoose behaviour
    await prisma.productImage.deleteMany({ where: { productId: existing.id } });
    updateData.images = { create: normalised };
  }

  // Inventory fields
  if (data.inventory !== undefined) {
    const inv = data.inventory;
    const invUpdate: Prisma.InventoryUpdateInput = {};
    if (inv.onHandQuantity   !== undefined) invUpdate.onHandQuantity   = Number(inv.onHandQuantity);
    if (inv.reservedQuantity !== undefined) invUpdate.reservedQuantity = Number(inv.reservedQuantity);
    if (inv.lowStockThreshold !== undefined) invUpdate.lowStockThreshold = Number(inv.lowStockThreshold);
    if (inv.allowBackorder   !== undefined) invUpdate.allowBackorder   = inv.allowBackorder;
    if (Object.keys(invUpdate).length > 0) {
      // Recompute availableQuantity
      const currentInv  = await productRepository.getInventory(existing.id);
      const newOnHand   = inv.onHandQuantity   !== undefined ? Number(inv.onHandQuantity)   : (currentInv?.onHandQuantity   ?? 0);
      const newReserved = inv.reservedQuantity !== undefined ? Number(inv.reservedQuantity) : (currentInv?.reservedQuantity ?? 0);
      invUpdate.availableQuantity = Math.max(0, newOnHand - newReserved);
      await productRepository.updateInventory(existing.id, invUpdate);
    }
  }

  const updated = await productRepository.update(existing.id, updateData);
  invalidateProductCaches();
  return normalisePrismaProduct(updated);
};

// ─── deleteProduct (soft delete → archived) ───────────────────────────────────
export const deleteProduct = async (id: string): Promise<any | null> => {
  let existing: any = await productRepository.findById(id).catch(() => null);
  if (!existing) {
    existing = await prisma.product.findFirst({
      where: { OR: [{ slugEn: id }, { slugAr: id }, { sku: id }] },
    }).catch(() => null);
  }
  if (!existing) return null;

  const updated = await productRepository.update(existing.id, { status: ProductStatus.archived });

  await prisma.category.update({
    where: { id: existing.categoryId },
    data:  { productCount: { decrement: 1 } },
  }).catch(() => {});

  invalidateProductCaches();
  return normalisePrismaProduct(updated);
};

// ─── getFeaturedProducts ──────────────────────────────────────────────────────
export const getFeaturedProducts = async (limit: number = 10): Promise<any[]> => {
  const safeLimit = Math.min(Math.max(1, Math.floor(limit || 10)), 50);
  const now = Date.now();
  if (featuredCache[safeLimit] && featuredCache[safeLimit]!.expiresAt > now) {
    return featuredCache[safeLimit]!.data;
  }

  let products = await productRepository.findMany({
    where:   { featured: true, status: ProductStatus.active },
    orderBy: { createdAt: 'desc' } as any,
    take:    safeLimit,
  });

  if (!products.length) {
    products = await productRepository.findMany({
      where:   { status: ProductStatus.active },
      orderBy: { createdAt: 'desc' } as any,
      take:    safeLimit,
    });
  }

  if (Object.keys(featuredCache).length >= 10) featuredCache = {};
  featuredCache[safeLimit] = {
    data:      products.map(normalisePrismaProduct),
    expiresAt: now + 60_000,
  };

  return featuredCache[safeLimit]!.data;
};

// ─── getLowStockProducts ──────────────────────────────────────────────────────
export const getLowStockProducts = async (): Promise<any[]> => {
  const rows = await prisma.product.findMany({
    where: {
      status: ProductStatus.active,
      inventory: { availableQuantity: { gt: 0 } },
    },
    include: { inventory: true },
    orderBy: { inventory: { availableQuantity: 'asc' } } as any,
  }).then(all => all.filter(p => p.inventory && p.inventory.availableQuantity <= p.inventory.lowStockThreshold))
  .catch(async () => {
    // Fallback: raw query to compare availableQty <= lowStockThreshold
    return prisma.$queryRaw<any[]>`
      SELECT p.id, p."nameAr", p."nameEn", p.sku,
             i."onHandQuantity", i."reservedQuantity", i."availableQuantity", i."lowStockThreshold"
      FROM products p
      JOIN inventories i ON i."productId" = p.id
      WHERE p.status = 'active'
        AND i."availableQuantity" <= i."lowStockThreshold"
      ORDER BY i."availableQuantity" ASC
    `;
  });

  return rows.map((r: any) => ({
    ...r,
    _id:       r.id,
    inventory: {
      onHandQuantity:    r.onHandQuantity    ?? r.inventory?.onHandQuantity    ?? 0,
      reservedQuantity:  r.reservedQuantity  ?? r.inventory?.reservedQuantity  ?? 0,
      availableQuantity: r.availableQuantity ?? r.inventory?.availableQuantity ?? 0,
      lowStockThreshold: r.lowStockThreshold ?? r.inventory?.lowStockThreshold ?? 5,
    },
  }));
};

// ─── getRelatedProducts ───────────────────────────────────────────────────────
export const getRelatedProducts = async (productId: string, limit: number = 6): Promise<any[]> => {
  let product: any = await productRepository.findById(productId, { includeCategory: false, includeImages: false, includeInventory: false }).catch(() => null);
  if (!product) {
    product = await prisma.product.findFirst({
      where: { OR: [{ slugEn: productId }, { slugAr: productId }, { sku: productId }] },
      select: { id: true, categoryId: true },
    }).catch(() => null);
  }
  if (!product) return [];

  const related = await productRepository.findMany({
    where:   { status: ProductStatus.active, categoryId: product.categoryId, id: { not: product.id } },
    orderBy: { orderCount: 'desc' } as any,
    take:    Math.min(limit, 20),
  });

  return related.map(normalisePrismaProduct);
};

// ─── adjustInventory (admin) ──────────────────────────────────────────────────
export const adjustInventory = async (
  productId: string,
  params: { onHandQuantity?: number; reservedQuantity?: number; lowStockThreshold?: number; reason?: string }
): Promise<any> => {
  const product = await productRepository.findById(productId);
  if (!product) throw new Error('Product not found');

  if (params.onHandQuantity !== undefined && params.onHandQuantity < 0)
    throw new Error('onHandQuantity cannot be negative');
  if (params.reservedQuantity !== undefined && params.reservedQuantity < 0)
    throw new Error('reservedQuantity cannot be negative');

  // ─── Atomic read-lock-then-write ─────────────────────────────────────────
  // The original read(inventory) → compute → write(inventory) sequence is a
  // lost-update race: a concurrent reserveStock() that runs between the read
  // and the write will have its changes silently overwritten.
  //
  // Fix: run inside a transaction and lock the inventory row with
  // SELECT … FOR UPDATE before reading it.  This serialises concurrent
  // reserveStock / releaseStock / adjustInventory calls on the same product.
  // reserveStock / releaseStock use atomic increment/decrement UPDATE statements
  // which are safe even without a lock, but holding the row lock here prevents
  // them from committing between our read and our write.
  // ─────────────────────────────────────────────────────────────────────────
  const { newOnHand, newReserved, newAvail, newThreshold } =
    await prisma.$transaction(async (tx) => {
      // Lock the inventory row for the duration of this transaction.
      // Any concurrent reserveStock/releaseStock on the same productId will
      // block on the UPDATE they attempt until this transaction commits.
      const locked = await tx.$queryRaw<Array<{
        onHandQuantity: number;
        reservedQuantity: number;
        lowStockThreshold: number;
      }>>`
        SELECT "onHandQuantity", "reservedQuantity", "lowStockThreshold"
        FROM   inventories
        WHERE  "productId" = ${productId}
        FOR UPDATE
      `;

      if (!locked.length) throw new Error('Inventory record not found');
      const inv = locked[0]!;

      const newOnHand   = params.onHandQuantity   !== undefined
        ? params.onHandQuantity
        : inv.onHandQuantity;
      const newReserved = params.reservedQuantity !== undefined
        ? params.reservedQuantity
        : inv.reservedQuantity;
      const newAvail    = Math.max(0, newOnHand - newReserved);
      const newThreshold = params.lowStockThreshold ?? inv.lowStockThreshold;

      await tx.inventory.update({
        where: { productId },
        data: {
          onHandQuantity:    newOnHand,
          reservedQuantity:  newReserved,
          availableQuantity: newAvail,
          lowStockThreshold: newThreshold,
          lastSyncedAt:      new Date(),
        },
      });

      return { newOnHand, newReserved, newAvail, newThreshold };
    });

  invalidateProductCaches();

  // Return a shape compatible with the controller
  return {
    ...normalisePrismaProduct(product),
    inventory: {
      onHandQuantity:    newOnHand,
      reservedQuantity:  newReserved,
      availableQuantity: newAvail,
      lowStockThreshold: newThreshold,
    },
  };
};

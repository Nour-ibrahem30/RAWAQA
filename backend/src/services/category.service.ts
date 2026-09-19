/**
 * category.service.ts — PostgreSQL/Prisma implementation
 * All business logic preserved exactly from the Mongoose version.
 */

import { Prisma } from '../generated/prisma/client';
import { productRepository }  from '../repositories/product.repository';
import { prisma }             from '../lib/prisma';
import { invalidateProductsCache } from './product.service';

// ─── Default categories (identical to Mongoose version) ──────────────────────
export const DEFAULT_CATEGORIES = [
  { nameAr: 'استرخاء', nameEn: 'Relax',   descriptionAr: 'كراسي بين باج فاخرة للاسترخاء وأوقات الفراغ', descriptionEn: 'Premium bean bags for relaxation and leisure time', slugAr: 'relax',   slugEn: 'relax',   order: 1, isActive: true },
  { nameAr: 'ألعاب',   nameEn: 'Game',    descriptionAr: 'كراسي منخفضة مصممة لجلسات الألعاب الطويلة',   descriptionEn: 'Low-profile chairs designed for long gaming sessions',  slugAr: 'game',    slugEn: 'game',    order: 2, isActive: true },
  { nameAr: 'أطفال',  nameEn: 'Kids',    descriptionAr: 'بين باج بحجم مناسب للأطفال بتصميمات مرحة',    descriptionEn: 'Kid-sized bean bags with fun, playful designs',          slugAr: 'kids',    slugEn: 'kids',    order: 3, isActive: true },
  { nameAr: 'خارجي',  nameEn: 'Outdoor', descriptionAr: 'بين باج مقاوم للماء والشمس للحدائق والتراسات', descriptionEn: 'Water and UV resistant bean bags for gardens and patios', slugAr: 'outdoor', slugEn: 'outdoor', order: 4, isActive: true },
];

// ─── Format helper: Prisma row → API shape ────────────────────────────────────
const formatCategory = (c: any): any => ({
  ...c,
  _id:    c.id,
  id:     c.id,
  slug:   c.slugEn ?? c.slugAr ?? '',
  status: c.isActive ? 'active' : 'inactive',
});

// ─── In-memory 60s TTL cache (identical bounds as Mongoose version) ───────────
interface CategoryCacheEntry { data: any[]; expiresAt: number }
let categoriesCache: { active?: CategoryCacheEntry; all?: CategoryCacheEntry } = {};

export const invalidateCategoryCache = (): void => {
  categoriesCache = {};
  invalidateProductsCache();
};

// ─── ensureDefaultCategories (startup only, never called in request path) ─────
let defaultCategoriesSeeded = false;
export const ensureDefaultCategories = async (): Promise<void> => {
  if (defaultCategoriesSeeded) return;
  try {
    for (const def of DEFAULT_CATEGORIES) {
      const exists = await prisma.category.findFirst({
        where: { OR: [{ slugEn: def.slugEn }, { slugAr: def.slugAr }, { nameEn: def.nameEn }, { nameAr: def.nameAr }] },
        select: { id: true },
      });
      if (!exists) {
        await prisma.category.create({ data: def }).catch(() => {/* ignore race-condition dupe */});
      }
    }
    defaultCategoriesSeeded = true;
  } catch (_err) {
    // Non-fatal on startup
  }
};

// ─── getCategories ────────────────────────────────────────────────────────────
export const getCategories = async (includeInactive = false): Promise<any[]> => {
  const cacheKey = includeInactive ? 'all' : 'active';
  const now      = Date.now();
  if (categoriesCache[cacheKey] && categoriesCache[cacheKey]!.expiresAt > now) {
    return categoriesCache[cacheKey]!.data;
  }

  const where: Prisma.CategoryWhereInput = includeInactive ? {} : { isActive: true };
  const cats = await productRepository.findCategories({
    where,
    orderBy: { order: 'asc' },
  });

  const result = cats.map(formatCategory);
  categoriesCache[cacheKey] = { data: result, expiresAt: now + 60_000 };
  return result;
};

// ─── getCategoryById ──────────────────────────────────────────────────────────
export const getCategoryById = async (id: string): Promise<any | null> => {
  const category = await productRepository.findCategoryById(id);
  return category ? formatCategory(category) : null;
};

// ─── getCategoryBySlug ────────────────────────────────────────────────────────
export const getCategoryBySlug = async (slug: string, locale: 'ar' | 'en'): Promise<any | null> => {
  const slugField = locale === 'ar' ? 'slugAr' : 'slugEn';

  let category = await prisma.category.findFirst({
    where: { [slugField]: slug, isActive: true },
  }).catch(() => null);

  if (!category) {
    category = await prisma.category.findFirst({
      where: { OR: [{ slugEn: slug }, { slugAr: slug }], isActive: true },
    }).catch(() => null);
  }

  return category ? formatCategory(category) : null;
};

// ─── getCategoryWithProducts ──────────────────────────────────────────────────
export const getCategoryWithProducts = async (
  id: string,
  page = 1,
  limit = 20
): Promise<{ category: any | null; products: any[]; total: number }> => {
  const category = await productRepository.findCategoryById(id);
  if (!category) return { category: null, products: [], total: 0 };

  const { normalisePrismaProduct } = await import('./product.service');
  const skip = (page - 1) * limit;
  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where: { categoryId: id, status: 'active' },
      skip,
      take: limit,
      include: { images: { orderBy: { order: 'asc' } }, inventory: true },
    }),
    prisma.product.count({ where: { categoryId: id, status: 'active' } }),
  ]);

  return {
    category: formatCategory(category),
    products: products.map(normalisePrismaProduct),
    total,
  };
};

// ─── createCategory ───────────────────────────────────────────────────────────
export const createCategory = async (data: any): Promise<any> => {
  // status → isActive
  if (data.status !== undefined) data.isActive = data.status === 'active';

  // slug normalisation
  if (data.slug) {
    if (!data.slugEn) data.slugEn = data.slug.toLowerCase().trim();
    if (!data.slugAr) data.slugAr = data.slug.toLowerCase().trim();
  }
  if (data.slugEn && !data.slugAr) data.slugAr = data.slugEn;
  if (data.slugAr && !data.slugEn) data.slugEn = data.slugAr;
  if (!data.slugEn) {
    const gen = (data.nameEn || 'category').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    data.slugEn = gen;
    data.slugAr = data.slugAr || gen;
  }

  // Uniqueness check
  if (data.slugAr) {
    const existAr = await prisma.category.findFirst({ where: { slugAr: data.slugAr }, select: { id: true } });
    if (existAr) throw new Error('Arabic slug already exists');
  }
  if (data.slugEn) {
    const existEn = await prisma.category.findFirst({ where: { slugEn: data.slugEn }, select: { id: true } });
    if (existEn) throw new Error('English slug already exists');
  }

  const category = await productRepository.createCategory({
    nameAr:        data.nameAr,
    nameEn:        data.nameEn,
    slugAr:        data.slugAr,
    slugEn:        data.slugEn,
    descriptionAr: data.descriptionAr ?? null,
    descriptionEn: data.descriptionEn ?? null,
    image:         data.image ?? null,
    isActive:      data.isActive !== undefined ? data.isActive : true,
    order:         data.order ?? 0,
    productCount:  0,
  });

  invalidateCategoryCache();
  return formatCategory(category);
};

// ─── updateCategory ───────────────────────────────────────────────────────────
export const updateCategory = async (id: string, data: any): Promise<any | null> => {
  const existing = await productRepository.findCategoryById(id);
  if (!existing) throw new Error('Category not found');

  if (data.status !== undefined) data.isActive = data.status === 'active';

  if (data.slug) {
    if (!data.slugEn) data.slugEn = data.slug.toLowerCase().trim();
    if (!data.slugAr) data.slugAr = data.slug.toLowerCase().trim();
  }

  if (data.slugAr && data.slugAr !== existing.slugAr) {
    const dup = await prisma.category.findFirst({ where: { slugAr: data.slugAr }, select: { id: true } });
    if (dup) throw new Error('Arabic slug already exists');
  }
  if (data.slugEn && data.slugEn !== existing.slugEn) {
    const dup = await prisma.category.findFirst({ where: { slugEn: data.slugEn }, select: { id: true } });
    if (dup) throw new Error('English slug already exists');
  }

  const updateData: Prisma.CategoryUpdateInput = {};
  const fields = ['nameAr', 'nameEn', 'slugAr', 'slugEn', 'descriptionAr', 'descriptionEn', 'image', 'isActive', 'order'];
  for (const f of fields) {
    if (data[f] !== undefined) (updateData as any)[f] = data[f];
  }

  const category = await productRepository.updateCategory(id, updateData);
  invalidateCategoryCache();
  return formatCategory(category);
};

// ─── deleteCategory ───────────────────────────────────────────────────────────
export const deleteCategory = async (id: string): Promise<any | null> => {
  const productCount = await prisma.product.count({ where: { categoryId: id } });
  if (productCount > 0) {
    throw new Error(`Cannot delete category with ${productCount} products. Please reassign or delete products first.`);
  }

  const category = await productRepository.findCategoryById(id);
  if (!category) return null;

  await productRepository.deleteCategory(id);
  invalidateCategoryCache();
  return formatCategory(category);
};

// ─── reorderCategories ────────────────────────────────────────────────────────
export const reorderCategories = async (
  categoryOrders: Array<{ id: string; order: number }>
): Promise<void> => {
  await prisma.$transaction(
    categoryOrders.map(({ id, order }) =>
      prisma.category.update({ where: { id }, data: { order } })
    )
  );
  invalidateCategoryCache();
};

// ─── updateCategoryProductCount ───────────────────────────────────────────────
export const updateCategoryProductCount = async (categoryId: string): Promise<void> => {
  const count = await prisma.product.count({ where: { categoryId, status: 'active' } });
  await prisma.category.update({ where: { id: categoryId }, data: { productCount: count } });
};

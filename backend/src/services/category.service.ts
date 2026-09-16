import { Category, ICategory } from '../models/Category';
import { Product } from '../models/Product';

export const DEFAULT_CATEGORIES = [
  {
    nameAr: 'استرخاء',
    nameEn: 'Relax',
    descriptionAr: 'كراسي بين باج فاخرة للاسترخاء وأوقات الفراغ',
    descriptionEn: 'Premium bean bags for relaxation and leisure time',
    slugAr: 'relax',
    slugEn: 'relax',
    order: 1,
    isActive: true,
  },
  {
    nameAr: 'ألعاب',
    nameEn: 'Game',
    descriptionAr: 'كراسي منخفضة مصممة لجلسات الألعاب الطويلة',
    descriptionEn: 'Low-profile chairs designed for long gaming sessions',
    slugAr: 'game',
    slugEn: 'game',
    order: 2,
    isActive: true,
  },
  {
    nameAr: 'أطفال',
    nameEn: 'Kids',
    descriptionAr: 'بين باج بحجم مناسب للأطفال بتصميمات مرحة',
    descriptionEn: 'Kid-sized bean bags with fun, playful designs',
    slugAr: 'kids',
    slugEn: 'kids',
    order: 3,
    isActive: true,
  },
  {
    nameAr: 'خارجي',
    nameEn: 'Outdoor',
    descriptionAr: 'بين باج مقاوم للماء والشمس للحدائق والتراسات',
    descriptionEn: 'Water and UV resistant bean bags for gardens and patios',
    slugAr: 'outdoor',
    slugEn: 'outdoor',
    order: 4,
    isActive: true,
  },
];

const formatCategory = (c: any) => ({
  ...c,
  id: c._id ? c._id.toString() : c.id,
  slug: c.slugEn || c.slugAr || c.slug || '',
  status: c.isActive ? 'active' : 'inactive',
});

let defaultCategoriesSeeded = false;

/**
 * Idempotent startup initialization of default categories.
 * Executed ONCE at server startup after database connection.
 * NEVER called inside public GET requests.
 */
export const ensureDefaultCategories = async (): Promise<void> => {
  if (defaultCategoriesSeeded) return;
  try {
    for (const defCat of DEFAULT_CATEGORIES) {
      const exists = await Category.findOne({
        $or: [
          { slugEn: defCat.slugEn },
          { slugAr: defCat.slugAr },
          { nameEn: defCat.nameEn },
          { nameAr: defCat.nameAr },
        ],
      }).select('_id').lean();
      if (!exists) {
        try {
          await Category.create(defCat);
        } catch {
          // ignore concurrent duplicate key race condition
        }
      }
    }
    defaultCategoriesSeeded = true;
  } catch (_err) {
    // Non-fatal on startup; will retry on next check
  }
};

interface CategoryCacheEntry {
  data: any[];
  expiresAt: number;
}
let categoriesCache: { active?: CategoryCacheEntry; all?: CategoryCacheEntry } = {};

export const invalidateCategoryCache = (): void => {
  categoriesCache = {};
};

// Get all categories (pure read with 60s TTL cache)
export const getCategories = async (includeInactive: boolean = false): Promise<any[]> => {
  const cacheKey = includeInactive ? 'all' : 'active';
  const now = Date.now();
  if (categoriesCache[cacheKey] && categoriesCache[cacheKey]!.expiresAt > now) {
    return categoriesCache[cacheKey]!.data;
  }

  const filter = includeInactive ? {} : { isActive: true };
  
  const cats = await Category.find(filter)
    .sort({ order: 1, nameEn: 1 })
    .lean();

  const result = cats.map(formatCategory);
  categoriesCache[cacheKey] = {
    data: result,
    expiresAt: now + 60_000, // 60s TTL
  };

  return result;
};

// Get single category by ID
export const getCategoryById = async (id: string): Promise<any | null> => {
  const category = await Category.findById(id).lean();
  if (!category) return null;
  return formatCategory(category);
};

// Get category by slug
export const getCategoryBySlug = async (
  slug: string,
  locale: 'ar' | 'en'
): Promise<any | null> => {
  const slugField = locale === 'ar' ? 'slugAr' : 'slugEn';
  let category = await Category.findOne({ [slugField]: slug, isActive: true }).lean();
  if (!category) {
    category = await Category.findOne({
      $or: [{ slugEn: slug }, { slugAr: slug }],
      isActive: true,
    }).lean();
  }
  if (!category) return null;
  return formatCategory(category);
};

// Get category with products
export const getCategoryWithProducts = async (
  id: string,
  page: number = 1,
  limit: number = 20
): Promise<{ category: ICategory | null; products: any[]; total: number }> => {
  const category = await Category.findById(id);
  
  if (!category) {
    return { category: null, products: [], total: 0 };
  }

  const skip = (page - 1) * limit;
  
  const [products, total] = await Promise.all([
    Product.find({ category: id, status: 'active' })
      .skip(skip)
      .limit(limit)
      .lean(),
    Product.countDocuments({ category: id, status: 'active' }),
  ]);

  return { category, products, total };
};

// Create category
export const createCategory = async (data: any): Promise<any> => {
  if (data.status) {
    data.isActive = data.status === 'active';
  }

  if (data.slug) {
    if (!data.slugEn) data.slugEn = data.slug.toLowerCase().trim();
    if (!data.slugAr) data.slugAr = data.slug.toLowerCase().trim();
  }
  if (data.slugEn && !data.slugAr) data.slugAr = data.slugEn;
  if (data.slugAr && !data.slugEn) data.slugEn = data.slugAr;

  if (!data.slugEn) {
    const gen = (data.nameEn || 'category').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    data.slugEn = gen;
    data.slugAr = gen;
  }

  // Check slug uniqueness (both AR and EN)
  if (data.slugAr) {
    const existingAr = await Category.findOne({ slugAr: data.slugAr });
    if (existingAr) {
      throw new Error('Arabic slug already exists');
    }
  }

  if (data.slugEn) {
    const existingEn = await Category.findOne({ slugEn: data.slugEn });
    if (existingEn) {
      throw new Error('English slug already exists');
    }
  }

  const category = new Category(data);
  await category.save();

  invalidateCategoryCache();
  return formatCategory(category.toObject ? category.toObject() : category);
};

// Update category
export const updateCategory = async (
  id: string,
  data: any
): Promise<any | null> => {
  const existingCategory = await Category.findById(id);
  if (!existingCategory) {
    throw new Error('Category not found');
  }

  if (data.status) {
    data.isActive = data.status === 'active';
  }

  if (data.slug) {
    if (!data.slugEn) data.slugEn = data.slug.toLowerCase().trim();
    if (!data.slugAr) data.slugAr = data.slug.toLowerCase().trim();
  }

  // Check slug uniqueness if changed
  if (data.slugAr && data.slugAr !== existingCategory.slugAr) {
    const duplicate = await Category.findOne({ slugAr: data.slugAr });
    if (duplicate) {
      throw new Error('Arabic slug already exists');
    }
  }

  if (data.slugEn && data.slugEn !== existingCategory.slugEn) {
    const duplicate = await Category.findOne({ slugEn: data.slugEn });
    if (duplicate) {
      throw new Error('English slug already exists');
    }
  }

  const category = await Category.findByIdAndUpdate(id, data, {
    new: true,
    runValidators: true,
  });

  invalidateCategoryCache();
  return category ? formatCategory(category.toObject ? category.toObject() : category) : null;
};

// Delete category (safe delete - check for products)
export const deleteCategory = async (id: string): Promise<ICategory | null> => {
  // Check if category has products
  const productCount = await Product.countDocuments({ category: id });
  
  if (productCount > 0) {
    throw new Error(
      `Cannot delete category with ${productCount} products. Please reassign or delete products first.`
    );
  }

  const category = await Category.findByIdAndDelete(id);
  invalidateCategoryCache();
  return category;
};

// Reorder categories
export const reorderCategories = async (
  categoryOrders: Array<{ id: string; order: number }>
): Promise<void> => {
  const bulkOps = categoryOrders.map(({ id, order }) => ({
    updateOne: {
      filter: { _id: id },
      update: { $set: { order } },
    },
  }));

  await Category.bulkWrite(bulkOps);
  invalidateCategoryCache();
};

// Update product count (internal use)
export const updateCategoryProductCount = async (categoryId: string): Promise<void> => {
  const count = await Product.countDocuments({ category: categoryId, status: 'active' });
  await Category.findByIdAndUpdate(categoryId, { productCount: count });
};

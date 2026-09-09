import { Category, ICategory } from '../models/Category';
import { Product } from '../models/Product';

// Get all categories
export const getCategories = async (includeInactive: boolean = false): Promise<any[]> => {
  const filter = includeInactive ? {} : { isActive: true };
  
  return Category.find(filter)
    .sort({ order: 1, nameEn: 1 })
    .lean();
};

// Get single category by ID
export const getCategoryById = async (id: string): Promise<ICategory | null> => {
  return Category.findById(id);
};

// Get category by slug
export const getCategoryBySlug = async (
  slug: string,
  locale: 'ar' | 'en'
): Promise<ICategory | null> => {
  const slugField = locale === 'ar' ? 'slugAr' : 'slugEn';
  return Category.findOne({ [slugField]: slug, isActive: true });
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
export const createCategory = async (data: any): Promise<ICategory> => {
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

  return category;
};

// Update category
export const updateCategory = async (
  id: string,
  data: any
): Promise<ICategory | null> => {
  const existingCategory = await Category.findById(id);
  if (!existingCategory) {
    throw new Error('Category not found');
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

  return category;
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
};

// Update product count (internal use)
export const updateCategoryProductCount = async (categoryId: string): Promise<void> => {
  const count = await Product.countDocuments({ category: categoryId, status: 'active' });
  await Category.findByIdAndUpdate(categoryId, { productCount: count });
};

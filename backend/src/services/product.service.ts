import { Product, IProduct, ProductStatus } from '../models/Product';
import { Category } from '../models/Category';
import mongoose, { FilterQuery, SortOrder } from 'mongoose';

// Query parameters interface
export interface IProductQuery {
  page: number;
  limit: number;
  category?: string;
  status?: ProductStatus;
  featured?: boolean;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

// Paginated result interface
export interface IPaginatedProducts {
  products: IProduct[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Get all products with filters and pagination
export const getProducts = async (
  query: IProductQuery
): Promise<IPaginatedProducts> => {
  const { page, limit, category, status, featured, search, minPrice, maxPrice, inStock, sortBy, sortOrder } = query;

  // Build filter
  const filter: FilterQuery<IProduct> = {};

  if (category) {
    const categoryIds: any[] = [];
    if (mongoose.Types.ObjectId.isValid(category)) {
      categoryIds.push(new mongoose.Types.ObjectId(category));
    }
    const matchedCategories = await Category.find({
      $or: [
        { slugEn: category.toLowerCase() },
        { slugAr: category.toLowerCase() },
        { nameEn: new RegExp(`^${category}$`, 'i') },
        { nameAr: category },
        ...(mongoose.Types.ObjectId.isValid(category) ? [{ _id: category }] : []),
      ],
    }).select('_id');

    matchedCategories.forEach((c) => categoryIds.push(c._id));

    if (categoryIds.length > 0) {
      filter.category = { $in: [...categoryIds, category] as any };
    } else {
      filter.category = category as any;
    }
  }

  if (status) {
    filter.status = status;
  }

  if (featured !== undefined) {
    filter.featured = featured;
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) {
      filter.price.$gte = minPrice;
    }
    if (maxPrice !== undefined) {
      filter.price.$lte = maxPrice;
    }
  }

  if (inStock !== undefined && inStock) {
    filter['inventory.availableQuantity'] = { $gt: 0 };
  }

  // Text search
  if (search) {
    filter.$text = { $search: search };
  }

  // Build sort
  const sort: { [key: string]: SortOrder } = {};
  const actualSortBy = sortBy || 'createdAt';
  const actualSortOrder = sortOrder === 'asc' ? 1 : -1;
  sort[actualSortBy] = actualSortOrder;

  // Execute query
  const skip = (page - 1) * limit;
  
  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('category', 'nameAr nameEn slugAr slugEn')
      .lean(),
    Product.countDocuments(filter),
  ]);

  return {
    products: products as any,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

// Get single product by ID (supports ObjectId, slug, or SKU)
export const getProductById = async (id: string): Promise<IProduct | null> => {
  if (mongoose.Types.ObjectId.isValid(id)) {
    const product = await Product.findById(id).populate('category', 'nameAr nameEn slugAr slugEn');
    if (product) {
      product.viewCount += 1;
      await product.save();
      return product;
    }
  }

  // Fallback to slug or SKU
  const product = await Product.findOne({
    $or: [
      { slugEn: id },
      { slugAr: id },
      { sku: id.toUpperCase() },
      { sku: id },
    ],
  }).populate('category', 'nameAr nameEn slugAr slugEn');

  if (product) {
    product.viewCount += 1;
    await product.save();
    return product;
  }

  return null;
};

// Get product by slug
export const getProductBySlug = async (
  slug: string,
  locale: 'ar' | 'en'
): Promise<IProduct | null> => {
  const slugField = locale === 'ar' ? 'slugAr' : 'slugEn';
  const product = await Product.findOne({ [slugField]: slug }).populate(
    'category',
    'nameAr nameEn slugAr slugEn'
  );

  if (product) {
    product.viewCount += 1;
    await product.save();
  }

  return product;
};

// Get product by SKU
export const getProductBySku = async (sku: string): Promise<IProduct | null> => {
  return Product.findOne({ sku: sku.toUpperCase() }).populate(
    'category',
    'nameAr nameEn slugAr slugEn'
  );
};

// Create product
export const createProduct = async (data: Partial<IProduct>): Promise<IProduct> => {
  // Validate or assign category (supports ObjectId or slug)
  if (data.category) {
    let catDoc = null;
    if (mongoose.Types.ObjectId.isValid(data.category as any)) {
      catDoc = await Category.findById(data.category);
    }
    if (!catDoc) {
      catDoc = await Category.findOne({
        $or: [{ slugEn: data.category }, { slugAr: data.category }],
      });
    }
    if (catDoc) {
      data.category = catDoc._id as any;
    } else {
      delete (data as any).category;
    }
  }

  if (!data.category) {
    let defaultCat = await Category.findOne();
    if (!defaultCat) {
      const { DEFAULT_CATEGORIES } = await import('./category.service');
      defaultCat = await Category.create(DEFAULT_CATEGORIES[0]);
    }
    data.category = defaultCat._id as any;
  }

  // Increment product count on assigned category
  if (data.category) {
    await Category.findByIdAndUpdate(data.category, { $inc: { productCount: 1 } }).catch(() => {});
  }

  // Normalize descriptions so product creation never fails if one language is missing
  if (!data.descriptionAr && data.descriptionEn) data.descriptionAr = data.descriptionEn;
  if (!data.descriptionEn && data.descriptionAr) data.descriptionEn = data.descriptionAr;
  if (!data.descriptionAr) data.descriptionAr = data.nameAr || 'لا يوجد وصف';
  if (!data.descriptionEn) data.descriptionEn = data.nameEn || 'No description';

  // Check SKU uniqueness
  if (data.sku) {
    const existingProduct = await Product.findOne({ sku: data.sku.toUpperCase() });
    if (existingProduct) {
      throw new Error(`Product with SKU "${data.sku.toUpperCase()}" already exists`);
    }
    data.sku = data.sku.toUpperCase();
  } else {
    data.sku = `SKU-${Date.now()}`;
  }

  // Auto-generate slugs if not provided
  if (!data.slugEn) {
    data.slugEn = (data.nameEn || data.sku || 'product')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || `prod-${Date.now()}`;
  }
  if (!data.slugAr) {
    data.slugAr = data.slugEn;
  }

  // Normalize images
  if (data.images && Array.isArray(data.images)) {
    data.images = data.images.map((img: any, idx: number) => {
      if (typeof img === 'string') {
        return {
          url: img.trim(),
          alt: `${data.nameEn || 'Product'} image ${idx + 1}`,
          isPrimary: idx === 0,
          order: idx,
        };
      }
      return img;
    });
  }

  // Normalize inventory
  if (data.inventory) {
    if ((data.inventory as any).onHand !== undefined && data.inventory.onHandQuantity === undefined) {
      data.inventory.onHandQuantity = (data.inventory as any).onHand;
    }
    if (data.inventory.onHandQuantity !== undefined && data.inventory.reservedQuantity === undefined) {
      data.inventory.reservedQuantity = 0;
    }
    if (data.inventory.availableQuantity === undefined && data.inventory.onHandQuantity !== undefined) {
      data.inventory.availableQuantity = data.inventory.onHandQuantity - (data.inventory.reservedQuantity || 0);
    }
  }

  // Create product
  const product = new Product(data);
  await product.save();

  // Update category product count
  if (data.category) {
    await Category.findByIdAndUpdate(data.category, { $inc: { productCount: 1 } });
  }

  return product;
};

// Update product
export const updateProduct = async (
  id: string,
  data: Partial<IProduct>
): Promise<IProduct | null> => {
  // Check if product exists (supports ObjectId, slug, or SKU)
  let existingProduct = null;
  if (mongoose.Types.ObjectId.isValid(id)) {
    existingProduct = await Product.findById(id);
  }
  if (!existingProduct) {
    existingProduct = await Product.findOne({
      $or: [{ slugEn: id }, { slugAr: id }, { sku: id }],
    });
  }
  if (!existingProduct) {
    throw new Error('Product not found');
  }

  // Resolve category if changed (supports ObjectId or slug)
  if (data.category) {
    let catDoc = null;
    if (mongoose.Types.ObjectId.isValid(data.category as any)) {
      catDoc = await Category.findById(data.category);
    }
    if (!catDoc) {
      catDoc = await Category.findOne({
        $or: [{ slugEn: data.category }, { slugAr: data.category }],
      });
    }
    if (catDoc) {
      data.category = catDoc._id as any;
    }
  }

  // Validate category if changed
  const oldCat = existingProduct.category ? existingProduct.category.toString() : '';
  const newCat = data.category ? data.category.toString() : '';
  if (newCat && newCat !== oldCat) {
    const categoryExists = await Category.findById(newCat);
    if (!categoryExists) {
      throw new Error('Category not found');
    }

    // Update category counts
    if (existingProduct.category) {
      await Category.findByIdAndUpdate(existingProduct.category, { $inc: { productCount: -1 } });
    }
    await Category.findByIdAndUpdate(newCat, { $inc: { productCount: 1 } });
  }

  // Check SKU uniqueness if changed
  if (data.sku && data.sku !== existingProduct.sku) {
    const duplicateProduct = await Product.findOne({ sku: data.sku });
    if (duplicateProduct) {
      throw new Error('Product with this SKU already exists');
    }
  }

  // Normalize images
  if (data.images && Array.isArray(data.images)) {
    data.images = data.images.map((img: any, idx: number) => {
      if (typeof img === 'string') {
        return {
          url: img.trim(),
          alt: `${data.nameEn || existingProduct.nameEn || 'Product'} image ${idx + 1}`,
          isPrimary: idx === 0,
          order: idx,
        };
      }
      return img;
    });
  }

  // Normalize inventory aliases
  if (data.inventory) {
    if ((data.inventory as any).onHand !== undefined && data.inventory.onHandQuantity === undefined) {
      data.inventory.onHandQuantity = (data.inventory as any).onHand;
    }
  }
  if ((data as any)['inventory.onHand'] !== undefined && (data as any)['inventory.onHandQuantity'] === undefined) {
    (data as any)['inventory.onHandQuantity'] = (data as any)['inventory.onHand'];
  }

  // Apply updates to existingProduct
  Object.keys(data).forEach((key) => {
    if (key.includes('.')) {
      const parts = key.split('.');
      const parent = parts[0];
      const child = parts[1];
      if (parent && child && (existingProduct as any)[parent]) {
        (existingProduct as any)[parent][child] = (data as any)[key];
      }
    } else if (key === 'inventory' && typeof (data as any).inventory === 'object') {
      Object.assign(existingProduct.inventory, data.inventory);
    } else if (key === 'images' && Array.isArray(data.images)) {
      existingProduct.images = data.images as any;
      existingProduct.markModified('images');
    } else {
      (existingProduct as any)[key] = (data as any)[key];
    }
  });

  // Ensure required descriptions exist to avoid validation error on save
  if (!existingProduct.descriptionAr && existingProduct.descriptionEn) {
    existingProduct.descriptionAr = existingProduct.descriptionEn;
  }
  if (!existingProduct.descriptionEn && existingProduct.descriptionAr) {
    existingProduct.descriptionEn = existingProduct.descriptionAr;
  }
  if (!existingProduct.slugEn) {
    existingProduct.slugEn = existingProduct.sku?.toLowerCase() || `prod-${Date.now()}`;
  }
  if (!existingProduct.slugAr) {
    existingProduct.slugAr = existingProduct.slugEn;
  }

  if (existingProduct.inventory) {
    existingProduct.updateAvailableQuantity();
  }

  const product = await existingProduct.save();
  return product;
};

// Delete product (soft delete - set status to archived)
export const deleteProduct = async (id: string): Promise<IProduct | null> => {
  let query: any = { _id: id };
  if (!mongoose.Types.ObjectId.isValid(id)) {
    query = { $or: [{ slugEn: id }, { slugAr: id }, { sku: id }] };
  }
  const product = await Product.findOneAndUpdate(
    query,
    { status: ProductStatus.ARCHIVED },
    { new: true }
  );

  if (product) {
    // Decrement category product count
    await Category.findByIdAndUpdate(product.category, { $inc: { productCount: -1 } });
  }

  return product;
};

// Get featured products
export const getFeaturedProducts = async (limit: number = 10): Promise<any[]> => {
  let products = await Product.find({ featured: true, status: ProductStatus.ACTIVE })
    .sort({ createdAt: -1, orderCount: -1, viewCount: -1 })
    .limit(limit)
    .populate('category', 'nameAr nameEn slugAr slugEn')
    .lean();

  if (!products || products.length === 0) {
    products = await Product.find({ status: ProductStatus.ACTIVE })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('category', 'nameAr nameEn slugAr slugEn')
      .lean();
  }

  return products;
};

// Get low stock products (admin)
export const getLowStockProducts = async (): Promise<any[]> => {
  return Product.find({
    status: ProductStatus.ACTIVE,
    $expr: {
      $lte: ['$inventory.availableQuantity', '$inventory.lowStockThreshold'],
    },
  })
    .sort({ 'inventory.availableQuantity': 1 })
    .select('nameAr nameEn sku inventory')
    .lean();
};

// Get related products
export const getRelatedProducts = async (
  productId: string,
  limit: number = 6
): Promise<any[]> => {
  let product: any = null;
  if (mongoose.Types.ObjectId.isValid(productId)) {
    product = await Product.findById(productId);
  }
  if (!product) {
    product = await Product.findOne({
      $or: [{ slugEn: productId }, { slugAr: productId }, { sku: productId }],
    });
  }
  if (!product) {
    return [];
  }

  return Product.find({
    _id: { $ne: product._id },
    category: product.category,
    status: ProductStatus.ACTIVE,
  })
    .sort({ orderCount: -1 })
    .limit(limit)
    .populate('category', 'nameAr nameEn')
    .lean();
};

// ─── Admin: Adjust inventory manually ────────────────────────────────────────
export const adjustInventory = async (
  productId: string,
  params: {
    onHandQuantity?: number;
    reservedQuantity?: number;
    lowStockThreshold?: number;
    reason?: string;
  }
): Promise<IProduct> => {
  const product = await Product.findById(productId);
  if (!product) throw new Error('Product not found');

  if (params.onHandQuantity !== undefined) {
    if (params.onHandQuantity < 0) throw new Error('onHandQuantity cannot be negative');
    product.inventory.onHandQuantity = params.onHandQuantity;
  }

  if (params.reservedQuantity !== undefined) {
    if (params.reservedQuantity < 0) throw new Error('reservedQuantity cannot be negative');
    product.inventory.reservedQuantity = params.reservedQuantity;
  }

  if (params.lowStockThreshold !== undefined) {
    product.inventory.lowStockThreshold = params.lowStockThreshold;
  }

  // Recompute availableQuantity
  product.inventory.availableQuantity = Math.max(
    0,
    product.inventory.onHandQuantity - product.inventory.reservedQuantity
  );

  product.inventory.lastSyncedAt = new Date();

  await product.save();
  return product;
};

import { Product, IProduct, ProductStatus } from '../models/Product';
import { Category } from '../models/Category';
import { FilterQuery, SortOrder } from 'mongoose';

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
    filter.category = category;
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
  sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

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

// Get single product by ID
export const getProductById = async (id: string): Promise<IProduct | null> => {
  const product = await Product.findById(id).populate('category', 'nameAr nameEn slugAr slugEn');

  if (product) {
    // Increment view count
    product.viewCount += 1;
    await product.save();
  }

  return product;
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
  // Validate category exists
  if (data.category) {
    const categoryExists = await Category.findById(data.category);
    if (!categoryExists) {
      throw new Error('Category not found');
    }
  }

  // Check SKU uniqueness
  if (data.sku) {
    const existingProduct = await Product.findOne({ sku: data.sku });
    if (existingProduct) {
      throw new Error('Product with this SKU already exists');
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
  // Check if product exists
  const existingProduct = await Product.findById(id);
  if (!existingProduct) {
    throw new Error('Product not found');
  }

  // Validate category if changed
  if (data.category && data.category.toString() !== existingProduct.category.toString()) {
    const categoryExists = await Category.findById(data.category);
    if (!categoryExists) {
      throw new Error('Category not found');
    }

    // Update category counts
    await Category.findByIdAndUpdate(existingProduct.category, { $inc: { productCount: -1 } });
    await Category.findByIdAndUpdate(data.category, { $inc: { productCount: 1 } });
  }

  // Check SKU uniqueness if changed
  if (data.sku && data.sku !== existingProduct.sku) {
    const duplicateProduct = await Product.findOne({ sku: data.sku });
    if (duplicateProduct) {
      throw new Error('Product with this SKU already exists');
    }
  }

  // Update product
  const product = await Product.findByIdAndUpdate(id, data, { new: true, runValidators: true });

  return product;
};

// Delete product (soft delete - set status to archived)
export const deleteProduct = async (id: string): Promise<IProduct | null> => {
  const product = await Product.findByIdAndUpdate(
    id,
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
  return Product.find({ featured: true, status: ProductStatus.ACTIVE })
    .sort({ orderCount: -1, viewCount: -1 })
    .limit(limit)
    .populate('category', 'nameAr nameEn slugAr slugEn')
    .lean();
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
  const product = await Product.findById(productId);
  if (!product) {
    return [];
  }

  return Product.find({
    _id: { $ne: productId },
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

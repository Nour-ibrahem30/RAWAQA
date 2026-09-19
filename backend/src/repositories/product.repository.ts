import { Product, ProductImage, Inventory, Category, ProductStatus, Prisma } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';

export interface IProductFilter {
  skip?: number;
  take?: number;
  where?: Prisma.ProductWhereInput;
  orderBy?: Prisma.ProductOrderByWithRelationInput;
  includeCategory?: boolean;
  includeImages?: boolean;
  includeInventory?: boolean;
}

export class ProductRepository {
  // ─── Products ──────────────────────────────────────────────────

  async findById(
    id: string,
    options: {
      includeCategory?: boolean;
      includeImages?: boolean;
      includeInventory?: boolean;
    } = { includeCategory: true, includeImages: true, includeInventory: true }
  ): Promise<(Product & { category?: Category; images?: ProductImage[]; inventory?: Inventory | null }) | null> {
    return prisma.product.findUnique({
      where: { id },
      include: {
        category: options.includeCategory ?? true,
        images: options.includeImages ? { orderBy: { order: 'asc' } } : false,
        inventory: options.includeInventory ?? true,
      },
    });
  }

  async findBySlug(slug: string): Promise<(Product & { category?: Category; images?: ProductImage[]; inventory?: Inventory | null }) | null> {
    const clean = slug.toLowerCase().trim();
    return prisma.product.findFirst({
      where: {
        OR: [{ slugEn: clean }, { slugAr: clean }],
      },
      include: {
        category: true,
        images: { orderBy: { order: 'asc' } },
        inventory: true,
      },
    });
  }

  async findBySku(sku: string): Promise<Product | null> {
    return prisma.product.findUnique({
      where: { sku: sku.toUpperCase().trim() },
      include: {
        category: true,
        images: true,
        inventory: true,
      },
    });
  }

  async findMany(params: IProductFilter): Promise<Array<Product & { category?: Category; images?: ProductImage[]; inventory?: Inventory | null }>> {
    return prisma.product.findMany({
      skip: params.skip,
      take: params.take,
      where: params.where,
      orderBy: params.orderBy,
      include: {
        category: params.includeCategory ?? true,
        images: params.includeImages ? { orderBy: { order: 'asc' } } : true,
        inventory: params.includeInventory ?? true,
      },
    });
  }

  async count(where?: Prisma.ProductWhereInput): Promise<number> {
    return prisma.product.count({ where });
  }

  async create(data: {
    nameAr: string;
    nameEn: string;
    descriptionAr: string;
    descriptionEn: string;
    shortDescriptionAr?: string;
    shortDescriptionEn?: string;
    slugAr: string;
    slugEn: string;
    sku: string;
    odooProductId?: string;
    price: Prisma.Decimal | number;
    compareAtPrice?: Prisma.Decimal | number;
    costPrice?: Prisma.Decimal | number;
    categoryId: string;
    color?: string;
    material?: string;
    status?: ProductStatus;
    featured?: boolean;
    tags?: string[];
    metaTitleAr?: string;
    metaTitleEn?: string;
    metaDescriptionAr?: string;
    metaDescriptionEn?: string;
    dimensionLength?: number;
    dimensionWidth?: number;
    dimensionHeight?: number;
    dimensionWeight?: number;
    images?: Array<{
      url: string;
      publicId?: string;
      altAr?: string;
      altEn?: string;
      isPrimary?: boolean;
      order?: number;
    }>;
    initialInventory?: {
      onHandQuantity: number;
      lowStockThreshold?: number;
      allowBackorder?: boolean;
    };
  }): Promise<Product> {
    const { images, initialInventory, ...productData } = data;

    return prisma.product.create({
      data: {
        ...productData,
        images: images && images.length > 0 ? { create: images } : undefined,
        inventory: {
          create: {
            onHandQuantity: initialInventory?.onHandQuantity ?? 0,
            reservedQuantity: 0,
            availableQuantity: initialInventory?.onHandQuantity ?? 0,
            lowStockThreshold: initialInventory?.lowStockThreshold ?? 5,
            allowBackorder: initialInventory?.allowBackorder ?? false,
          },
        },
      },
      include: {
        category: true,
        images: true,
        inventory: true,
      },
    });
  }

  async update(id: string, data: Prisma.ProductUpdateInput): Promise<Product> {
    return prisma.product.update({
      where: { id },
      data,
      include: {
        category: true,
        images: true,
        inventory: true,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await prisma.product.delete({ where: { id } });
  }

  async incrementViewCount(id: string): Promise<void> {
    await prisma.product.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });
  }

  async updateRatingStats(productId: string, average: number, count: number): Promise<void> {
    await prisma.product.update({
      where: { id: productId },
      data: {
        ratingAverage: average,
        ratingCount: count,
      },
    });
  }

  // ─── Inventory Management ──────────────────────────────────────

  async getInventory(productId: string): Promise<Inventory | null> {
    return prisma.inventory.findUnique({ where: { productId } });
  }

  async updateInventory(
    productId: string,
    data: Prisma.InventoryUpdateInput,
    tx?: Prisma.TransactionClient
  ): Promise<Inventory> {
    const client = tx ?? prisma;
    return client.inventory.update({
      where: { productId },
      data,
    });
  }

  /**
   * Concurrency-safe atomic reservation:
   * Increments reservedQuantity, decrements availableQuantity ONLY if availableQuantity >= quantity.
   * Returns true if reservation succeeded, false if insufficient stock.
   */
  async reserveStock(
    productId: string,
    quantity: number,
    tx?: Prisma.TransactionClient
  ): Promise<boolean> {
    const client = tx ?? prisma;
    const result = await client.inventory.updateMany({
      where: {
        productId,
        availableQuantity: { gte: quantity },
      },
      data: {
        reservedQuantity: { increment: quantity },
        availableQuantity: { decrement: quantity },
      },
    });
    return result.count > 0;
  }

  /**
   * Releases previously reserved stock back to available stock.
   */
  async releaseStock(
    productId: string,
    quantity: number,
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    const client = tx ?? prisma;
    await client.inventory.updateMany({
      where: { productId },
      data: {
        reservedQuantity: { decrement: quantity },
        availableQuantity: { increment: quantity },
      },
    });
  }

  /**
   * Finalizes stock upon order fulfillment (deducts onHandQuantity and reservedQuantity).
   */
  async commitStock(
    productId: string,
    quantity: number,
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    const client = tx ?? prisma;
    await client.inventory.updateMany({
      where: { productId },
      data: {
        onHandQuantity: { decrement: quantity },
        reservedQuantity: { decrement: quantity },
      },
    });
  }

  // ─── Categories ────────────────────────────────────────────────

  async findCategoryById(id: string): Promise<Category | null> {
    return prisma.category.findUnique({ where: { id } });
  }

  async findCategoryBySlug(slug: string): Promise<Category | null> {
    const clean = slug.toLowerCase().trim();
    return prisma.category.findFirst({
      where: {
        OR: [{ slugEn: clean }, { slugAr: clean }],
      },
    });
  }

  async findCategories(params?: {
    where?: Prisma.CategoryWhereInput;
    orderBy?: Prisma.CategoryOrderByWithRelationInput;
  }): Promise<Category[]> {
    return prisma.category.findMany({
      where: params?.where,
      orderBy: params?.orderBy ?? { order: 'asc' },
    });
  }

  async createCategory(data: Prisma.CategoryCreateInput): Promise<Category> {
    return prisma.category.create({ data });
  }

  async updateCategory(id: string, data: Prisma.CategoryUpdateInput): Promise<Category> {
    return prisma.category.update({ where: { id }, data });
  }

  async deleteCategory(id: string): Promise<void> {
    await prisma.category.delete({ where: { id } });
  }
}

export const productRepository = new ProductRepository();


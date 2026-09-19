import { Wishlist, Product, Category, ProductImage, Inventory } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma';

export type WishlistWithProducts = Wishlist & {
  products: Array<Product & { category?: Category; images?: ProductImage[]; inventory?: Inventory | null }>;
};

export class WishlistRepository {
  async findByUserId(userId: string): Promise<WishlistWithProducts | null> {
    return prisma.wishlist.findUnique({
      where: { userId },
      include: {
        products: {
          include: {
            category: true,
            images: { where: { isPrimary: true }, take: 1 },
            inventory: true,
          },
        },
      },
    });
  }

  async getOrCreate(userId: string): Promise<WishlistWithProducts> {
    const existing = await this.findByUserId(userId);
    if (existing) return existing;

    return prisma.wishlist.create({
      data: { userId },
      include: {
        products: {
          include: {
            category: true,
            images: { where: { isPrimary: true }, take: 1 },
            inventory: true,
          },
        },
      },
    });
  }

  async addProduct(userId: string, productId: string): Promise<WishlistWithProducts> {
    await this.getOrCreate(userId);

    return prisma.wishlist.update({
      where: { userId },
      data: {
        products: {
          connect: { id: productId },
        },
      },
      include: {
        products: {
          include: {
            category: true,
            images: { where: { isPrimary: true }, take: 1 },
            inventory: true,
          },
        },
      },
    });
  }

  async removeProduct(userId: string, productId: string): Promise<WishlistWithProducts> {
    return prisma.wishlist.update({
      where: { userId },
      data: {
        products: {
          disconnect: { id: productId },
        },
      },
      include: {
        products: {
          include: {
            category: true,
            images: { where: { isPrimary: true }, take: 1 },
            inventory: true,
          },
        },
      },
    });
  }

  async clear(userId: string): Promise<void> {
    await prisma.wishlist.update({
      where: { userId },
      data: {
        products: {
          set: [],
        },
      },
    });
  }
}

export const wishlistRepository = new WishlistRepository();


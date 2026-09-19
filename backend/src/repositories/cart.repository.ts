import { Cart, CartItem, Product, Category, ProductImage, Prisma } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';

export type CartWithDetails = Cart & {
  items: Array<CartItem & { product: Product & { category?: Category; images?: ProductImage[] } }>;
};

export class CartRepository {
  async findById(id: string): Promise<CartWithDetails | null> {
    return prisma.cart.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
                images: { where: { isPrimary: true }, take: 1 },
              },
            },
          },
          orderBy: { addedAt: 'asc' },
        },
      },
    });
  }

  async findByUserId(userId: string): Promise<CartWithDetails | null> {
    return prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
                images: { where: { isPrimary: true }, take: 1 },
              },
            },
          },
          orderBy: { addedAt: 'asc' },
        },
      },
    });
  }

  async findBySessionId(sessionId: string): Promise<CartWithDetails | null> {
    return prisma.cart.findUnique({
      where: { sessionId },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
                images: { where: { isPrimary: true }, take: 1 },
              },
            },
          },
          orderBy: { addedAt: 'asc' },
        },
      },
    });
  }

  async create(data: {
    userId?: string;
    sessionId?: string;
    expiresAt?: Date;
  }): Promise<CartWithDetails> {
    return prisma.cart.create({
      data: {
        userId: data.userId,
        sessionId: data.sessionId,
        expiresAt: data.expiresAt,
        subtotal: 0,
        itemCount: 0,
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
                images: true,
              },
            },
          },
        },
      },
    });
  }

  async addItem(data: {
    cartId: string;
    productId: string;
    quantity: number;
    price: Prisma.Decimal | number;
  }): Promise<void> {
    const existing = await prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: data.cartId,
          productId: data.productId,
        },
      },
    });

    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: {
          quantity: existing.quantity + data.quantity,
          price: data.price,
        },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: data.cartId,
          productId: data.productId,
          quantity: data.quantity,
          price: data.price,
        },
      });
    }

    await this.recalculateTotals(data.cartId);
  }

  async updateItemQuantity(
    cartId: string,
    productId: string,
    quantity: number
  ): Promise<void> {
    if (quantity <= 0) {
      await this.removeItem(cartId, productId);
      return;
    }

    await prisma.cartItem.update({
      where: {
        cartId_productId: { cartId, productId },
      },
      data: { quantity },
    });

    await this.recalculateTotals(cartId);
  }

  async removeItem(cartId: string, productId: string): Promise<void> {
    await prisma.cartItem.deleteMany({
      where: { cartId, productId },
    });
    await this.recalculateTotals(cartId);
  }

  async clearCart(cartId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? prisma;
    await client.cartItem.deleteMany({ where: { cartId } });
    await client.cart.update({
      where: { id: cartId },
      data: { subtotal: 0, itemCount: 0 },
    });
  }

  async recalculateTotals(cartId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? prisma;
    const items = await client.cartItem.findMany({ where: { cartId } });
    
    let subtotal = 0;
    let itemCount = 0;

    for (const item of items) {
      subtotal += Number(item.price) * item.quantity;
      itemCount += item.quantity;
    }

    await client.cart.update({
      where: { id: cartId },
      data: {
        subtotal: new Prisma.Decimal(subtotal.toFixed(2)),
        itemCount,
      },
    });
  }

  async deleteExpired(now: Date = new Date()): Promise<number> {
    const result = await prisma.cart.deleteMany({
      where: {
        expiresAt: { lt: now },
      },
    });
    return result.count;
  }
}

export const cartRepository = new CartRepository();


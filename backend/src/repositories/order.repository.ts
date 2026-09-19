import { Order, OrderItem, IdempotencyKey, OrderStatus, PaymentStatus, PaymentMethod, Prisma } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma';

export type OrderWithDetails = Order & {
  items: OrderItem[];
};

export class OrderRepository {
  async findById(id: string): Promise<OrderWithDetails | null> {
    return prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });
  }

  async findByOrderNumber(orderNumber: string): Promise<OrderWithDetails | null> {
    return prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: true,
      },
    });
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    where?: Prisma.OrderWhereInput;
    orderBy?: Prisma.OrderOrderByWithRelationInput;
  }): Promise<OrderWithDetails[]> {
    return prisma.order.findMany({
      skip: params.skip,
      take: params.take,
      where: params.where,
      orderBy: params.orderBy ?? { createdAt: 'desc' },
      include: {
        items: true,
      },
    });
  }

  async count(where?: Prisma.OrderWhereInput): Promise<number> {
    return prisma.order.count({ where });
  }

  async create(
    data: {
      orderNumber: string;
      userId: string;
      status?: OrderStatus;
      paymentStatus?: PaymentStatus;
      paymentMethod?: PaymentMethod;
      subtotal: Prisma.Decimal | number;
      shippingCost?: Prisma.Decimal | number;
      discount?: Prisma.Decimal | number;
      tax?: Prisma.Decimal | number;
      total: Prisma.Decimal | number;
      couponCode?: string;
      couponDiscount?: Prisma.Decimal | number;
      notes?: string;
      customerNotes?: string;
      shippingRecipientName: string;
      shippingPhone: string;
      shippingStreetAddress: string;
      shippingCity: string;
      shippingGovernorate: string;
      shippingPostalCode?: string;
      items: Array<{
        productId?: string;
        quantity: number;
        price: Prisma.Decimal | number;
        subtotal: Prisma.Decimal | number;
        inventoryReserved?: boolean;
        reservedAt?: Date;
        snapshotSku: string;
        snapshotNameAr: string;
        snapshotNameEn: string;
        snapshotPrice: Prisma.Decimal | number;
        snapshotImage?: string;
      }>;
    },
    tx?: Prisma.TransactionClient
  ): Promise<OrderWithDetails> {
    const client = tx ?? prisma;
    const { items, ...orderData } = data;

    return client.order.create({
      data: {
        ...orderData,
        items: {
          create: items,
        },
      },
      include: {
        items: true,
      },
    });
  }

  async updateStatus(
    id: string,
    data: {
      status: OrderStatus;
      cancelReason?: string;
      cancelledAt?: Date;
    },
    tx?: Prisma.TransactionClient
  ): Promise<OrderWithDetails> {
    const client = tx ?? prisma;
    return client.order.update({
      where: { id },
      data,
      include: { items: true },
    });
  }

  async updatePaymentStatus(
    id: string,
    paymentStatus: PaymentStatus,
    tx?: Prisma.TransactionClient
  ): Promise<OrderWithDetails> {
    const client = tx ?? prisma;
    return client.order.update({
      where: { id },
      data: { paymentStatus },
      include: { items: true },
    });
  }

  async updateOdooSync(
    id: string,
    odoo: {
      odooOrderId?: number;
      odooSyncedAt?: Date;
      odooError?: string;
    },
    tx?: Prisma.TransactionClient
  ): Promise<Order> {
    const client = tx ?? prisma;
    return client.order.update({
      where: { id },
      data: {
        odooOrderId: odoo.odooOrderId,
        odooSyncedAt: odoo.odooSyncedAt,
        odooError: odoo.odooError,
      },
    });
  }

  // ─── Analytics & Statistics ────────────────────────────────────

  async getOrderStats(userId?: string): Promise<{
    totalOrders: number;
    totalRevenue: number;
    avgOrderValue: number;
    pendingOrders: number;
    processingOrders: number;
    shippedOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
  }> {
    const where: Prisma.OrderWhereInput = userId ? { userId } : {};

    const [aggregates, pending, processing, shipped, delivered, cancelled] = await Promise.all([
      prisma.order.aggregate({
        where,
        _count: { id: true },
        _sum: { total: true },
        _avg: { total: true },
      }),
      prisma.order.count({ where: { ...where, status: OrderStatus.pending } }),
      prisma.order.count({ where: { ...where, status: OrderStatus.processing } }),
      prisma.order.count({ where: { ...where, status: OrderStatus.shipped } }),
      prisma.order.count({ where: { ...where, status: OrderStatus.delivered } }),
      prisma.order.count({ where: { ...where, status: OrderStatus.cancelled } }),
    ]);

    return {
      totalOrders: aggregates._count.id,
      totalRevenue: Number(aggregates._sum.total ?? 0),
      avgOrderValue: Number(aggregates._avg.total ?? 0),
      pendingOrders: pending,
      processingOrders: processing,
      shippedOrders: shipped,
      deliveredOrders: delivered,
      cancelledOrders: cancelled,
    };
  }

  async getTopSellingProducts(limit: number = 5): Promise<Array<{
    productId: string;
    totalSold: number;
    revenue: number;
    nameAr?: string;
    nameEn?: string;
    sku?: string;
  }>> {
    const topItems = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        productId: { not: null },
        order: {
          status: { in: [OrderStatus.delivered, OrderStatus.shipped, OrderStatus.processing] },
        },
      },
      _sum: {
        quantity: true,
        subtotal: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: limit,
    });

    const results: any[] = [];
    for (const item of topItems) {
      if (!item.productId) continue;
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { nameAr: true, nameEn: true, sku: true },
      });

      results.push({
        productId: item.productId,
        totalSold: item._sum.quantity ?? 0,
        revenue: Number(item._sum.subtotal ?? 0),
        nameAr: product?.nameAr,
        nameEn: product?.nameEn,
        sku: product?.sku,
      });
    }

    return results;
  }

  async getDailyRevenue(since: Date): Promise<Array<{ date: string; orders: number; revenue: number }>> {
    const raw = await prisma.$queryRaw<Array<{ day: string; count: bigint; rev: Prisma.Decimal }>>`
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM-DD') AS day,
        COUNT(id) AS count,
        COALESCE(SUM(total), 0) AS rev
      FROM orders
      WHERE created_at >= ${since}
        AND status NOT IN ('cancelled', 'failed')
      GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
      ORDER BY day ASC;
    `;

    return raw.map((r) => ({
      date: r.day,
      orders: Number(r.count),
      revenue: Number(r.rev),
    }));
  }

  // ─── Idempotency Key ───────────────────────────────────────────

  async findIdempotencyKey(key: string): Promise<IdempotencyKey | null> {
    return prisma.idempotencyKey.findUnique({ where: { key } });
  }

  async createIdempotencyKey(
    data: {
      key: string;
      userId: string;
      requestHash: string;
      status: string;
      processingTimeout: Date;
    },
    tx?: Prisma.TransactionClient
  ): Promise<IdempotencyKey> {
    const client = tx ?? prisma;
    return client.idempotencyKey.create({ data });
  }

  async updateIdempotencyKey(
    key: string,
    data: {
      status: string;
      result?: any;
    },
    tx?: Prisma.TransactionClient
  ): Promise<IdempotencyKey> {
    const client = tx ?? prisma;
    return client.idempotencyKey.update({
      where: { key },
      data,
    });
  }

  async deleteExpiredIdempotencyKeys(now: Date = new Date()): Promise<number> {
    const res = await prisma.idempotencyKey.deleteMany({
      where: { processingTimeout: { lt: now } },
    });
    return res.count;
  }
}

export const orderRepository = new OrderRepository();


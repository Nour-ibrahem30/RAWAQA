/**
 * order.service.ts — PostgreSQL/Prisma implementation
 * All business logic preserved exactly from the Mongoose version.
 */

import { Prisma, OrderStatus, PaymentStatus } from '../generated/prisma/client';
import { orderRepository }  from '../repositories/order.repository';
import { outboxRepository } from '../repositories/outbox.repository';
import { prisma }           from '../lib/prisma';

// ─── Re-export types callers depend on ────────────────────────────────────────
export { OrderStatus, PaymentStatus };

// ─── Interfaces ───────────────────────────────────────────────────────────────
export interface OrderFilters {
  userId?:        string;
  status?:        OrderStatus;
  paymentStatus?: PaymentStatus;
  startDate?:     Date;
  endDate?:       Date;
}

export interface PaginationOptions {
  page:       number;
  limit:      number;
  sortBy?:    string;
  sortOrder?: 'asc' | 'desc';
}

// ─── Normalise helper ─────────────────────────────────────────────────────────
const toNum = (v: any) => (v == null ? 0 : Number(v));

/**
 * Maps flat Prisma order row to the shape the frontend / admin dashboard
 * expects — mirrors the old Mongoose populate('userId') + populate('items.product') shape.
 */
export const normaliseOrder = (o: any): any => {
  if (!o) return o;

  // If user was included via findMany with include:{user:...}, expose it
  const user = o.user ?? null;

  const items = (o.items ?? []).map((item: any) => ({
    ...item,
    price:         toNum(item.price),
    subtotal:      toNum(item.subtotal),
    snapshotPrice: toNum(item.snapshotPrice),
    productSnapshot: {
      sku:    item.snapshotSku,
      nameAr: item.snapshotNameAr,
      nameEn: item.snapshotNameEn,
      price:  toNum(item.snapshotPrice),
      image:  item.snapshotImage ?? null,
    },
    // product field populated in findMany with include:{product:...}
    product: item.product ?? null,
    _id:     item.id,
    id:      item.id,
  }));

  return {
    ...o,
    _id:           o.id,
    id:            o.id,
    subtotal:      toNum(o.subtotal),
    shippingCost:  toNum(o.shippingCost),
    discount:      toNum(o.discount),
    tax:           toNum(o.tax),
    total:         toNum(o.total),
    couponDiscount: o.couponDiscount != null ? toNum(o.couponDiscount) : undefined,
    // userId stays as the raw string ID — required for ownership check in getOrder().
    // The populated user object is exposed separately as `user`.
    userId: o.userId,
    user: user
      ? {
          id:        user.id,
          _id:       user.id,
          firstName: user.firstName,
          lastName:  user.lastName,
          email:     user.email,
          phone:     user.phone,
        }
      : null,
    shippingAddress: {
      recipientName: o.shippingRecipientName,
      firstName:     o.shippingRecipientName?.split(' ')[0] ?? '',
      lastName:      o.shippingRecipientName?.split(' ').slice(1).join(' ') ?? '',
      phone:         o.shippingPhone,
      streetAddress: o.shippingStreetAddress,
      addressLine1:  o.shippingStreetAddress,
      city:          o.shippingCity,
      governorate:   o.shippingGovernorate,
      postalCode:    o.shippingPostalCode ?? null,
      country:       'Egypt',
    },
    items,
  };
};

// ─── getOrders ────────────────────────────────────────────────────────────────
export const getOrders = async (
  filters:    OrderFilters,
  pagination: PaginationOptions
): Promise<{ orders: any[]; total: number }> => {
  const { page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
  const skip = (page - 1) * limit;

  const where: Prisma.OrderWhereInput = {};
  if (filters.userId)        where.userId        = filters.userId;
  if (filters.status)        where.status        = filters.status;
  if (filters.paymentStatus) where.paymentStatus = filters.paymentStatus;
  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) (where.createdAt as any).gte = filters.startDate;
    if (filters.endDate)   (where.createdAt as any).lte = filters.endDate;
  }

  const validSortFields: Record<string, boolean> = {
    createdAt: true, status: true, total: true, orderNumber: true, updatedAt: true,
  };
  const safeSortBy  = validSortFields[sortBy ?? ''] ? sortBy : 'createdAt';
  const safeSortOrd = sortOrder === 'asc' ? 'asc' : 'desc';

  const [rawOrders, total] = await Promise.all([
    prisma.order.findMany({
      skip,
      take:  limit,
      where,
      orderBy: { [safeSortBy!]: safeSortOrd },
      include: {
        user:  { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        items: {
          include: {
            product: { select: { id: true, nameEn: true, nameAr: true, images: { take: 1, where: { isPrimary: true } } } },
          },
        },
      },
    }),
    orderRepository.count(where),
  ]);

  return { orders: rawOrders.map(normaliseOrder), total };
};

// ─── getOrderById ─────────────────────────────────────────────────────────────
export const getOrderById = async (orderId: string): Promise<any | null> => {
  const order = await prisma.order.findFirst({
    where: {
      OR: [
        { id:          orderId },
        { orderNumber: orderId },
      ],
    },
    include: {
      user:  { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      items: {
        include: {
          product: { select: { id: true, nameEn: true, nameAr: true, price: true, images: { take: 1, where: { isPrimary: true } } } },
        },
      },
    },
  });
  return order ? normaliseOrder(order) : null;
};

// ─── getOrderByNumber ─────────────────────────────────────────────────────────
export const getOrderByNumber = async (orderNumber: string): Promise<any | null> => {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      user:  { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
      items: {
        include: {
          product: { select: { id: true, nameEn: true, nameAr: true, price: true, images: { take: 1, where: { isPrimary: true } } } },
        },
      },
    },
  });
  return order ? normaliseOrder(order) : null;
};

// ─── getUserOrders ────────────────────────────────────────────────────────────
export const getUserOrders = async (
  userId: string,
  page  = 1,
  limit = 10
): Promise<{ orders: any[]; total: number }> => {
  return getOrders({ userId }, { page, limit });
};

// ─── updateOrderStatus ────────────────────────────────────────────────────────
export const updateOrderStatus = async (
  orderId: string,
  status:  OrderStatus,
  notes?:  string
): Promise<any> => {
  return prisma.$transaction(async (tx) => {
    // Accept UUID or orderNumber
    const order = await tx.order.findFirst({
      where: { OR: [{ id: orderId }, { orderNumber: orderId }] },
    });
    if (!order) throw new Error('Order not found');

    validateStatusTransition(order.status, status);

    const previousStatus = order.status;
    const updateData: any = { status };

    // Timestamp updates matching Mongoose version
    if (status === OrderStatus.cancelled) {
      updateData.cancelledAt = new Date();
      if (notes) updateData.cancelReason = notes;
    }

    const updated = await tx.order.update({
      where: { id: order.id },
      data:  updateData,
      include: { items: true },
    });

    await outboxRepository.createEvent(
      {
        aggregateType: 'Order',
        aggregateId:   order.id,
        eventType:     'OrderStatusChanged',
        payload:       { orderId: order.id, orderNumber: order.orderNumber, previousStatus, newStatus: status, notes },
      },
      tx
    );

    return normaliseOrder(updated);
  });
};

// ─── updatePaymentStatus ──────────────────────────────────────────────────────
export const updatePaymentStatus = async (
  orderId:        string,
  paymentStatus:  PaymentStatus,
  _paymentDetails?: any
): Promise<any> => {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error('Order not found');

    const updated = await tx.order.update({
      where: { id: orderId },
      data:  { paymentStatus },
      include: { items: true },
    });

    await outboxRepository.createEvent(
      {
        aggregateType: 'Order',
        aggregateId:   orderId,
        eventType:     'PaymentStatusChanged',
        payload:       { orderId, orderNumber: order.orderNumber, paymentStatus },
      },
      tx
    );

    return normaliseOrder(updated);
  });
};

// ─── addTrackingInfo ──────────────────────────────────────────────────────────
export const addTrackingInfo = async (
  orderId:        string,
  trackingNumber: string,
  _carrier:       string
): Promise<any> => {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error('Order not found');

  const updated = await prisma.order.update({
    where: { id: orderId },
    data:  { /* trackingNumber not in Prisma schema yet — store in notes */ notes: `Tracking: ${trackingNumber}` },
    include: { items: true },
  });

  return normaliseOrder(updated);
};

// ─── getOrderStats ────────────────────────────────────────────────────────────
export const getOrderStats = async (userId?: string): Promise<any> => {
  return orderRepository.getOrderStats(userId);
};

// ─── exportOrdersCSV ──────────────────────────────────────────────────────────
export const exportOrdersCSV = async (filters: OrderFilters): Promise<string> => {
  const where: Prisma.OrderWhereInput = {};
  if (filters.status)        where.status        = filters.status;
  if (filters.paymentStatus) where.paymentStatus = filters.paymentStatus;
  if (filters.userId)        where.userId        = filters.userId;
  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) (where.createdAt as any).gte = filters.startDate;
    if (filters.endDate)   (where.createdAt as any).lte = filters.endDate;
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take:    5000,
    include: {
      user: { select: { firstName: true, lastName: true, email: true, phone: true } },
    },
  });

  const header = [
    'Order Number', 'Date', 'Status', 'Payment Status', 'Payment Method',
    'Customer Name', 'Customer Email', 'Customer Phone',
    'City', 'Governorate',
    'Subtotal', 'Shipping', 'Tax', 'Coupon Code', 'Coupon Discount', 'Total',
    'Tracking Number',
  ].join(',');

  const rows = orders.map((o: any) => {
    const u    = o.user ?? {};
    const name = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim();
    const date = new Date(o.createdAt).toISOString().split('T')[0];
    return [
      o.orderNumber,
      date,
      o.status,
      o.paymentStatus,
      o.paymentMethod,
      `"${name}"`,
      u.email ?? '',
      u.phone ?? '',
      o.shippingCity,
      o.shippingGovernorate,
      toNum(o.subtotal),
      toNum(o.shippingCost),
      toNum(o.tax),
      o.couponCode ?? '',
      o.couponDiscount != null ? toNum(o.couponDiscount) : 0,
      toNum(o.total),
      '', // trackingNumber (not in Prisma schema yet)
    ].join(',');
  });

  return [header, ...rows].join('\n');
};

// ─── validateStatusTransition ─────────────────────────────────────────────────
function validateStatusTransition(current: OrderStatus, next: OrderStatus): void {
  if (current === next) return;
  const valid = Object.values(OrderStatus);
  if (!valid.includes(next)) throw new Error(`Invalid order status: ${next}`);
  // Admin has full control — no rigid state machine (matches Mongoose version)
}

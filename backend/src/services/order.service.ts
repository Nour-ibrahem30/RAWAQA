import { Order, IOrder, OrderStatus, PaymentStatus } from '../models/Order';
import { OutboxEvent } from '../models/OutboxEvent';
import mongoose from 'mongoose';

interface OrderFilters {
  userId?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  startDate?: Date;
  endDate?: Date;
}

interface PaginationOptions {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Get orders with filters and pagination
 */
export const getOrders = async (
  filters: OrderFilters,
  pagination: PaginationOptions
): Promise<{ orders: any[]; total: number }> => {
  const { page, limit, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
  const skip = (page - 1) * limit;

  const query: any = {};

  if (filters.userId) {
    query.userId = filters.userId;
  }

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.paymentStatus) {
    query.paymentStatus = filters.paymentStatus;
  }

  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) {
      query.createdAt.$gte = filters.startDate;
    }
    if (filters.endDate) {
      query.createdAt.$lte = filters.endDate;
    }
  }

  const [orders, total] = await Promise.all([
    Order.find(query)
      .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'firstName lastName email phone')
      .populate('items.product', 'nameEn nameAr images')
      .lean(),
    Order.countDocuments(query),
  ]);

  const mappedOrders = (orders as any[]).map((doc: any) => ({
    ...doc,
    id: doc._id?.toString() || doc.id,
    _id: doc._id?.toString() || doc.id,
  }));

  return { orders: mappedOrders, total };
};

/**
 * Get single order by ID or order number
 */
export const getOrderById = async (orderId: string): Promise<IOrder | null> => {
  if (mongoose.Types.ObjectId.isValid(orderId)) {
    const order = await Order.findById(orderId)
      .populate('userId', 'firstName lastName email phone')
      .populate('items.product', 'nameEn nameAr images price');
    if (order) return order;
  }
  return Order.findOne({ orderNumber: orderId })
    .populate('userId', 'firstName lastName email phone')
    .populate('items.product', 'nameEn nameAr images price');
};

/**
 * Get order by order number
 */
export const getOrderByNumber = async (orderNumber: string): Promise<IOrder | null> => {
  return Order.findOne({ orderNumber })
    .populate('userId', 'firstName lastName email phone')
    .populate('items.product', 'nameEn nameAr images price');
};

/**
 * Get user orders
 */
export const getUserOrders = async (
  userId: string,
  page: number = 1,
  limit: number = 10
): Promise<{ orders: any[]; total: number }> => {
  return getOrders({ userId }, { page, limit });
};

/**
 * Update order status
 */
export const updateOrderStatus = async (
  orderId: string,
  status: OrderStatus,
  notes?: string
): Promise<IOrder> => {
  let session: mongoose.ClientSession | null = null;
  let useTransaction = false;

  try {
    session = await mongoose.startSession();
    session.startTransaction();
    useTransaction = true;
  } catch {
    session = null;
    useTransaction = false;
  }

  try {
    let order: IOrder | null = null;
    if (mongoose.Types.ObjectId.isValid(orderId)) {
      order = session
        ? await Order.findById(orderId).session(session)
        : await Order.findById(orderId);
    }
    if (!order) {
      order = session
        ? await Order.findOne({ orderNumber: orderId }).session(session)
        : await Order.findOne({ orderNumber: orderId });
    }

    if (!order) {
      throw new Error('Order not found');
    }

    // Validate status transition
    validateStatusTransition(order.status, status);

    const previousStatus = order.status;
    order.status = status;

    // Update timestamps based on status
    switch (status) {
      case OrderStatus.CONFIRMED:
        order.confirmedAt = new Date();
        break;
      case OrderStatus.PROCESSING:
        // No extra field needed
        break;
      case OrderStatus.SHIPPED:
        order.shippedAt = new Date();
        break;
      case OrderStatus.DELIVERED:
        order.deliveredAt = new Date();
        order.paymentStatus = PaymentStatus.PAID;
        break;
      case OrderStatus.CANCELLED:
        order.cancelledAt = new Date();
        if (notes) order.internalNotes = notes;
        break;
    }

    if (session && useTransaction) {
      await order.save({ session });
      await OutboxEvent.create(
        [
          {
            aggregateType: 'Order',
            aggregateId: order._id,
            eventType: 'OrderStatusChanged',
            payload: {
              orderId: order._id,
              orderNumber: order.orderNumber,
              previousStatus,
              newStatus: status,
              notes,
            },
          },
        ],
        { session }
      );
      await session.commitTransaction();
    } else {
      await order.save();
      await OutboxEvent.create([
        {
          aggregateType: 'Order',
          aggregateId: order._id,
          eventType: 'OrderStatusChanged',
          payload: {
            orderId: order._id,
            orderNumber: order.orderNumber,
            previousStatus,
            newStatus: status,
            notes,
          },
        },
      ]);
    }

    return order;
  } catch (error) {
    if (session && useTransaction) {
      try {
        await session.abortTransaction();
      } catch {}
    }
    throw error;
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

/**
 * Update payment status
 */
export const updatePaymentStatus = async (
  orderId: string,
  paymentStatus: PaymentStatus,
  _paymentDetails?: any
): Promise<IOrder> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(orderId).session(session);

    if (!order) {
      throw new Error('Order not found');
    }

    order.paymentStatus = paymentStatus;

    if (paymentStatus === PaymentStatus.PAID) {
      // Just mark it as paid
    }

    // Don't use paymentDetails field - not in Order model
    await order.save({ session });

    // Create outbox event
    await OutboxEvent.create(
      [
        {
          aggregateType: 'Order',
          aggregateId: order._id,
          eventType: 'PaymentStatusChanged',
          payload: {
            orderId: order._id,
            orderNumber: order.orderNumber,
            paymentStatus,
          },
        },
      ],
      { session }
    );

    await session.commitTransaction();
    return order;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Add tracking info to order
 */
export const addTrackingInfo = async (
  orderId: string,
  trackingNumber: string,
  _carrier: string
): Promise<IOrder> => {
  const order = await Order.findById(orderId);

  if (!order) {
    throw new Error('Order not found');
  }

  order.trackingNumber = trackingNumber;
  // No carrier field in model

  await order.save();
  return order;
};

/**
 * Get order statistics
 */
export const getOrderStats = async (userId?: string): Promise<any> => {
  const match: any = userId ? { userId: new mongoose.Types.ObjectId(userId) } : {};

  const stats = await Order.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        totalRevenue: { $sum: '$total' },
        avgOrderValue: { $avg: '$total' },
        pendingOrders: {
          $sum: { $cond: [{ $eq: ['$status', OrderStatus.PENDING] }, 1, 0] },
        },
        processingOrders: {
          $sum: { $cond: [{ $eq: ['$status', OrderStatus.PROCESSING] }, 1, 0] },
        },
        shippedOrders: {
          $sum: { $cond: [{ $eq: ['$status', OrderStatus.SHIPPED] }, 1, 0] },
        },
        deliveredOrders: {
          $sum: { $cond: [{ $eq: ['$status', OrderStatus.DELIVERED] }, 1, 0] },
        },
        cancelledOrders: {
          $sum: { $cond: [{ $eq: ['$status', OrderStatus.CANCELLED] }, 1, 0] },
        },
      },
    },
  ]);

  return stats[0] || {
    totalOrders: 0,
    totalRevenue: 0,
    avgOrderValue: 0,
    pendingOrders: 0,
    processingOrders: 0,
    shippedOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
  };
};

// Helper function to validate status transitions
function validateStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus): void {
  const validTransitions: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.PENDING]: [
      OrderStatus.CONFIRMED,
      OrderStatus.PROCESSING,
      OrderStatus.PENDING_ODOO,
      OrderStatus.SHIPPED,
      OrderStatus.CANCELLED,
    ],
    [OrderStatus.PENDING_ODOO]: [
      OrderStatus.CONFIRMED,
      OrderStatus.PROCESSING,
      OrderStatus.CANCELLED,
    ],
    [OrderStatus.CONFIRMED]: [
      OrderStatus.PROCESSING,
      OrderStatus.SHIPPED,
      OrderStatus.DELIVERED,
      OrderStatus.CANCELLED,
    ],
    [OrderStatus.PROCESSING]: [
      OrderStatus.CONFIRMED,
      OrderStatus.SHIPPED,
      OrderStatus.DELIVERED,
      OrderStatus.CANCELLED,
    ],
    [OrderStatus.SHIPPED]: [
      OrderStatus.DELIVERED,
      OrderStatus.CANCELLED,
    ],
    [OrderStatus.DELIVERED]: [
      OrderStatus.REFUNDED,
    ],
    [OrderStatus.CANCELLED]: [], // Final state
    [OrderStatus.REFUNDED]: [], // Final state
    [OrderStatus.FAILED]: [
      OrderStatus.PENDING,
      OrderStatus.CANCELLED,
    ],
  };

  const allowed = validTransitions[currentStatus] || [];

  if (!allowed.includes(newStatus)) {
    throw new Error(`Cannot transition from ${currentStatus} to ${newStatus}`);
  }
}

// ─── Export orders as CSV ─────────────────────────────────────────────────────
export const exportOrdersCSV = async (filters: OrderFilters): Promise<string> => {
  const query: any = {};
  if (filters.status)        query.status        = filters.status;
  if (filters.paymentStatus) query.paymentStatus = filters.paymentStatus;
  if (filters.userId)        query.userId        = filters.userId;
  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) query.createdAt.$gte = filters.startDate;
    if (filters.endDate)   query.createdAt.$lte = filters.endDate;
  }

  const orders = await Order.find(query)
    .sort({ createdAt: -1 })
    .limit(5000) // safety cap
    .populate('userId', 'firstName lastName email phone')
    .lean();

  // Build CSV
  const header = [
    'Order Number', 'Date', 'Status', 'Payment Status', 'Payment Method',
    'Customer Name', 'Customer Email', 'Customer Phone',
    'City', 'Governorate',
    'Subtotal', 'Shipping', 'Tax', 'Coupon Code', 'Coupon Discount', 'Total',
    'Items Count', 'Tracking Number',
  ].join(',');

  const rows = orders.map((o: any) => {
    const user       = o.userId || {};
    const name       = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    const date       = new Date(o.createdAt).toISOString().split('T')[0];
    const itemsCount = o.items?.length ?? 0;

    return [
      o.orderNumber,
      date,
      o.status,
      o.paymentStatus,
      o.paymentMethod,
      `"${name}"`,
      user.email || '',
      user.phone || '',
      o.shippingAddress?.city || '',
      o.shippingAddress?.governorate || '',
      o.subtotal ?? 0,
      o.shippingCost ?? 0,
      o.tax ?? 0,
      o.couponCode || '',
      o.couponDiscount ?? 0,
      o.total ?? 0,
      itemsCount,
      o.trackingNumber || '',
    ].join(',');
  });

  return [header, ...rows].join('\n');
};

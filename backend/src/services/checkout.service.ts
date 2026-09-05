import mongoose from 'mongoose';
import { Order, IOrder, OrderStatus, PaymentMethod, PaymentStatus } from '../models/Order';
import { Cart } from '../models/Cart';
import { Product } from '../models/Product';
import { User } from '../models/User';
import { IdempotencyKey } from '../models/IdempotencyKey';
import { OutboxEvent } from '../models/OutboxEvent';
import { applyCoupon, recordCouponUsage } from './coupon.service';
import crypto from 'crypto';

interface CheckoutInput {
  userId: string;
  cartId: string;
  shippingAddress: {
    recipientName: string;
    phone: string;
    streetAddress: string;
    city: string;
    governorate: string;
    postalCode?: string;
  };
  paymentMethod: PaymentMethod;
  couponCode?:   string;   // optional coupon
  notes?: string;
  idempotencyKey: string;
}

interface CheckoutResult {
  order: IOrder;
  fromCache: boolean;
}

/**
 * Process checkout with atomic inventory reservation
 * Implements: Idempotency, Atomic Inventory, Outbox Pattern
 */
export const processCheckout = async (
  input: CheckoutInput
): Promise<CheckoutResult> => {
  const requestHash = generateRequestHash(input);

  // Check idempotency - return cached result if exists
  const existingKey = await IdempotencyKey.findOne({
    key: input.idempotencyKey,
    userId: input.userId,
  });

  if (existingKey) {
    if (existingKey.requestHash !== requestHash) {
      throw new Error('Idempotency key reused with different parameters');
    }

    // Try to return cached order
    const cachedOrderId = (existingKey as any).result?.orderId;
    if (cachedOrderId) {
      const order = await Order.findById(cachedOrderId);
      if (order) {
        return { order, fromCache: true };
      }
    }
  }

  // Start MongoDB session for transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Get and validate cart
    const cart = await Cart.findById(input.cartId).session(session);
    if (!cart || cart.items.length === 0) {
      throw new Error('Cart is empty or not found');
    }

    if (cart.userId?.toString() !== input.userId) {
      throw new Error('Cart does not belong to user');
    }

    // 2. Prepare order items and validate/reserve inventory atomically
    const orderItems: any[] = [];
    let subtotal = 0;

    for (const cartItem of cart.items) {
      const product = await Product.findById(cartItem.product).session(session);
      
      if (!product) {
        throw new Error(`Product ${cartItem.product} not found`);
      }

      // Check stock availability
      if (product.inventory.availableQuantity < cartItem.quantity) {
        throw new Error(
          `Insufficient stock for ${product.nameEn}. Available: ${product.inventory.availableQuantity}`
        );
      }

      // ATOMIC: Reserve inventory (increment reservedQuantity)
      const updateResult = await Product.updateOne(
        {
          _id: product._id,
          'inventory.availableQuantity': { $gte: cartItem.quantity },
        },
        {
          $inc: { 'inventory.reservedQuantity': cartItem.quantity },
        }
      ).session(session);

      if (updateResult.modifiedCount === 0) {
        throw new Error(
          `Failed to reserve inventory for ${product.nameEn}. Stock may have changed.`
        );
      }

      const itemSubtotal = product.price * cartItem.quantity;
      subtotal += itemSubtotal;

      orderItems.push({
        product:  product._id,
        quantity: cartItem.quantity,
        price:    product.price,
        subtotal: itemSubtotal,
        inventoryReserved: true,
        reservedAt: new Date(),
        productSnapshot: {
          sku:    product.sku,
          nameAr: product.nameAr,
          nameEn: product.nameEn,
          price:  product.price,
          image:  product.images?.[0]?.url,
        },
      });
    }

    // 3. Calculate totals
    const shipping = calculateShipping(input.shippingAddress.governorate, subtotal);
    const tax = calculateTax(subtotal);

    // 4. Apply coupon (if provided) — validated OUTSIDE session for speed
    let couponDiscount = 0;
    let couponCode: string | undefined;

    if (input.couponCode) {
      try {
        const productIds = orderItems.map((i: any) => i.product.toString());
        const couponResult = await applyCoupon({
          code:       input.couponCode,
          userId:     input.userId,
          cartTotal:  subtotal,
          productIds,
        });
        couponDiscount = couponResult.discountAmount;
        couponCode     = couponResult.coupon.code;
      } catch (err) {
        // Coupon validation failed — abort transaction and surface the error
        throw err;
      }
    }

    const total = Math.max(0, subtotal + shipping + tax - couponDiscount);

    // 5. Create order
    const orderNumber = await generateOrderNumber();

    // Map shippingAddress to Order schema format
    const [firstName, ...lastNameParts] = (input.shippingAddress.recipientName || '').split(' ');
    const lastName = lastNameParts.join(' ') || firstName;

    // Fetch user email for shippingAddress
    const user = await User.findById(input.userId).select('email');
    const userEmail = user?.email || '';
    
    const order = new Order({
      orderNumber,
      userId: input.userId,
      items: orderItems,
      subtotal,
      shippingCost: shipping,
      tax,
      discount: 0,
      couponCode,
      couponDiscount,
      total,
      status: OrderStatus.PENDING,
      paymentMethod: input.paymentMethod,
      paymentStatus:
        input.paymentMethod === PaymentMethod.CASH_ON_DELIVERY
          ? PaymentStatus.PENDING
          : PaymentStatus.PENDING,
      shippingAddress: {
        firstName: firstName || 'Customer',
        lastName:  lastName  || 'Name',
        phone:     input.shippingAddress.phone,
        email:     userEmail,
        addressLine1: input.shippingAddress.streetAddress,
        city:         input.shippingAddress.city,
        governorate:  input.shippingAddress.governorate,
        postalCode:   input.shippingAddress.postalCode,
        country:      'Egypt',
      },
      customerNotes: input.notes,
    });

    await order.save({ session });

    // 6. Create outbox events
    await createOutboxEvents(order, session);

    // 7. Store idempotency key
    await IdempotencyKey.create(
      [
        {
          key:              input.idempotencyKey,
          userId:           input.userId,
          requestHash,
          status:           'completed',
          processingTimeout: new Date(),
          result:           { orderId: order._id },
        },
      ],
      { session }
    );

    // 8. Clear cart
    cart.items = [];
    await cart.save({ session });

    // Commit transaction
    await session.commitTransaction();

    // 9. Record coupon usage AFTER commit (non-critical, outside transaction)
    if (couponCode && couponDiscount > 0) {
      try {
        const { Coupon } = await import('../models/Coupon');
        const couponDoc  = await Coupon.findOne({ code: couponCode });
        if (couponDoc) {
          await recordCouponUsage({
            couponId: couponDoc._id.toString(),
            userId:   input.userId,
            orderId:  order._id.toString(),
            discount: couponDiscount,
          });
        }
      } catch (_err) {
        // Non-critical — order already committed
      }
    }

    return { order, fromCache: false };
  } catch (error) {
    // Rollback transaction on error
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Cancel order and release inventory
 */
export const cancelOrder = async (orderId: string, reason: string): Promise<IOrder> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(orderId).session(session);
    
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.DELIVERED) {
      throw new Error(`Cannot cancel order with status: ${order.status}`);
    }

    // Release inventory atomically
    for (const item of order.items) {
      await Product.updateOne(
        { _id: item.product },
        { $inc: { 'inventory.reservedQuantity': -item.quantity } }
      ).session(session);
    }

    // Update order status
    order.status = OrderStatus.CANCELLED;
    order.internalNotes = reason;
    order.cancelledAt = new Date();

    await order.save({ session });

    // Create outbox event
    await OutboxEvent.create(
      [
        {
          aggregateType: 'Order',
          aggregateId: order._id,
          eventType: 'OrderCancelled',
          payload: { orderId: order._id, reason },
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
 * Confirm order delivery and deduct inventory
 */
export const confirmDelivery = async (orderId: string): Promise<IOrder> => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(orderId).session(session);
    
    if (!order) {
      throw new Error('Order not found');
    }

    if (order.status !== OrderStatus.SHIPPED) {
      throw new Error('Only shipped orders can be marked as delivered');
    }

    // Deduct inventory atomically (from onHandQuantity and reservedQuantity)
    for (const item of order.items) {
      const updateResult = await Product.updateOne(
        {
          _id: item.product,
          'inventory.onHandQuantity': { $gte: item.quantity },
          'inventory.reservedQuantity': { $gte: item.quantity },
        },
        {
          $inc: {
            'inventory.onHandQuantity': -item.quantity,
            'inventory.reservedQuantity': -item.quantity,
          },
        }
      ).session(session);

      if (updateResult.modifiedCount === 0) {
        throw new Error('Failed to deduct inventory. Insufficient stock.');
      }
    }

    // Update order
    order.status = OrderStatus.DELIVERED;
    order.deliveredAt = new Date();
    order.paymentStatus = PaymentStatus.PAID;

    await order.save({ session });

    // Create outbox event
    await OutboxEvent.create(
      [
        {
          aggregateType: 'Order',
          aggregateId: order._id,
          eventType: 'OrderDelivered',
          payload: { orderId: order._id },
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

// Helper functions

function generateRequestHash(input: CheckoutInput): string {
  const normalized = JSON.stringify({
    userId: input.userId,
    cartId: input.cartId,
    shippingAddress: input.shippingAddress,
    paymentMethod: input.paymentMethod,
  });
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

async function generateOrderNumber(): Promise<string> {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  const prefix = `RWQ${year}${month}${day}`;
  
  // Get today's order count
  const count = await Order.countDocuments({
    orderNumber: { $regex: `^${prefix}` },
  });
  
  const sequence = String(count + 1).padStart(4, '0');
  return `${prefix}${sequence}`;
}

function calculateShipping(governorate: string, subtotal: number): number {
  // Free shipping over 1000 EGP
  if (subtotal >= 1000) return 0;
  
  // Cairo/Giza: 50 EGP, other: 75 EGP
  const cairoCities = ['Cairo', 'Giza', 'القاهرة', 'الجيزة'];
  return cairoCities.includes(governorate) ? 50 : 75;
}

function calculateTax(subtotal: number): number {
  // 14% VAT
  return Math.round(subtotal * 0.14 * 100) / 100;
}

async function createOutboxEvents(order: IOrder, session: mongoose.ClientSession): Promise<void> {
  const events = [
    {
      aggregateType: 'Order',
      aggregateId: order._id,
      eventType: 'OrderCreated',
      payload: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        userId: order.userId,
        total: order.total,
      },
    },
  ];

  await OutboxEvent.create(events, { session });
}

/**
 * checkout.service.ts — PostgreSQL/Prisma implementation
 *
 * CONCURRENCY SAFETY:
 * Inventory reservation uses `productRepository.reserveStock()` which executes:
 *   UPDATE inventories
 *   SET reservedQuantity += qty, availableQuantity -= qty
 *   WHERE productId = ? AND availableQuantity >= qty
 * This single UPDATE is atomic in PostgreSQL — no separate SELECT/UPDATE race.
 * The entire checkout (inventory reservation + order creation + idempotency +
 * cart clear) runs inside ONE prisma.$transaction(), so either everything
 * commits or everything rolls back. Two concurrent requests against the same
 * final unit of stock: exactly one will get modifiedCount=1, the other will
 * get modifiedCount=0 and throw "Insufficient stock".
 */

import crypto from 'crypto';
import { Prisma, OrderStatus, PaymentMethod, PaymentStatus } from '../generated/prisma/client';
import { orderRepository }   from '../repositories/order.repository';
import { productRepository } from '../repositories/product.repository';
import { cartRepository }    from '../repositories/cart.repository';
import { outboxRepository }  from '../repositories/outbox.repository';
import { prisma }            from '../lib/prisma';
import { applyCoupon, recordCouponUsage } from './coupon.service';
import { invalidateProductsCache }        from './product.service';

// ─── Interfaces (identical to Mongoose version) ───────────────────────────────

interface CheckoutInput {
  userId:  string;
  cartId:  string;
  shippingAddress: {
    recipientName: string;
    phone:         string;
    streetAddress: string;
    city:          string;
    governorate:   string;
    postalCode?:   string;
  };
  paymentMethod:  PaymentMethod;
  couponCode?:    string;
  notes?:         string;
  idempotencyKey: string;
}

interface CheckoutResult {
  order:     any;
  fromCache: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateRequestHash(input: CheckoutInput): string {
  const normalized = JSON.stringify({
    userId:          input.userId,
    cartId:          input.cartId,
    shippingAddress: input.shippingAddress,
    paymentMethod:   input.paymentMethod,
  });
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

async function generateOrderNumber(): Promise<string> {
  const d      = new Date();
  const prefix = `RWQ${d.getFullYear()}${String(d.getMonth() + 1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;

  // Count today's orders then loop to find first unused sequence
  const count    = await prisma.order.count({ where: { orderNumber: { startsWith: prefix } } });
  let attempt    = count + 1;
  const MAX      = 200;

  for (let i = 0; i < MAX; i++) {
    const candidate = `${prefix}${String(attempt).padStart(4, '0')}`;
    const exists    = await prisma.order.findUnique({ where: { orderNumber: candidate }, select: { id: true } });
    if (!exists) return candidate;
    attempt++;
  }
  // Fallback with timestamp suffix (should never reach this in normal operation)
  return `${prefix}${Date.now().toString().slice(-6)}`;
}

export function calculateShipping(governorate: string, subtotal: number): number {
  if (subtotal >= 1000) return 0;
  const cairoSlugs = ['cairo', 'giza', 'القاهرة', 'الجيزة', 'Cairo', 'Giza'];
  return cairoSlugs.includes(governorate) ? 50 : 75;
}

export function calculateTax(subtotal: number): number {
  return Math.round(subtotal * 0.14 * 100) / 100;
}

function toDecimal(v: number): Prisma.Decimal {
  return new Prisma.Decimal(v.toFixed(2));
}

const normaliseOrder = (o: any): any => {
  if (!o) return o;
  return {
    ...o,
    _id:           o.id,
    subtotal:      Number(o.subtotal ?? 0),
    shippingCost:  Number(o.shippingCost ?? 0),
    discount:      Number(o.discount ?? 0),
    tax:           Number(o.tax ?? 0),
    total:         Number(o.total ?? 0),
    couponDiscount: o.couponDiscount != null ? Number(o.couponDiscount) : undefined,
    // Map flat shippingXxx fields → shippingAddress object for API compat
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
    items: (o.items ?? []).map((item: any) => ({
      ...item,
      price:     Number(item.price    ?? 0),
      subtotal:  Number(item.subtotal ?? 0),
      snapshotPrice: Number(item.snapshotPrice ?? 0),
      // Backward-compatible productSnapshot field
      productSnapshot: {
        sku:    item.snapshotSku,
        nameAr: item.snapshotNameAr,
        nameEn: item.snapshotNameEn,
        price:  Number(item.snapshotPrice ?? 0),
        image:  item.snapshotImage ?? null,
      },
    })),
  };
};

// ─── processCheckout ──────────────────────────────────────────────────────────
export const processCheckout = async (input: CheckoutInput): Promise<CheckoutResult> => {
  const requestHash = generateRequestHash(input);

  // ── Idempotency check ──────────────────────────────────────────────────────
  const existingKey = await orderRepository.findIdempotencyKey(input.idempotencyKey);
  if (existingKey) {
    if (existingKey.requestHash !== requestHash) {
      throw new Error('Idempotency key reused with different parameters');
    }
    const cachedOrderId = (existingKey.result as any)?.orderId;
    if (cachedOrderId) {
      const cached = await orderRepository.findById(cachedOrderId);
      if (cached) return { order: normaliseOrder(cached), fromCache: true };
    }
  }

  // ── Load and validate cart ─────────────────────────────────────────────────
  // Always look up by the provided cartId — this is the canonical lookup.
  // findByUserId is a secondary fallback only when no cartId is provided.
  let cart: any = await cartRepository.findById(input.cartId);
  if (!cart || cart.items.length === 0) {
    // Fallback: try finding by userId if cartId lookup fails
    const userCart = await cartRepository.findByUserId(input.userId);
    if (!userCart || userCart.items.length === 0) throw new Error('Cart is empty or not found');
    cart = userCart;
  }
  // Ownership check: cart must belong to the requesting user (or have no user — guest cart passed to checkout)
  if (cart.userId && cart.userId !== input.userId) {
    throw new Error('Cart does not belong to user');
  }

  // ── Coupon validation (outside transaction — faster) ──────────────────────
  let couponDiscount = 0;
  let couponCode: string | undefined;
  let resolvedCouponId: string | undefined;

  if (input.couponCode) {
    // Need product IDs from cart items (they are PG UUIDs here)
    const productIds = cart.items.map((i: any) => i.productId as string);
    const subtotalForCoupon = cart.items.reduce(
      (s: number, i: any) => s + Number(i.price) * i.quantity, 0
    );
    const couponResult = await applyCoupon({
      code:       input.couponCode,
      userId:     input.userId,
      cartTotal:  subtotalForCoupon,
      productIds,
    });
    couponDiscount = couponResult.discountAmount;
    couponCode     = couponResult.coupon.code;
    resolvedCouponId = couponResult.coupon.id;
  }

  // ── Atomic transaction: inventory reservation + order creation ─────────────
  //
  // CONCURRENCY GUARANTEE:
  // productRepository.reserveStock() runs:
  //   UPDATE inventories
  //   SET reservedQuantity += qty, availableQuantity -= qty
  //   WHERE productId = ? AND availableQuantity >= qty
  // If two simultaneous requests target the same last unit, only one UPDATE
  // will match the WHERE clause (the other will find availableQuantity = 0).
  // The failing request gets count=0 and throws before creating an order.
  // All this is wrapped in prisma.$transaction() for full rollback on any error.

  const result = await prisma.$transaction(async (tx) => {
    // Re-read cart inside transaction using direct Prisma (no session concept needed)
    const txCart = await tx.cart.findUnique({
      where: { id: (cart as any).id },
      include: { items: { include: { product: { include: { inventory: true } } } } },
    });
    if (!txCart || txCart.items.length === 0) throw new Error('Cart is empty or not found');

    // Reserve inventory for each item atomically
    const orderItems: any[] = [];
    let subtotal = 0;

    for (const cartItem of txCart.items) {
      const prod = cartItem.product as any;
      if (!prod) throw new Error(`Product ${cartItem.productId} not found`);

      const inv   = prod.inventory;
      const avail = inv?.availableQuantity ?? 0;

      if (avail < cartItem.quantity) {
        throw new Error(
          `Insufficient stock for ${prod.nameEn}. Available: ${avail}`
        );
      }

      // Atomic conditional update — if stock changed between read and update,
      // the WHERE availableQuantity >= qty won't match → count = 0 → throw
      const reserved = await productRepository.reserveStock(
        prod.id,
        cartItem.quantity,
        tx
      );
      if (!reserved) {
        throw new Error(
          `Failed to reserve inventory for ${prod.nameEn}. Stock may have changed.`
        );
      }

      const itemPrice    = Number(prod.price);
      const itemSubtotal = itemPrice * cartItem.quantity;
      subtotal          += itemSubtotal;

      orderItems.push({
        productId:         prod.id,
        quantity:          cartItem.quantity,
        price:             toDecimal(itemPrice),
        subtotal:          toDecimal(itemSubtotal),
        inventoryReserved: true,
        reservedAt:        new Date(),
        snapshotSku:       prod.sku,
        snapshotNameAr:    prod.nameAr,
        snapshotNameEn:    prod.nameEn,
        snapshotPrice:     toDecimal(itemPrice),
        snapshotImage:     prod.images?.[0]?.url ?? null,
      });
    }

    const shipping = calculateShipping(input.shippingAddress.governorate, subtotal);
    const tax      = calculateTax(subtotal);
    const total    = Math.max(0, subtotal + shipping + tax - couponDiscount);
    const orderNumber = await generateOrderNumber();

    // Parse recipient name
    const nameParts = (input.shippingAddress.recipientName || '').trim().split(/\s+/);
    const firstName = nameParts[0] ?? 'Customer';
    const lastName  = nameParts.slice(1).join(' ') || firstName;

    const order = await orderRepository.create(
      {
        orderNumber,
        userId:        input.userId,
        status:        OrderStatus.pending,
        paymentMethod: input.paymentMethod,
        paymentStatus: PaymentStatus.pending,
        subtotal:      toDecimal(subtotal),
        shippingCost:  toDecimal(shipping),
        tax:           toDecimal(tax),
        discount:      toDecimal(0),
        couponCode,
        couponDiscount: couponDiscount > 0 ? toDecimal(couponDiscount) : undefined,
        total:         toDecimal(total),
        customerNotes: input.notes,
        shippingRecipientName: `${firstName} ${lastName}`.trim(),
        shippingPhone:         input.shippingAddress.phone,
        shippingStreetAddress: input.shippingAddress.streetAddress,
        shippingCity:          input.shippingAddress.city,
        shippingGovernorate:   input.shippingAddress.governorate,
        shippingPostalCode:    input.shippingAddress.postalCode,
        items:                 orderItems,
      },
      tx
    );

    // Create outbox event inside transaction
    await outboxRepository.createEvent(
      {
        aggregateType: 'Order',
        aggregateId:   order.id,
        eventType:     'OrderCreated',
        payload:       { orderId: order.id, orderNumber, userId: input.userId, total },
      },
      tx
    );

    // Store idempotency key inside transaction
    await orderRepository.createIdempotencyKey(
      {
        key:               input.idempotencyKey,
        userId:            input.userId,
        requestHash,
        status:            'completed',
        processingTimeout: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
      tx
    );
    await orderRepository.updateIdempotencyKey(
      input.idempotencyKey,
      { status: 'completed', result: { orderId: order.id } },
      tx
    );

    // Clear cart
    await cartRepository.clearCart(txCart.id, tx);

    return order;
  }, {
    // 30s timeout accommodates Neon network latency under high concurrency
    // Default Prisma timeout is 5s which is too tight for 10+ concurrent checkouts
    timeout: 30_000,
    maxWait: 10_000,
  });

  // Update user's phone from shipping (non-critical, outside transaction)
  if (input.shippingAddress?.phone) {
    await prisma.user.update({
      where: { id: input.userId },
      data:  { phone: input.shippingAddress.phone },
    }).catch(() => {});
  }

  invalidateProductsCache();

  // Record coupon usage AFTER commit (non-critical)
  if (couponCode && couponDiscount > 0 && resolvedCouponId) {
    recordCouponUsage({
      couponId: resolvedCouponId,
      userId:   input.userId,
      orderId:  result.id,
      discount: couponDiscount,
    }).catch(() => {});
  }

  return { order: normaliseOrder(result), fromCache: false };
};

// ─── cancelOrder ──────────────────────────────────────────────────────────────
export const cancelOrder = async (orderId: string, reason: string): Promise<any> => {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new Error('Order not found');
    if (order.status === OrderStatus.cancelled || order.status === OrderStatus.delivered) {
      throw new Error(`Cannot cancel order with status: ${order.status}`);
    }

    // Release inventory for each reserved item (parallel — each is an atomic UPDATE)
    await Promise.all(
      order.items
        .filter((item) => item.productId && item.inventoryReserved)
        .map((item) => productRepository.releaseStock(item.productId!, item.quantity, tx))
    );

    const updated = await tx.order.update({
      where: { id: orderId },
      data:  {
        status:      OrderStatus.cancelled,
        cancelReason: reason,
        cancelledAt: new Date(),
      },
      include: { items: true },
    });

    await outboxRepository.createEvent(
      {
        aggregateType: 'Order',
        aggregateId:   orderId,
        eventType:     'OrderCancelled',
        payload:       { orderId, reason },
      },
      tx
    );

    return normaliseOrder(updated);
  });
};

// ─── confirmDelivery ──────────────────────────────────────────────────────────
export const confirmDelivery = async (orderId: string): Promise<any> => {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new Error('Order not found');
    if (order.status !== OrderStatus.shipped) {
      throw new Error('Only shipped orders can be marked as delivered');
    }

    // Deduct onHandQuantity and reservedQuantity atomically (parallel)
    await Promise.all(
      order.items
        .filter((item) => item.productId)
        .map((item) => productRepository.commitStock(item.productId!, item.quantity, tx))
    );

    const updated = await tx.order.update({
      where: { id: orderId },
      data:  {
        status:        OrderStatus.delivered,
        paymentStatus: PaymentStatus.paid,
      },
      include: { items: true },
    });

    await outboxRepository.createEvent(
      {
        aggregateType: 'Order',
        aggregateId:   orderId,
        eventType:     'OrderDelivered',
        payload:       { orderId },
      },
      tx
    );

    return normaliseOrder(updated);
  });
};

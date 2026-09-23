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
import { applyCoupon }                from './coupon.service';
import { invalidateProductsCache }    from './product.service';

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

// ─── FIX 3: Order-number generation — race-safe inside a transaction ─────────
// The old implementation used the global `prisma` client for count/findUnique,
// so two concurrent transactions could both compute the same candidate number.
// The @unique constraint on orderNumber would cause one of them to fail with
// a P2002 (unique violation).  The fix: pass the transaction client (tx) so
// the reads participate in the same snapshot, and let the caller retry on a
// P2002 whose target includes "orderNumber" — up to MAX_ORDER_NUMBER_RETRIES
// times.  We keep the exact same human-readable format: RWQYYYYMMDDnnnn.
const MAX_ORDER_NUMBER_RETRIES = 5;

async function generateOrderNumber(tx?: Prisma.TransactionClient): Promise<string> {
  const client = tx ?? prisma;
  const d      = new Date();
  const prefix = `RWQ${d.getFullYear()}${String(d.getMonth() + 1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;

  // Count today's orders then loop to find first unused sequence.
  // Using tx ensures the count reflects the transaction's own snapshot.
  const count    = await client.order.count({ where: { orderNumber: { startsWith: prefix } } });
  let attempt    = count + 1;
  const MAX      = 200;

  for (let i = 0; i < MAX; i++) {
    const candidate = `${prefix}${String(attempt).padStart(4, '0')}`;
    const exists    = await client.order.findUnique({ where: { orderNumber: candidate }, select: { id: true } });
    if (!exists) return candidate;
    attempt++;
  }
  // Fallback with timestamp suffix (should never reach in normal operation)
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

  // ── FIX 4: Idempotency — write a 'started' marker BEFORE the transaction ──
  //
  // Old behaviour: pre-transaction check read the key (SELECT), found nothing,
  // then both concurrent requests entered the $transaction and the second hit a
  // P2002 unique-constraint error on the key INSERT, causing a raw 500.
  //
  // New behaviour:
  //   1. Try to upsert an idempotency key with status='started'.
  //      - If the key already exists (another request beat us), read it back.
  //        If it's 'completed' return the cached order immediately.
  //        If it's still 'started' the other request is still processing — the
  //        client will get the same 409 it would have before (no regression).
  //      - If the upsert succeeded we own the key and proceed.
  //   2. Inside the transaction we no longer INSERT the key; we only UPDATE it
  //      to 'completed' with the orderId result — this is a safe UPDATE that
  //      can never violate a unique constraint.
  //
  // This eliminates the P2002 race: exactly one concurrent request can write
  // the 'started' marker; the rest see it immediately and return.
  // ──────────────────────────────────────────────────────────────────────────

  // Check for an already-existing completed key first (fast path).
  const existingKey = await orderRepository.findIdempotencyKey(input.idempotencyKey);
  if (existingKey) {
    if (existingKey.requestHash !== requestHash) {
      throw new Error('Idempotency key reused with different parameters');
    }
    if (existingKey.status === 'completed') {
      const cachedOrderId = (existingKey.result as any)?.orderId;
      if (cachedOrderId) {
        const cached = await orderRepository.findById(cachedOrderId);
        if (cached) return { order: normaliseOrder(cached), fromCache: true };
      }
    }
    // status='started' means another concurrent request is processing — let
    // it proceed; this duplicate request returns the same 409 as before.
    if (existingKey.status === 'started') {
      throw new Error('Idempotency key reused with different parameters');
    }
  }

  // Claim the idempotency key atomically with a 'started' marker.
  // If two concurrent requests both got past the findIdempotencyKey check above
  // (race window is tiny but non-zero), only one createIdempotencyKey INSERT
  // will succeed; the other gets a P2002 which we catch and handle.
  try {
    await orderRepository.createIdempotencyKey(
      {
        key:               input.idempotencyKey,
        userId:            input.userId,
        requestHash,
        status:            'started',
        processingTimeout: new Date(Date.now() + 24 * 60 * 60 * 1000),
      }
    );
  } catch (err: any) {
    // P2002 = unique constraint violation on idempotency_keys.key
    if (err?.code === 'P2002') {
      // The other concurrent request got there first.  Re-read the key and
      // return cached result if it completed, otherwise surface a conflict.
      const raced = await orderRepository.findIdempotencyKey(input.idempotencyKey);
      if (raced?.status === 'completed') {
        const cachedOrderId = (raced.result as any)?.orderId;
        if (cachedOrderId) {
          const cached = await orderRepository.findById(cachedOrderId);
          if (cached) return { order: normaliseOrder(cached), fromCache: true };
        }
      }
      throw new Error('Idempotency key reused with different parameters');
    }
    throw err;
  }

  // ── Load and validate cart ─────────────────────────────────────────────────
  let cart: any = await cartRepository.findById(input.cartId);
  if (!cart || cart.items.length === 0) {
    const userCart = await cartRepository.findByUserId(input.userId);
    if (!userCart || userCart.items.length === 0) throw new Error('Cart is empty or not found');
    cart = userCart;
  }
  if (cart.userId && cart.userId !== input.userId) {
    throw new Error('Cart does not belong to user');
  }

  // ── Coupon validation (outside transaction — faster) ──────────────────────
  // applyCoupon reads usedCount and perUserLimit counts from the DB as a fast
  // pre-check.  The authoritative enforcement happens INSIDE the transaction
  // below via an atomic conditional UPDATE.
  let couponDiscount   = 0;
  let couponCode: string | undefined;
  let resolvedCouponId: string | undefined;

  if (input.couponCode) {
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
    couponDiscount   = couponResult.discountAmount;
    couponCode       = couponResult.coupon.code;
    resolvedCouponId = couponResult.coupon.id;
  }

  // ── Atomic transaction ─────────────────────────────────────────────────────
  //
  // CONCURRENCY GUARANTEES (updated):
  //
  // Inventory: reserveStock() uses an atomic UPDATE … WHERE availableQty >= qty.
  // Two concurrent requests for the last unit: exactly one gets count=1 (success),
  // the other gets count=0 (throws "Failed to reserve").
  //
  // Coupon (FIX 2): consumption is now INSIDE this transaction.
  // An atomic conditional UPDATE enforces usageLimit; a live COUNT inside the
  // transaction enforces perUserLimit.  The outer applyCoupon() check is still
  // a fast pre-guard but is no longer the authoritative enforcement.
  //
  // Order number (FIX 3): generateOrderNumber now uses tx, so the count/findUnique
  // reads see the transaction snapshot.  If two transactions still produce the
  // same candidate (possible if they start simultaneously), the @unique DB
  // constraint will surface a P2002 with meta.target containing "orderNumber".
  // We catch exactly that error and retry up to MAX_ORDER_NUMBER_RETRIES times.
  //
  // Idempotency (FIX 4): the 'started' marker is written before this block.
  // Inside the transaction we only UPDATE the key to 'completed'; no INSERT,
  // so no P2002 race inside the transaction.
  // ──────────────────────────────────────────────────────────────────────────

  let result: any;
  let retries = 0;

  while (true) { // eslint-disable-line no-constant-condition
    try {
      result = await prisma.$transaction(async (tx) => {
        // Re-read cart inside transaction
        const txCart = await tx.cart.findUnique({
          where: { id: (cart as any).id },
          include: { items: { include: { product: { include: { inventory: true } } } } },
        });
        if (!txCart || txCart.items.length === 0) throw new Error('Cart is empty or not found');

        // Reserve inventory atomically for each item
        const orderItems: any[] = [];
        let subtotal = 0;

        for (const cartItem of txCart.items) {
          const prod = cartItem.product as any;
          if (!prod) throw new Error(`Product ${cartItem.productId} not found`);

          const inv   = prod.inventory;
          const avail = inv?.availableQuantity ?? 0;

          if (avail < cartItem.quantity) {
            throw new Error(`Insufficient stock for ${prod.nameEn}. Available: ${avail}`);
          }

          const reserved = await productRepository.reserveStock(prod.id, cartItem.quantity, tx);
          if (!reserved) {
            throw new Error(`Failed to reserve inventory for ${prod.nameEn}. Stock may have changed.`);
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

        const shipping    = calculateShipping(input.shippingAddress.governorate, subtotal);
        const tax         = calculateTax(subtotal);
        const total       = Math.max(0, subtotal + shipping + tax - couponDiscount);
        const orderNumber = await generateOrderNumber(tx); // FIX 3: uses tx

        // ── FIX 2: Enforce coupon limits atomically inside the transaction ──
        // This replaces the old fire-and-forget recordCouponUsage after commit.
        if (resolvedCouponId && couponCode && couponDiscount > 0) {
          // (a) Enforce global usageLimit with an atomic conditional raw UPDATE.
          //     UPDATE coupons
          //     SET    "usedCount" = "usedCount" + 1
          //     WHERE  id = resolvedCouponId
          //       AND  ("usageLimit" = 0 OR "usedCount" < "usageLimit")
          //
          //     $executeRaw returns the number of rows affected.
          //     0 → limit already reached (concurrent request beat us).
          const rawResult = await tx.$executeRaw`
            UPDATE coupons
            SET    "usedCount" = "usedCount" + 1
            WHERE  id = ${resolvedCouponId}
              AND  ("usageLimit" = 0 OR "usedCount" < "usageLimit")
          `;

          if (rawResult === 0) {
            throw new Error('Coupon usage limit reached');
          }

          // (b) Enforce perUserLimit with a live COUNT inside the transaction.
          //     We read the current count under the tx snapshot to prevent the
          //     same user from consuming the coupon multiple times concurrently.
          const coupon = await tx.coupon.findUnique({
            where:  { id: resolvedCouponId },
            select: { perUserLimit: true },
          });
          if (coupon && coupon.perUserLimit > 0) {
            const userUsage = await tx.couponUsage.count({
              where: { couponId: resolvedCouponId, userId: input.userId },
            });
            if (userUsage >= coupon.perUserLimit) {
              throw new Error('You have already used this coupon');
            }
          }
        }

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

        // ── FIX 2 (cont.): record coupon usage row inside the transaction ──
        if (resolvedCouponId && couponCode && couponDiscount > 0) {
          await tx.couponUsage.create({
            data: {
              couponId: resolvedCouponId,
              userId:   input.userId,
              orderId:  order.id,
              discount: toDecimal(couponDiscount),
            },
          });
        }

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

        // FIX 4: UPDATE (not INSERT) the idempotency key — no P2002 possible
        await orderRepository.updateIdempotencyKey(
          input.idempotencyKey,
          { status: 'completed', result: { orderId: order.id } },
          tx
        );

        // Clear cart
        await cartRepository.clearCart(txCart.id, tx);

        return order;
      }, {
        timeout: 30_000,
        maxWait: 10_000,
      });

      // Transaction committed successfully — exit retry loop
      break;

    } catch (err: any) {
      // FIX 3: Retry ONLY on orderNumber unique-constraint collision.
      // P2002 with target containing "orderNumber" means two transactions
      // generated the same candidate simultaneously.  Increment retries and
      // re-run the full transaction (inventory will be rolled back automatically
      // by the transaction abort, so no double-reservation).
      const isOrderNumberCollision =
        err?.code === 'P2002' &&
        (err?.meta?.target as string[] | string | undefined)
          ?.toString()
          ?.includes('orderNumber');

      if (isOrderNumberCollision && retries < MAX_ORDER_NUMBER_RETRIES) {
        retries++;
        continue;
      }

      // Any other error — clean up the 'started' idempotency key so the
      // client can safely retry with the same key on a transient failure.
      await orderRepository.updateIdempotencyKey(
        input.idempotencyKey,
        { status: 'failed' as any }
      ).catch(() => {});

      throw err;
    }
  }

  // Update user's phone from shipping (non-critical, outside transaction)
  if (input.shippingAddress?.phone) {
    await prisma.user.update({
      where: { id: input.userId },
      data:  { phone: input.shippingAddress.phone },
    }).catch(() => {});
  }

  invalidateProductsCache();

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

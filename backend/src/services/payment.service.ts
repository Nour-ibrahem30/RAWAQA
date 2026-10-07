/**
 * payment.service.ts — Payment Lifecycle Management
 * 
 * Handles:
 * - Payment attempt creation
 * - Payment session creation flow
 * - Webhook processing with idempotency
 * - State machine transitions
 * - Stock operations coordination
 * 
 * CONCURRENCY SAFETY:
 * All webhook processing uses FOR UPDATE row locking to serialize concurrent
 * events for the same payment. The state machine is monotonic - once a payment
 * reaches a terminal state (paid, failed, expired), it cannot regress.
 */

import { Prisma, PaymentStatus, Payment, Order } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';
import { productRepository } from '../repositories/product.repository';
import { outboxRepository } from '../repositories/outbox.repository';
import { env } from '../config/env';
import { logInfo, logError, logWarn } from '../config/logger';
import {
  createPaymentSession as kashierCreateSession,
  computeWebhookFingerprint,
  KashierWebhookPayload,
  CreateSessionResponse,
} from './kashier.service';

// ─── Status Ordering (Monotonic State Machine) ─────────────────────────────────

/**
 * Status order for monotonic state machine.
 * Higher order = more advanced state.
 * Terminal states: paid (100), failed (90), expired (90)
 * Post-success states: refunded (110), voided (110)
 */
const STATUS_ORDER: Record<PaymentStatus, number> = {
  pending: 1,
  failed: 90,
  expired: 90,
  paid: 100,
  refunded: 110,
  voided: 110,
};

/**
 * Check if a status transition is allowed.
 * Rules:
 * 1. Forward transitions: newOrder > currentOrder
 * 2. refunded/voided can only follow paid
 */
function validateTransition(
  currentStatus: PaymentStatus,
  newStatus: PaymentStatus
): { allowed: boolean; reason: string } {
  const currentOrder = STATUS_ORDER[currentStatus];
  const newOrder = STATUS_ORDER[newStatus];

  // Special case: refunded/voided only from paid
  if (newStatus === 'refunded' || newStatus === 'voided') {
    if (currentStatus === 'paid') {
      return { allowed: true, reason: 'ok' };
    }
    return { allowed: false, reason: 'conflict' };
  }

  // Forward transitions only
  if (newOrder > currentOrder) {
    return { allowed: true, reason: 'ok' };
  }

  // Same status = no change needed
  if (newOrder === currentOrder) {
    return { allowed: false, reason: 'no_change' };
  }

  // Attempting to go backward
  return { allowed: false, reason: 'stale' };
}

/**
 * Map Kashier payment status to our PaymentStatus enum.
 */
function mapKashierStatusToPaymentStatus(kashierStatus: string): PaymentStatus | null {
  const status = kashierStatus.toUpperCase();
  switch (status) {
    case 'SUCCESS':
    case 'CAPTURED':
      return 'paid';
    case 'FAILURE':
    case 'FAILED':
    case 'DECLINED':
      return 'failed';
    case 'EXPIRED':
      return 'expired';
    case 'REFUND':
    case 'REFUNDED':
      return 'refunded';
    case 'VOID':
    case 'VOIDED':
      return 'voided';
    case 'PENDING':
      return 'pending';
    default:
      return null;
  }
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface CreatePaymentAttemptResult {
  payment: Payment;
  isExisting: boolean;
}

export interface PaymentSessionResult {
  paymentId: string;
  paymentUrl: string;
  kashierOrderId: string;
}

export interface WebhookResult {
  status: 'processed' | 'duplicate' | 'no_change' | 'stale' | 'conflict' | 'not_found' | 'invalid';
  httpCode: number;
  message?: string;
}

// ─── Payment Attempt Creation ──────────────────────────────────────────────────

/**
 * Create a new payment attempt for an order.
 * 
 * Validations:
 * - Order must exist and belong to the user
 * - Order must not already be paid
 * - Order must not be cancelled
 * - No active pending payment exists
 * - Max attempts not exceeded
 */
export async function createPaymentAttempt(
  orderId: string,
  userId: string
): Promise<CreatePaymentAttemptResult> {
  const maxAttempts = env.MAX_PAYMENT_ATTEMPTS || 5;

  return prisma.$transaction(async (tx) => {
    // 1. Validate order
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new PaymentError('Order not found', 'NOT_FOUND');
    }

    if (order.userId !== userId) {
      throw new PaymentError('Not authorized to access this order', 'FORBIDDEN');
    }

    if (order.paymentStatus === 'paid') {
      throw new PaymentError('Order already paid', 'ALREADY_PAID');
    }

    if (order.status === 'cancelled') {
      throw new PaymentError('Cannot create payment for cancelled order', 'ORDER_CANCELLED');
    }

    // 2. Check for existing active payment
    const activePayment = await tx.payment.findFirst({
      where: { orderId, status: 'pending' },
    });

    if (activePayment && activePayment.kashierSessionId) {
      // Return existing payment with session
      return { payment: activePayment, isExisting: true };
    }

    // 3. Count attempts and enforce limit
    const attemptCount = await tx.payment.count({ where: { orderId } });
    const attemptNumber = attemptCount + 1;

    if (attemptNumber > maxAttempts) {
      throw new PaymentError(
        `Maximum payment attempts (${maxAttempts}) exceeded`,
        'MAX_ATTEMPTS_EXCEEDED'
      );
    }

    // 4. Generate unique Kashier order ID
    const kashierOrderId = `${order.orderNumber}-${attemptNumber}`;

    // 5. Create payment record
    const payment = await tx.payment.create({
      data: {
        orderId,
        attemptNumber,
        status: 'pending',
        method: 'kashier',
        amount: order.total,
        kashierOrderId,
      },
    });

    logInfo('Payment attempt created', {
      paymentId: payment.id,
      orderId,
      attemptNumber,
      kashierOrderId,
    });

    return { payment, isExisting: false };
  }, { timeout: 15000 });
}

/**
 * Create a payment session with Kashier.
 * This is called after creating the payment attempt.
 */
export async function createPaymentSessionForOrder(
  orderId: string,
  userId: string
): Promise<PaymentSessionResult> {
  // 1. Create or get existing payment attempt
  const { payment, isExisting } = await createPaymentAttempt(orderId, userId);

  // If existing payment already has a session, return it
  if (isExisting && payment.kashierSessionId) {
    const paymentUrl = `https://test-checkout.kashier.io/?sessionId=${payment.kashierSessionId}`;
    return {
      paymentId: payment.id,
      paymentUrl,
      kashierOrderId: payment.kashierOrderId,
    };
  }

  // 2. Get order details for Kashier
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true },
  });

  if (!order) {
    throw new PaymentError('Order not found', 'NOT_FOUND');
  }

  // 3. Build URLs
  const clientUrl = env.CLIENT_URL || 'http://localhost:3000';
  const serverUrl = env.SERVER_URL || 'http://localhost:4000';
  const successUrl = `${clientUrl}/checkout/success?orderId=${orderId}`;
  const failureUrl = `${clientUrl}/checkout/failure?orderId=${orderId}`;
  const webhookUrl = `${serverUrl}/api/webhooks/kashier`;

  // 4. Call Kashier API
  let kashierResponse: CreateSessionResponse;
  try {
    kashierResponse = await kashierCreateSession({
      merchantOrderId: payment.kashierOrderId,
      amount: Number(order.total),
      currency: 'EGP',
      customerEmail: order.user?.email,
      customerPhone: order.shippingPhone || undefined,
      customerName: order.shippingRecipientName || undefined,
      successUrl,
      failureUrl,
      webhookUrl,
      description: `RAWAQA Order ${order.orderNumber}`,
    });
  } catch (err) {
    // Mark payment as failed on Kashier API error
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'failed', failedAt: new Date() },
    });

    logError('Kashier session creation failed', err, {
      paymentId: payment.id,
      orderId,
    });

    throw new PaymentError(
      `Failed to create payment session: ${(err as Error).message}`,
      'KASHIER_API_ERROR'
    );
  }

  // 5. Update payment with session ID
  await prisma.payment.update({
    where: { id: payment.id },
    data: { kashierSessionId: kashierResponse.sessionId },
  });

  logInfo('Payment session created', {
    paymentId: payment.id,
    sessionId: kashierResponse.sessionId,
    kashierOrderId: payment.kashierOrderId,
  });

  return {
    paymentId: payment.id,
    paymentUrl: kashierResponse.paymentUrl,
    kashierOrderId: payment.kashierOrderId,
  };
}

// ─── Webhook Processing ────────────────────────────────────────────────────────

/**
 * Process a Kashier webhook event.
 * 
 * Idempotency:
 * - Fingerprint-based exact duplicate detection
 * - Monotonic state machine prevents stale updates
 * - FOR UPDATE locking serializes concurrent webhooks
 * 
 * @returns WebhookResult with status and HTTP code
 */
export async function processWebhook(
  event: KashierWebhookPayload
): Promise<WebhookResult> {
  const { merchantOrderId, transactionId, paymentStatus, amount } = event;

  // Map Kashier status to our enum
  const newStatus = mapKashierStatusToPaymentStatus(paymentStatus);
  if (!newStatus) {
    logWarn('Unknown Kashier payment status', { paymentStatus, merchantOrderId });
    return { status: 'invalid', httpCode: 200, message: `Unknown status: ${paymentStatus}` };
  }

  // Compute fingerprint for idempotency
  const fingerprint = computeWebhookFingerprint(
    merchantOrderId,
    transactionId,
    paymentStatus,
    amount
  );

  return prisma.$transaction(async (tx) => {
    // 1. Check for exact duplicate
    const existingEvent = await tx.webhookEvent.findUnique({
      where: { fingerprint },
    });

    if (existingEvent?.processed) {
      logInfo('Duplicate webhook event', { fingerprint, merchantOrderId });
      return { status: 'duplicate', httpCode: 200, message: 'Event already processed' };
    }

    // 2. Find payment with FOR UPDATE lock
    const paymentRows = await tx.$queryRaw<Payment[]>`
      SELECT * FROM payments
      WHERE "kashierOrderId" = ${merchantOrderId}
      FOR UPDATE
    `;

    if (!paymentRows || paymentRows.length === 0) {
      logWarn('Payment not found for webhook', { merchantOrderId });
      return { status: 'not_found', httpCode: 404, message: 'Payment not found' };
    }

    const currentPayment = paymentRows[0]!;

    // 3. Validate amount (optional security check)
    const expectedAmount = Number(currentPayment.amount);
    const receivedAmount = Number(amount);
    if (Math.abs(expectedAmount - receivedAmount) > 0.01) {
      logError('Amount mismatch in webhook', {
        expected: expectedAmount,
        received: receivedAmount,
        merchantOrderId,
      });
      // Record event but don't process
      await recordWebhookEvent(tx, fingerprint, currentPayment.id, event, true, 'amount_mismatch');
      return { status: 'invalid', httpCode: 200, message: 'Amount mismatch' };
    }

    // 4. Validate transition
    const transition = validateTransition(currentPayment.status, newStatus);
    if (!transition.allowed) {
      // Record event for audit
      await recordWebhookEvent(tx, fingerprint, currentPayment.id, event, true, transition.reason);
      
      if (transition.reason === 'no_change') {
        return { status: 'no_change', httpCode: 200, message: 'Payment already at this status' };
      }
      if (transition.reason === 'stale') {
        return { status: 'stale', httpCode: 200, message: 'Stale event ignored' };
      }
      return { status: 'conflict', httpCode: 200, message: 'Invalid status transition' };
    }

    // 5. Get order with FOR UPDATE lock
    const orderRows = await tx.$queryRaw<Order[]>`
      SELECT * FROM orders WHERE id = ${currentPayment.orderId} FOR UPDATE
    `;
    const currentOrder = orderRows[0];

    if (!currentOrder) {
      logError('Order not found for payment', { paymentId: currentPayment.id });
      return { status: 'invalid', httpCode: 200, message: 'Order not found' };
    }

    // 6. Get order items (immutable, no lock needed)
    const orderItems = await tx.orderItem.findMany({
      where: { orderId: currentOrder.id },
    });

    // 7. Perform status-specific operations
    if (newStatus === 'paid') {
      // SUCCESS: Update payment and order status
      await tx.payment.update({
        where: { id: currentPayment.id },
        data: {
          status: 'paid',
          kashierTransactionId: transactionId,
          paidAt: new Date(),
        },
      });

      await tx.order.update({
        where: { id: currentPayment.orderId },
        data: {
          paymentStatus: 'paid',
          status: 'confirmed',
        },
      });

      // Stock remains RESERVED (consistent with COD - commitStock at delivery)
      // Create outbox event
      await outboxRepository.createEvent(
        {
          aggregateType: 'Order',
          aggregateId: currentPayment.orderId,
          eventType: 'OrderPaid',
          payload: {
            orderId: currentPayment.orderId,
            orderNumber: currentOrder.orderNumber,
            paymentId: currentPayment.id,
            transactionId,
            amount: receivedAmount,
          },
        },
        tx
      );

      logInfo('Payment SUCCESS processed', {
        paymentId: currentPayment.id,
        orderId: currentPayment.orderId,
        transactionId,
      });

    } else if (newStatus === 'failed' || newStatus === 'expired') {
      // FAILURE/EXPIRED: Only process if order not already paid
      if (currentOrder.paymentStatus !== 'paid') {
        await tx.payment.update({
          where: { id: currentPayment.id },
          data: {
            status: newStatus,
            failedAt: new Date(),
          },
        });

        // Release stock for all reserved items
        for (const item of orderItems) {
          if (item.productId && item.inventoryReserved) {
            await productRepository.releaseStock(item.productId, item.quantity, tx);
          }
        }

        // Clear inventory reserved flags
        await tx.orderItem.updateMany({
          where: { orderId: currentPayment.orderId },
          data: { inventoryReserved: false },
        });

        // Update order status
        await tx.order.update({
          where: { id: currentPayment.orderId },
          data: {
            paymentStatus: 'failed',
            status: 'cancelled',
            cancelReason: `Payment ${newStatus}`,
            cancelledAt: new Date(),
          },
        });

        // Create outbox event
        await outboxRepository.createEvent(
          {
            aggregateType: 'Order',
            aggregateId: currentPayment.orderId,
            eventType: 'OrderCancelled',
            payload: {
              orderId: currentPayment.orderId,
              orderNumber: currentOrder.orderNumber,
              reason: `payment_${newStatus}`,
            },
          },
          tx
        );

        logInfo(`Payment ${newStatus.toUpperCase()} processed`, {
          paymentId: currentPayment.id,
          orderId: currentPayment.orderId,
        });
      } else {
        // Order already paid, ignore this failure
        await recordWebhookEvent(tx, fingerprint, currentPayment.id, event, true, 'order_already_paid');
        return { status: 'conflict', httpCode: 200, message: 'Order already paid' };
      }

    } else if (newStatus === 'refunded' || newStatus === 'voided') {
      // Refund/Void: Update payment status only
      // Inventory handling for refunds is a business decision - not auto-restoring here
      await tx.payment.update({
        where: { id: currentPayment.id },
        data: { status: newStatus },
      });

      await outboxRepository.createEvent(
        {
          aggregateType: 'Payment',
          aggregateId: currentPayment.id,
          eventType: newStatus === 'refunded' ? 'PaymentRefunded' : 'PaymentVoided',
          payload: {
            paymentId: currentPayment.id,
            orderId: currentPayment.orderId,
            transactionId,
          },
        },
        tx
      );

      logInfo(`Payment ${newStatus.toUpperCase()} processed`, {
        paymentId: currentPayment.id,
        orderId: currentPayment.orderId,
      });
    }

    // 8. Record webhook event
    await recordWebhookEvent(tx, fingerprint, currentPayment.id, event, false);

    return { status: 'processed', httpCode: 200, message: 'Event processed successfully' };

  }, { timeout: 30000 });
}

/**
 * Record a webhook event in the database.
 */
async function recordWebhookEvent(
  tx: Prisma.TransactionClient,
  fingerprint: string,
  paymentId: string,
  eventData: KashierWebhookPayload,
  ignored: boolean,
  ignoreReason?: string
): Promise<void> {
  await tx.webhookEvent.upsert({
    where: { fingerprint },
    create: {
      fingerprint,
      paymentId,
      eventData: eventData as any,
      processed: true,
      ignored,
      ignoreReason,
    },
    update: {
      processed: true,
      ignored,
      ignoreReason,
    },
  });
}

// ─── Payment Queries ───────────────────────────────────────────────────────────

/**
 * Get payment by ID with order ownership check.
 */
export async function getPaymentById(
  paymentId: string,
  userId: string
): Promise<Payment | null> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { order: true },
  });

  if (!payment) return null;

  // Check ownership
  if ((payment.order as any).userId !== userId) {
    return null;
  }

  return payment;
}

/**
 * Get all payments for an order.
 */
export async function getPaymentsByOrderId(orderId: string): Promise<Payment[]> {
  return prisma.payment.findMany({
    where: { orderId },
    orderBy: { attemptNumber: 'asc' },
  });
}

// ─── Error Classes ─────────────────────────────────────────────────────────────

export class PaymentError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}

/**
 * auto-cancel.worker.ts — PostgreSQL/Prisma implementation
 * Cancels unpaid non-COD orders older than ORDER_AUTO_CANCEL_UNPAID_HOURS.
 * Also handles Kashier payment expiration (30 minutes for pending_payment orders).
 * Runs every 30 minutes. Releases inventory atomically inside a transaction.
 */

import cron, { type ScheduledTask } from 'node-cron';
import { productRepository } from '../repositories/product.repository';
import { outboxRepository }  from '../repositories/outbox.repository';
import { prisma }            from '../lib/prisma';
import { invalidateProductsCache } from '../services/product.service';
import { env }               from '../config/env';
import { logInfo, logError, logWarn } from '../config/logger';

class AutoCancelWorker {
  private isRunning = false;
  private task: ScheduledTask | null = null;

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    if (this.task) {
      this.task.start();
    } else {
      this.task = cron.schedule('*/30 * * * *', () => { this.cancelExpiredOrders(); });
    }

    logInfo('Auto-cancel worker started (runs every 30 min)');
    this.cancelExpiredOrders(); // Run immediately on startup
  }

  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    this.task?.stop();
    logInfo('Auto-cancel worker stopped');
  }

  async cancelExpiredOrders(): Promise<void> {
    if (!this.isRunning) return;
    if (!process.env.DATABASE_URL) {
      logInfo('Auto-cancel skipped - PostgreSQL not configured');
      return;
    }

    try {
      // Run both cleanup tasks
      await this.cancelExpiredUnpaidOrders();
      await this.cleanupExpiredKashierPayments();
    } catch (err) {
      logError('Auto-cancel worker error', err);
    }
  }

  /**
   * Cancel unpaid non-COD orders older than ORDER_AUTO_CANCEL_UNPAID_HOURS.
   * Excludes pending_payment orders (handled separately).
   */
  private async cancelExpiredUnpaidOrders(): Promise<void> {
    const hours     = env.ORDER_AUTO_CANCEL_UNPAID_HOURS || 24;
    const threshold = new Date(Date.now() - hours * 60 * 60 * 1000);

    // Find expired unpaid non-COD orders (excluding pending_payment which has its own logic)
    const expiredOrders = await prisma.order.findMany({
      where: {
        status:        { in: ['pending', 'processing'] },
        paymentStatus: 'pending',
        paymentMethod: { not: 'cod' },  // COD is always "pending" until delivery
        createdAt:     { lt: threshold },
      },
      take:    50,
      include: { items: true },
    });

    if (expiredOrders.length === 0) return;

    logWarn(`Auto-cancelling ${expiredOrders.length} unpaid orders older than ${hours}h`);

    for (const order of expiredOrders) {
      await this.cancelSingleOrder(order, `Auto-cancelled after ${hours}h — payment not received`);
    }

    logInfo(`Auto-cancel complete: ${expiredOrders.length} orders cancelled`);
  }

  /**
   * Cleanup expired Kashier payments (pending_payment orders older than timeout).
   * Uses a shorter timeout (default 30 minutes) since online payments should complete quickly.
   */
  private async cleanupExpiredKashierPayments(): Promise<void> {
    const timeoutMinutes = env.KASHIER_SESSION_TIMEOUT_MINUTES || 30;
    const threshold = new Date(Date.now() - timeoutMinutes * 60 * 1000);

    // Find expired pending_payment Kashier orders
    const expiredOrders = await prisma.order.findMany({
      where: {
        status:        'pending_payment',
        paymentMethod: 'kashier',
        createdAt:     { lt: threshold },
        // Ensure no successful payment exists
        payments: {
          none: { status: 'paid' },
        },
      },
      take:    50,
      include: { items: true, payments: true },
    });

    if (expiredOrders.length === 0) return;

    logWarn(`Cleaning up ${expiredOrders.length} expired Kashier pending_payment orders`);

    for (const order of expiredOrders) {
      await this.expireKashierOrder(order);
    }

    logInfo(`Kashier cleanup complete: ${expiredOrders.length} orders expired`);
  }

  /**
   * Expire a Kashier order that has timed out.
   * Marks pending payments as expired, releases stock, cancels order.
   */
  private async expireKashierOrder(order: any): Promise<void> {
    try {
      await prisma.$transaction(async (tx) => {
        // Re-read the order inside the transaction to guard against race
        const fresh = await tx.order.findUnique({
          where:  { id: order.id },
          select: { status: true, paymentStatus: true },
        });

        // Skip if already processed or paid
        if (!fresh || 
            fresh.status === 'cancelled' || 
            fresh.status === 'confirmed' ||
            fresh.paymentStatus === 'paid') {
          return;
        }

        // Check one more time for successful payment (race with late webhook)
        const successfulPayment = await tx.payment.findFirst({
          where: { orderId: order.id, status: 'paid' },
        });

        if (successfulPayment) {
          // Late webhook succeeded - don't cancel
          logInfo(`Skipping expiration for order ${order.orderNumber} - payment succeeded`);
          return;
        }

        // Mark all pending payments as expired
        await tx.payment.updateMany({
          where: { orderId: order.id, status: 'pending' },
          data: { status: 'expired', failedAt: new Date() },
        });

        // Release inventory for each reserved item
        await Promise.all(
          order.items
            .filter((item: any) => item.productId && item.inventoryReserved)
            .map((item: any) => productRepository.releaseStock(item.productId, item.quantity, tx))
        );

        // Clear inventory reserved flags
        await tx.orderItem.updateMany({
          where: { orderId: order.id },
          data: { inventoryReserved: false },
        });

        // Update order status
        await tx.order.update({
          where: { id: order.id },
          data:  {
            status:       'cancelled',
            paymentStatus: 'failed',
            cancelReason: `Payment expired after ${env.KASHIER_SESSION_TIMEOUT_MINUTES || 30} minutes`,
            cancelledAt:  new Date(),
          },
        });

        // Outbox event
        await outboxRepository.createEvent(
          {
            aggregateType: 'Order',
            aggregateId:   order.id,
            eventType:     'OrderCancelled',
            payload: {
              orderId:     order.id,
              orderNumber: order.orderNumber,
              reason:      'payment_expired',
            },
          },
          tx
        );
      }, { timeout: 30_000, maxWait: 10_000 });

      invalidateProductsCache();
      logInfo(`Expired Kashier order ${order.orderNumber}`);
    } catch (err) {
      logError(`Failed to expire Kashier order ${order.orderNumber}`, err);
    }
  }

  private async cancelSingleOrder(order: any, reason: string): Promise<void> {
    try {
      await prisma.$transaction(async (tx) => {
        // Re-read the order inside the transaction to guard against double-cancel
        const fresh = await tx.order.findUnique({
          where:  { id: order.id },
          select: { status: true },
        });
        if (!fresh || fresh.status === 'cancelled' || fresh.status === 'delivered') {
          return;
        }

        // Release inventory for each reserved item
        await Promise.all(
          order.items
            .filter((item: any) => item.productId && item.inventoryReserved)
            .map((item: any) => productRepository.releaseStock(item.productId, item.quantity, tx))
        );

        // Update order status
        await tx.order.update({
          where: { id: order.id },
          data:  {
            status:      'cancelled',
            cancelReason: reason,
            cancelledAt: new Date(),
          },
        });

        // Outbox event
        await outboxRepository.createEvent(
          {
            aggregateType: 'Order',
            aggregateId:   order.id,
            eventType:     'OrderCancelled',
            payload: {
              orderId:     order.id,
              orderNumber: order.orderNumber,
              reason:      'auto_cancel_unpaid',
            },
          },
          tx
        );
      }, { timeout: 30_000, maxWait: 10_000 });

      invalidateProductsCache();
      logInfo(`Auto-cancelled order ${order.orderNumber}`);
    } catch (err) {
      logError(`Failed to auto-cancel order ${order.orderNumber}`, err);
    }
  }
}

export const autoCancelWorker = new AutoCancelWorker();

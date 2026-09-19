/**
 * auto-cancel.worker.ts — PostgreSQL/Prisma implementation
 * Cancels unpaid non-COD orders older than ORDER_AUTO_CANCEL_UNPAID_HOURS.
 * Runs every 30 minutes. Releases inventory atomically inside a transaction.
 */

import cron from 'node-cron';
import { productRepository } from '../repositories/product.repository';
import { outboxRepository }  from '../repositories/outbox.repository';
import { prisma }            from '../lib/prisma';
import { invalidateProductsCache } from '../services/product.service';
import { env }               from '../config/env';
import { logInfo, logError, logWarn } from '../config/logger';

class AutoCancelWorker {
  private isRunning = false;
  private task: cron.ScheduledTask | null = null;

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
      const hours     = env.ORDER_AUTO_CANCEL_UNPAID_HOURS || 24;
      const threshold = new Date(Date.now() - hours * 60 * 60 * 1000);

      // Find expired unpaid non-COD orders
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
        await this.cancelSingleOrder(order);
      }

      logInfo(`Auto-cancel complete: ${expiredOrders.length} orders cancelled`);
    } catch (err) {
      logError('Auto-cancel worker error', err);
    }
  }

  private async cancelSingleOrder(order: any): Promise<void> {
    try {
      await prisma.$transaction(async (tx) => {
        // Re-read the order inside the transaction to guard against double-cancel
        // (two worker instances or concurrent cancel requests on the same order).
        const fresh = await tx.order.findUnique({
          where:  { id: order.id },
          select: { status: true },
        });
        if (!fresh || fresh.status === 'cancelled' || fresh.status === 'delivered') {
          // Already processed — skip silently
          return;
        }

        // Release inventory for each reserved item (parallel)
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
            cancelReason: `Auto-cancelled after ${env.ORDER_AUTO_CANCEL_UNPAID_HOURS || 24}h — payment not received`,
            cancelledAt: new Date(),
          },
        });

        // Outbox event → SMS notification
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

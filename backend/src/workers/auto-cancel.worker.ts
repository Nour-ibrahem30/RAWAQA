/**
 * Auto-Cancel Worker
 * Cancels unpaid orders that exceed ORDER_AUTO_CANCEL_UNPAID_HOURS
 * Runs every 30 minutes via node-cron
 * Also releases reserved inventory for cancelled orders
 */

import cron from 'node-cron';
import mongoose from 'mongoose';
import { Order, OrderStatus, PaymentStatus, PaymentMethod } from '../models/Order';import { Product } from '../models/Product';
import { OutboxEvent } from '../models/OutboxEvent';
import { env } from '../config/env';
import { logInfo, logError, logWarn } from '../config/logger';

class AutoCancelWorker {
  private isRunning = false;
  private task: cron.ScheduledTask | null = null;

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    // Run every 30 minutes
    this.task = cron.schedule('*/30 * * * *', () => {
      this.cancelExpiredOrders();
    });

    logInfo('Auto-cancel worker started (runs every 30 min)');

    // Run immediately on startup
    this.cancelExpiredOrders();
  }

  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    this.task?.stop();
    logInfo('Auto-cancel worker stopped');
  }

  async cancelExpiredOrders(): Promise<void> {
    if (!this.isRunning) return;

    // Skip if MongoDB not connected
    if (mongoose.connection.readyState !== 1) {
      logInfo('Auto-cancel skipped - MongoDB not connected');
      return;
    }

    try {
      const hours     = env.ORDER_AUTO_CANCEL_UNPAID_HOURS;
      const threshold = new Date(Date.now() - hours * 60 * 60 * 1000);

      // Find orders that are:
      // - Status: pending or processing
      // - PaymentStatus: pending or awaiting_payment
      // - PaymentMethod: NOT cash_on_delivery (COD is always "pending" until delivery)
      // - Created before the threshold
      const expiredOrders = await Order.find({
        status: { $in: [OrderStatus.PENDING, OrderStatus.PROCESSING] },
        paymentStatus: PaymentStatus.PENDING,
        paymentMethod: { $ne: PaymentMethod.CASH_ON_DELIVERY },
        createdAt: { $lt: threshold },
      }).limit(50); // Process in batches

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
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Release inventory
      for (const item of order.items) {
        await Product.updateOne(
          { _id: item.product, 'inventory.reservedQuantity': { $gte: item.quantity } },
          { $inc: { 'inventory.reservedQuantity': -item.quantity } }
        ).session(session);
      }

      // Update order
      order.status        = OrderStatus.CANCELLED;
      order.internalNotes = `Auto-cancelled after ${env.ORDER_AUTO_CANCEL_UNPAID_HOURS}h — payment not received`;
      order.cancelledAt   = new Date();
      await order.save({ session });

      // Outbox event → SMS notification
      await OutboxEvent.create(
        [{
          aggregateType: 'Order',
          aggregateId:   order._id,
          eventType:     'OrderCancelled',
          payload: {
            orderId:      order._id,
            orderNumber:  order.orderNumber,
            reason:       'auto_cancel_unpaid',
          },
        }],
        { session }
      );

      await session.commitTransaction();
      logInfo(`Auto-cancelled order ${order.orderNumber}`);
    } catch (err) {
      await session.abortTransaction();
      logError(`Failed to auto-cancel order ${order.orderNumber}`, err);
    } finally {
      session.endSession();
    }
  }
}

export const autoCancelWorker = new AutoCancelWorker();

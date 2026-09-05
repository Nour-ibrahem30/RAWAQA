import { OutboxEvent } from '../models/OutboxEvent';
import { odooService } from '../services/odoo.service';
import { smsService } from '../services/sms.service';
import { emailService } from '../services/email.service';
import { Order } from '../models/Order';
import { logInfo, logError } from '../config/logger';
import mongoose from 'mongoose';

/**
 * Outbox Worker
 * Processes outbox events with atomic lease pattern
 * Ensures exactly-once processing with worker concurrency support
 */
class OutboxWorker {
  private isRunning: boolean = false;
  private workerId: string;
  private intervalMs: number = 5000; // Process every 5 seconds
  private leaseTimeMs: number = 30000; // 30 second lease
  private batchSize: number = 10;
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.workerId = `worker-${process.pid}-${Date.now()}`;
  }

  /**
   * Start the worker
   */
  start(): void {
    if (this.isRunning) {
      logInfo('Outbox worker already running');
      return;
    }

    this.isRunning = true;
    logInfo(`Starting outbox worker: ${this.workerId}`);

    // Process immediately
    this.processEvents();

    // Then process on interval
    this.intervalId = setInterval(() => {
      this.processEvents();
    }, this.intervalMs);
  }

  /**
   * Stop the worker
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    logInfo(`Stopping outbox worker: ${this.workerId}`);

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Process pending events
   */
  private async processEvents(): Promise<void> {
    if (!this.isRunning) return;

    // Skip if MongoDB not connected
    if (mongoose.connection.readyState !== 1) return;

    try {
      // Acquire lease on pending events atomically
      const events = await this.acquireLease();

      if (events.length === 0) {
        return;
      }

      logInfo(`Processing ${events.length} outbox events`);

      // Process each event
      for (const event of events) {
        try {
          await this.processEvent(event);
        } catch (error) {
          logError(`Failed to process event ${event._id}`, error);
          await this.handleEventFailure(event, error);
        }
      }
    } catch (error) {
      logError('Outbox worker error', error);
    }
  }

  /**
   * Acquire lease on events atomically
   * Uses MongoDB atomic update to prevent duplicate processing
   */
  private async acquireLease(): Promise<any[]> {
    const now = new Date();
    const leaseExpiry = new Date(now.getTime() + this.leaseTimeMs);

    try {
      // Find and lock events atomically
      const events = await OutboxEvent.find({
        $or: [
          { processed: false, lockedBy: null },
          { processed: false, lockedUntil: { $lt: now } }, // Expired leases
        ],
      })
        .sort({ createdAt: 1 })
        .limit(this.batchSize)
        .lean();

      if (events.length === 0) {
        return [];
      }

      const eventIds = events.map((e) => e._id);

      // Atomically acquire lease
      const result = await OutboxEvent.updateMany(
        {
          _id: { $in: eventIds },
          $or: [
            { processed: false, lockedBy: null },
            { processed: false, lockedUntil: { $lt: now } },
          ],
        },
        {
          $set: {
            lockedBy: this.workerId,
            lockedUntil: leaseExpiry,
          },
        }
      );

      if (result.modifiedCount === 0) {
        return [];
      }

      // Fetch the locked events
      return OutboxEvent.find({
        _id: { $in: eventIds },
        lockedBy: this.workerId,
      }).lean();
    } catch (error) {
      logError('Failed to acquire lease', error);
      return [];
    }
  }

  /**
   * Process a single event
   */
  private async processEvent(event: any): Promise<void> {
    logInfo(`Processing event: ${event.eventType} for ${event.aggregateType}:${event.aggregateId}`);

    switch (event.eventType) {
      case 'OrderCreated':
        await this.handleOrderCreated(event);
        break;

      case 'OrderStatusChanged':
        await this.handleOrderStatusChanged(event);
        break;

      case 'OrderCancelled':
        await this.handleOrderCancelled(event);
        break;

      case 'OrderDelivered':
        await this.handleOrderDelivered(event);
        break;

      case 'PaymentStatusChanged':
        await this.handlePaymentStatusChanged(event);
        break;

      default:
        logInfo(`Unknown event type: ${event.eventType}`);
    }

    // Mark as processed
    await OutboxEvent.findByIdAndUpdate(event._id, {
      processed: true,
      processedAt: new Date(),
      $unset: { lockedBy: 1, lockedUntil: 1 },
    });

    logInfo(`Event ${event._id} processed successfully`);
  }

  /**
   * Handle order created event
   */
  private async handleOrderCreated(event: any): Promise<void> {
    const { orderId } = event.payload;

    // Get order details
    const order = await Order.findById(orderId)
      .populate('userId', 'firstName lastName phone email')
      .populate('items.product', 'nameEn nameAr sku');

    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    // Send to Odoo
    try {
      const result = await odooService.createOrder(order);
      if (result.success && result.odooOrderId) {
        order.odoo.odooOrderId = result.odooOrderId;
        order.odoo.syncStatus = 'synced' as any;
        order.odoo.lastSyncAt = new Date();
        await order.save();
      }
    } catch (error) {
      logError('Failed to sync order to Odoo', error);
    }

    // Send SMS + Email confirmation
    const user = order.userId as any;
    if (user && user.phone) {
      await smsService.sendOrderConfirmation(user.phone, order.orderNumber, order.total);
    }
    if (user && user.email) {
      await emailService.sendOrderConfirmation({
        email:       user.email,
        firstName:   user.firstName || 'Customer',
        orderNumber: order.orderNumber,
        total:       order.total,
        items:       order.items.map((i: any) => ({
          nameAr:   i.productSnapshot?.nameAr || '',
          quantity: i.quantity,
          price:    i.price,
        })),
      });
    }
  }

  /**
   * Handle order status changed event
   */
  private async handleOrderStatusChanged(event: any): Promise<void> {
    const { orderId, newStatus } = event.payload;

    const order = await Order.findById(orderId).populate('userId', 'phone');
    if (!order) return;

    const user = order.userId as any;

    // Send SMS based on status
    if (user && user.phone) {
      switch (newStatus) {
        case 'shipped':
          await smsService.sendOrderShipped(user.phone, order.orderNumber, order.trackingNumber);
          if ((order.userId as any)?.email) {
            await emailService.sendOrderShipped({
              email:          (order.userId as any).email,
              firstName:      (order.userId as any).firstName || '',
              orderNumber:    order.orderNumber,
              trackingNumber: order.trackingNumber,
            });
          }
          break;
        case 'delivered':
          await smsService.sendOrderDelivered(user.phone, order.orderNumber);
          break;
        case 'cancelled':
          await smsService.sendOrderCancelled(user.phone, order.orderNumber);
          break;
      }
    }

    // Update Odoo if synced
    if (order.odoo.odooOrderId) {
      await odooService.updateOrderStatus(order.odoo.odooOrderId, newStatus);
    }
  }

  /**
   * Handle order cancelled event
   */
  private async handleOrderCancelled(event: any): Promise<void> {
    const { orderId } = event.payload;

    const order = await Order.findById(orderId).populate('userId', 'phone');
    if (!order) return;

    const user = order.userId as any;
    if (user && user.phone) {
      await smsService.sendOrderCancelled(user.phone, order.orderNumber);
    }
  }

  /**
   * Handle order delivered event
   */
  private async handleOrderDelivered(event: any): Promise<void> {
    const { orderId } = event.payload;

    const order = await Order.findById(orderId).populate('userId', 'phone');
    if (!order) return;

    const user = order.userId as any;
    if (user && user.phone) {
      await smsService.sendOrderDelivered(user.phone, order.orderNumber);
    }
  }

  /**
   * Handle payment status changed event
   */
  private async handlePaymentStatusChanged(event: any): Promise<void> {
    // Placeholder for payment notifications
    logInfo('Payment status changed', event.payload);
  }

  /**
   * Handle event processing failure
   */
  private async handleEventFailure(event: any, error: any): Promise<void> {
    await OutboxEvent.findByIdAndUpdate(event._id, {
      $inc: { retryCount: 1 },
      $set: {
        lastError: error instanceof Error ? error.message : 'Unknown error',
      },
      $unset: { lockedBy: 1, lockedUntil: 1 },
    });

    // If too many retries, mark as failed
    if (event.retryCount >= 5) {
      await OutboxEvent.findByIdAndUpdate(event._id, {
        processed: true,
        processedAt: new Date(),
      });
      logError(`Event ${event._id} failed after ${event.retryCount} retries`, new Error('Max retries exceeded'));
    }
  }
}

// Export singleton instance
export const outboxWorker = new OutboxWorker();

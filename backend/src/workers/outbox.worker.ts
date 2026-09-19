/**
 * outbox.worker.ts — PostgreSQL/Prisma implementation
 * All behavior preserved: atomic lease pattern, event processing, SMS/email/Odoo.
 * MongoDB guard replaced with Prisma availability check.
 */

import { odooService }   from '../services/odoo.service';
import { smsService }    from '../services/sms.service';
import { emailService }  from '../services/email.service';
import { outboxRepository } from '../repositories/outbox.repository';
import { prisma }           from '../lib/prisma';
import { logInfo, logError } from '../config/logger';

class OutboxWorker {
  private isRunning   = false;
  private workerId:   string;
  private intervalMs  = 5000;   // 5 seconds
  private leaseTimeMs = 30000;  // 30 seconds
  private batchSize   = 10;
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.workerId = `worker-${process.pid}-${Date.now()}`;
  }

  start(): void {
    if (this.isRunning) { logInfo('Outbox worker already running'); return; }
    this.isRunning = true;
    logInfo(`Starting outbox worker: ${this.workerId}`);
    this.processEvents();
    this.intervalId = setInterval(() => this.processEvents(), this.intervalMs);
  }

  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    logInfo(`Stopping outbox worker: ${this.workerId}`);
    if (this.intervalId) { clearInterval(this.intervalId); this.intervalId = null; }
  }

  private async processEvents(): Promise<void> {
    if (!this.isRunning) return;
    if (!process.env.DATABASE_URL) return; // Prisma not configured

    try {
      const events = await outboxRepository.acquireLease(
        this.workerId, this.batchSize, this.leaseTimeMs
      );
      if (events.length === 0) return;

      logInfo(`Processing ${events.length} outbox events`);
      for (const event of events) {
        try {
          await this.processEvent(event);
          await outboxRepository.markProcessed(event.id);
          logInfo(`Event ${event.id} processed successfully`);
        } catch (error) {
          logError(`Failed to process event ${event.id}`, error);
          await outboxRepository.recordFailure(
            event.id,
            error instanceof Error ? error.message : 'Unknown error',
            event.retryCount,
            event.maxRetries
          );
        }
      }
    } catch (error) {
      logError('Outbox worker error', error);
    }
  }

  private async processEvent(event: any): Promise<void> {
    logInfo(`Processing event: ${event.eventType} for ${event.aggregateType}:${event.aggregateId}`);

    switch (event.eventType) {
      case 'OrderCreated':       await this.handleOrderCreated(event);       break;
      case 'OrderStatusChanged': await this.handleOrderStatusChanged(event); break;
      case 'OrderCancelled':     await this.handleOrderCancelled(event);     break;
      case 'OrderDelivered':     await this.handleOrderDelivered(event);     break;
      case 'PaymentStatusChanged': await this.handlePaymentStatusChanged(event); break;
      default: logInfo(`Unknown event type: ${event.eventType}`);
    }
  }

  private async handleOrderCreated(event: any): Promise<void> {
    const { orderId } = event.payload;

    const order = await prisma.order.findUnique({
      where:   { id: orderId },
      include: {
        user:  { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
        items: true,
      },
    });
    if (!order) throw new Error(`Order ${orderId} not found`);

    // Sync to Odoo
    try {
      const result = await odooService.createOrder(order as any);
      if (result.success && result.odooOrderId) {
        const odooId = typeof result.odooOrderId === 'string'
          ? parseInt(result.odooOrderId, 10) || null
          : result.odooOrderId as number | null;
        await prisma.order.update({
          where: { id: orderId },
          data:  { odooOrderId: odooId, odooSyncedAt: new Date() },
        });
      }
    } catch (err) {
      logError('Failed to sync order to Odoo', err);
    }

    // SMS + Email confirmation
    const user = order.user as any;
    if (user?.phone) {
      await smsService.sendOrderConfirmation(user.phone, order.orderNumber, Number(order.total));
    }
    if (user?.email) {
      await emailService.sendOrderConfirmation({
        email:       user.email,
        firstName:   user.firstName || 'Customer',
        orderNumber: order.orderNumber,
        total:       Number(order.total),
        items:       order.items.map((i: any) => ({
          nameAr:   i.snapshotNameAr || '',
          quantity: i.quantity,
          price:    Number(i.price),
        })),
      });
    }
  }

  private async handleOrderStatusChanged(event: any): Promise<void> {
    const { orderId, newStatus } = event.payload;

    const order = await prisma.order.findUnique({
      where:   { id: orderId },
      include: { user: { select: { phone: true, email: true, firstName: true } } },
    });
    if (!order) return;

    const user = order.user as any;
    if (user?.phone) {
      switch (newStatus) {
        case 'shipped':
          await smsService.sendOrderShipped(user.phone, order.orderNumber, undefined);
          if (user.email) {
            await emailService.sendOrderShipped({
              email:       user.email,
              firstName:   user.firstName || '',
              orderNumber: order.orderNumber,
              trackingNumber: undefined,
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

    // Update Odoo
    if (order.odooOrderId) {
      await odooService.updateOrderStatus(String(order.odooOrderId), newStatus);
    }
  }

  private async handleOrderCancelled(event: any): Promise<void> {
    const { orderId } = event.payload;
    const order = await prisma.order.findUnique({
      where:   { id: orderId },
      include: { user: { select: { phone: true } } },
    });
    if (!order) return;
    const user = order.user as any;
    if (user?.phone) await smsService.sendOrderCancelled(user.phone, order.orderNumber);
  }

  private async handleOrderDelivered(event: any): Promise<void> {
    const { orderId } = event.payload;
    const order = await prisma.order.findUnique({
      where:   { id: orderId },
      include: { user: { select: { phone: true } } },
    });
    if (!order) return;
    const user = order.user as any;
    if (user?.phone) await smsService.sendOrderDelivered(user.phone, order.orderNumber);
  }

  private async handlePaymentStatusChanged(event: any): Promise<void> {
    logInfo('Payment status changed', event.payload);
  }
}

export const outboxWorker = new OutboxWorker();

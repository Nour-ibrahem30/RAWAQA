/**
 * inventory-reconciliation.worker.ts — PostgreSQL/Prisma implementation
 * Syncs inventory between Neon PostgreSQL and Odoo ERP.
 * All behavior preserved: scheduling, reconciliation reports, discrepancy detection.
 */

import { odooService }     from '../services/odoo.service';
import { outboxRepository } from '../repositories/outbox.repository';
import { prisma }           from '../lib/prisma';
import { invalidateProductsCache } from '../services/product.service';
import { logInfo, logError, logWarn } from '../config/logger';
import { env }              from '../config/env';

class InventoryReconciliationWorker {
  private isRunning  = false;
  private intervalMs = 3_600_000; // 1 hour
  private intervalId: NodeJS.Timeout | null = null;

  start(): void {
    if (this.isRunning) { logInfo('Inventory reconciliation worker already running'); return; }
    this.isRunning = true;
    logInfo('Starting inventory reconciliation worker');
    this.reconcile();
    this.intervalId = setInterval(() => this.reconcile(), this.intervalMs);
  }

  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    logInfo('Stopping inventory reconciliation worker');
    if (this.intervalId) { clearInterval(this.intervalId); this.intervalId = null; }
  }

  private async reconcile(): Promise<void> {
    if (!this.isRunning) return;
    if (!process.env.DATABASE_URL) {
      logWarn('Inventory reconciliation skipped - PostgreSQL not configured');
      return;
    }
    if (!env.ODOO_SYNC_ENABLED) {
      logInfo('Inventory reconciliation skipped - Odoo sync disabled');
      return;
    }

    logInfo('Starting inventory reconciliation');
    const startTime = Date.now();

    try {
      const products = await prisma.product.findMany({
        where:   { status: 'active' },
        include: { inventory: true },
      });

      if (products.length === 0) { logInfo('No products to reconcile'); return; }
      logInfo(`Reconciling ${products.length} products`);

      const skus          = products.map((p: any) => p.sku);
      const odooProducts  = await odooService.getMultipleProductsInventory(skus);
      const odooMap       = new Map<string, any>();
      odooProducts.forEach((op: any) => odooMap.set(op.default_code, op));

      let syncedCount = 0, errorCount = 0;
      const discrepancies: any[] = [];

      for (const product of products) {
        try {
          const odoo = odooMap.get((product as any).sku);
          if (!odoo) { logWarn(`Product ${(product as any).sku} not found in Odoo`); errorCount++; continue; }

          const oldQty = (product as any).inventory?.onHandQuantity ?? 0;
          const newQty = odoo.qty_available;

          if (oldQty !== newQty) {
            discrepancies.push({
              sku:         (product as any).sku,
              name:        (product as any).nameEn,
              oldQuantity: oldQty,
              newQuantity: newQty,
              difference:  newQty - oldQty,
            });
          }

          // Update inventory
          const avail = Math.max(0, newQty - ((product as any).inventory?.reservedQuantity ?? 0));
          await prisma.inventory.update({
            where: { productId: (product as any).id },
            data:  { onHandQuantity: newQty, availableQuantity: avail, lastSyncedAt: new Date() },
          });
          syncedCount++;
        } catch (err) {
          logError(`Failed to reconcile product ${(product as any).sku}`, err);
          errorCount++;
        }
      }

      const durationMs = Date.now() - startTime;
      logInfo(`Inventory reconciliation complete: ${syncedCount} synced, ${errorCount} errors, ${discrepancies.length} discrepancies`);
      if (discrepancies.length > 0) logWarn('Inventory discrepancies found:', discrepancies);

      // Save report via Prisma repository
      await outboxRepository.createReconciliationReport({
        totalProducts: products.length,
        syncedCount,
        errorCount,
        durationMs,
        discrepancies,
      });

      invalidateProductsCache();
    } catch (err) {
      logError('Inventory reconciliation failed', err);
    }
  }

  async reconcileProduct(productId: string): Promise<boolean> {
    try {
      const product = await prisma.product.findUnique({
        where:   { id: productId },
        include: { inventory: true },
      });
      if (!product) throw new Error('Product not found');

      const odoo = await odooService.getProductInventory(product.sku);
      if (!odoo) throw new Error('Product not found in Odoo');

      const avail = Math.max(0, odoo.qty_available - (product.inventory?.reservedQuantity ?? 0));
      await prisma.inventory.update({
        where: { productId },
        data:  { onHandQuantity: odoo.qty_available, availableQuantity: avail, lastSyncedAt: new Date() },
      });

      logInfo(`Reconciled product ${product.sku}: ${odoo.qty_available} units`);
      return true;
    } catch (err) {
      logError(`Failed to reconcile product ${productId}`, err);
      return false;
    }
  }

  async getStaleProducts(hoursThreshold = 24): Promise<any[]> {
    const threshold = new Date();
    threshold.setHours(threshold.getHours() - hoursThreshold);

    return prisma.product.findMany({
      where: {
        status: 'active',
        inventory: {
          OR: [
            { lastSyncedAt: { lt: threshold } },
            { lastSyncedAt: null },
          ],
        },
      },
      include: { inventory: true },
    });
  }

  async triggerReconciliation(): Promise<void> {
    logInfo('Manual reconciliation triggered');
    await this.reconcile();
  }
}

export const inventoryReconciliationWorker = new InventoryReconciliationWorker();

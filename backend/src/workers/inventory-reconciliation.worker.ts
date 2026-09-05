import { Product } from '../models/Product';
import { odooService } from '../services/odoo.service';
import { logInfo, logError, logWarn } from '../config/logger';
import mongoose from 'mongoose';

/**
 * Inventory Reconciliation Worker
 * Syncs inventory between local database and Odoo ERP
 * Runs periodically to ensure data consistency
 */
class InventoryReconciliationWorker {
  private isRunning: boolean = false;
  private intervalMs: number = 3600000; // Run every hour
  private intervalId: NodeJS.Timeout | null = null;

  /**
   * Start the worker
   */
  start(): void {
    if (this.isRunning) {
      logInfo('Inventory reconciliation worker already running');
      return;
    }

    this.isRunning = true;
    logInfo('Starting inventory reconciliation worker');

    // Run immediately on start
    this.reconcile();

    // Then run on interval
    this.intervalId = setInterval(() => {
      this.reconcile();
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
    logInfo('Stopping inventory reconciliation worker');

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Perform full inventory reconciliation
   */
  private async reconcile(): Promise<void> {
    if (!this.isRunning) return;

    // Skip if MongoDB not connected
    if (mongoose.connection.readyState !== 1) {
      logWarn('Inventory reconciliation skipped - MongoDB not connected');
      return;
    }

    logInfo('Starting inventory reconciliation');

    try {
      // Get all active products
      const products = await Product.find({ status: 'active' }).select(
        'sku nameEn inventory'
      );

      if (products.length === 0) {
        logInfo('No products to reconcile');
        return;
      }

      logInfo(`Reconciling ${products.length} products`);

      // Get SKUs
      const skus = products.map((p) => p.sku);

      // Fetch inventory from Odoo in batch
      const odooProducts = await odooService.getMultipleProductsInventory(skus);

      // Create SKU to Odoo product map
      const odooMap = new Map<string, any>();
      odooProducts.forEach((op) => {
        odooMap.set(op.default_code, op);
      });

      let syncedCount = 0;
      let errorCount = 0;
      let discrepancies: any[] = [];

      // Update local inventory
      for (const product of products) {
        try {
          const odooProduct = odooMap.get(product.sku);

          if (!odooProduct) {
            logWarn(`Product ${product.sku} not found in Odoo`);
            errorCount++;
            continue;
          }

          const oldQuantity = product.inventory.onHandQuantity;
          const newQuantity = odooProduct.qty_available;

          // Check for discrepancy
          if (oldQuantity !== newQuantity) {
            discrepancies.push({
              sku: product.sku,
              name: product.nameEn,
              oldQuantity,
              newQuantity,
              difference: newQuantity - oldQuantity,
            });
          }

          // Update inventory
          product.inventory.onHandQuantity = newQuantity;
          product.inventory.lastSyncedAt = new Date();

          await product.save();
          syncedCount++;
        } catch (error) {
          logError(`Failed to reconcile product ${product.sku}`, error);
          errorCount++;
        }
      }

      // Log summary
      logInfo(
        `Inventory reconciliation complete: ${syncedCount} synced, ${errorCount} errors, ${discrepancies.length} discrepancies`
      );

      // Log discrepancies
      if (discrepancies.length > 0) {
        logWarn('Inventory discrepancies found:', discrepancies);
      }

      // Store reconciliation report (optional - could save to database)
      await this.saveReconciliationReport({
        timestamp: new Date(),
        totalProducts: products.length,
        syncedCount,
        errorCount,
        discrepancies,
      });
    } catch (error) {
      logError('Inventory reconciliation failed', error);
    }
  }

  /**
   * Reconcile single product
   */
  async reconcileProduct(productId: string): Promise<boolean> {
    try {
      const product = await Product.findById(productId);

      if (!product) {
        throw new Error('Product not found');
      }

      const odooProduct = await odooService.getProductInventory(product.sku);

      if (!odooProduct) {
        throw new Error('Product not found in Odoo');
      }

      product.inventory.onHandQuantity = odooProduct.qty_available;
      product.inventory.lastSyncedAt = new Date();

      await product.save();

      logInfo(`Reconciled product ${product.sku}: ${odooProduct.qty_available} units`);
      return true;
    } catch (error) {
      logError(`Failed to reconcile product ${productId}`, error);
      return false;
    }
  }

  /**
   * Get products that need reconciliation (not synced recently)
   */
  async getStaleProducts(hoursThreshold: number = 24): Promise<any[]> {
    const threshold = new Date();
    threshold.setHours(threshold.getHours() - hoursThreshold);

    return Product.find({
      status: 'active',
      $or: [
        { 'inventory.lastSyncedAt': { $lt: threshold } },
        { 'inventory.lastSyncedAt': null },
      ],
    })
      .select('sku nameEn inventory')
      .lean();
  }

  /**
   * Save reconciliation report
   */
  private async saveReconciliationReport(report: any): Promise<void> {
    // This could be saved to a ReconciliationReport model
    // For now, just log it
    logInfo('Reconciliation Report:', {
      timestamp: report.timestamp,
      summary: {
        total: report.totalProducts,
        synced: report.syncedCount,
        errors: report.errorCount,
        discrepancies: report.discrepancies.length,
      },
    });

    // Optionally: Save to database or send to monitoring service
    // await ReconciliationReport.create(report);
  }

  /**
   * Manual trigger for reconciliation
   */
  async triggerReconciliation(): Promise<void> {
    logInfo('Manual reconciliation triggered');
    await this.reconcile();
  }
}

// Export singleton instance
export const inventoryReconciliationWorker = new InventoryReconciliationWorker();

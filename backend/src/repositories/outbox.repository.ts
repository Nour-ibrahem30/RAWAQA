import { OutboxEvent, ReconciliationReport, ReconciliationDiscrepancy, Prisma } from '../generated/prisma/client';
import { prisma } from '../lib/prisma';

export class OutboxRepository {
  // ─── Outbox Events ─────────────────────────────────────────────

  async createEvent(
    data: {
      aggregateType: string;
      aggregateId: string;
      eventType: string;
      payload: any;
    },
    tx?: Prisma.TransactionClient
  ): Promise<OutboxEvent> {
    const client = tx ?? prisma;
    return client.outboxEvent.create({ data });
  }

  /**
   * Concurrency-safe lease acquisition for workers.
   * Finds pending events whose lease has expired or is unassigned,
   * atomically updates lockedBy and lockedUntil, and returns them.
   */
  async acquireLease(
    workerId: string,
    limit: number = 10,
    leaseDurationMs: number = 30000
  ): Promise<OutboxEvent[]> {
    const now = new Date();
    const leaseExpiry = new Date(now.getTime() + leaseDurationMs);

    // Atomic update of available pending events
    const candidates = await prisma.outboxEvent.findMany({
      where: {
        processed: false,
        OR: [
          { lockedBy: null },
          { lockedUntil: { lt: now } },
        ],
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: { id: true },
    });

    if (candidates.length === 0) return [];

    const candidateIds = candidates.map((c) => c.id);

    const updateResult = await prisma.outboxEvent.updateMany({
      where: {
        id: { in: candidateIds },
        processed: false,
        OR: [
          { lockedBy: null },
          { lockedUntil: { lt: now } },
        ],
      },
      data: {
        lockedBy: workerId,
        lockedUntil: leaseExpiry,
      },
    });

    if (updateResult.count === 0) return [];

    return prisma.outboxEvent.findMany({
      where: {
        id: { in: candidateIds },
        lockedBy: workerId,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async markProcessed(id: string): Promise<void> {
    await prisma.outboxEvent.update({
      where: { id },
      data: {
        processed: true,
        processedAt: new Date(),
        lockedBy: null,
        lockedUntil: null,
      },
    });
  }

  async recordFailure(
    id: string,
    error: string,
    retryCount: number,
    maxRetries: number = 5
  ): Promise<void> {
    await prisma.outboxEvent.update({
      where: { id },
      data: {
        retryCount: retryCount + 1,
        maxRetries,
        lastError: error,
        lockedBy: null,
        lockedUntil: null, // release lease so it can be retried
      },
    });
  }

  // ─── Reconciliation Reports ────────────────────────────────────

  async createReconciliationReport(data: {
    totalProducts: number;
    syncedCount: number;
    errorCount: number;
    durationMs?: number;
    discrepancies: Array<{
      sku: string;
      name: string;
      oldQuantity: number;
      newQuantity: number;
      difference: number;
    }>;
  }): Promise<ReconciliationReport> {
    const { discrepancies, ...reportData } = data;
    return prisma.reconciliationReport.create({
      data: {
        ...reportData,
        discrepancies: {
          create: discrepancies,
        },
      },
      include: {
        discrepancies: true,
      },
    });
  }

  async findRecentReports(limit: number = 20): Promise<Array<ReconciliationReport & { discrepancies: ReconciliationDiscrepancy[] }>> {
    return prisma.reconciliationReport.findMany({
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: { discrepancies: true },
    });
  }

  async deleteOldReports(olderThanDays: number = 90): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const res = await prisma.reconciliationReport.deleteMany({
      where: { timestamp: { lt: cutoff } },
    });
    return res.count;
  }
}

export const outboxRepository = new OutboxRepository();


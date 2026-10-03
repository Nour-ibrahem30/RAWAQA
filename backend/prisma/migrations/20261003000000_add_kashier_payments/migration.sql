-- Migration: Add Kashier Payment Integration
-- This migration adds support for Kashier hosted checkout payments.
-- 
-- Changes:
-- 1. Add 'pending_payment' to OrderStatus enum
-- 2. Add 'expired', 'voided' to PaymentStatus enum
-- 3. Add 'kashier' to PaymentMethod enum
-- 4. Create 'payments' table
-- 5. Create 'webhook_events' table
--
-- NOTE: This migration was created after `prisma db push` was executed.
-- It documents the exact changes that were applied to production.

-- ============================================================================
-- ENUM MODIFICATIONS
-- ============================================================================

-- Add 'pending_payment' to OrderStatus enum
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'pending_payment';

-- Add 'expired' and 'voided' to PaymentStatus enum
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'expired';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'voided';

-- Add 'kashier' to PaymentMethod enum
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'kashier';

-- ============================================================================
-- CREATE PAYMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS "payments" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "kashierOrderId" TEXT NOT NULL,
    "kashierSessionId" TEXT,
    "kashierTransactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- CREATE WEBHOOK_EVENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS "webhook_events" (
    "id" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "eventData" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "ignored" BOOLEAN NOT NULL DEFAULT false,
    "ignoreReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- ============================================================================
-- INDEXES FOR PAYMENTS TABLE
-- ============================================================================

-- Unique constraint on kashierOrderId (one payment attempt per Kashier order ID)
CREATE UNIQUE INDEX IF NOT EXISTS "payments_kashierOrderId_key" ON "payments"("kashierOrderId");

-- Unique constraint on kashierSessionId (nullable, but unique when present)
CREATE UNIQUE INDEX IF NOT EXISTS "payments_kashierSessionId_key" ON "payments"("kashierSessionId");

-- Unique constraint on orderId + attemptNumber (one attempt number per order)
CREATE UNIQUE INDEX IF NOT EXISTS "payments_orderId_attemptNumber_key" ON "payments"("orderId", "attemptNumber");

-- Index for querying payments by order and status
CREATE INDEX IF NOT EXISTS "payments_orderId_status_idx" ON "payments"("orderId", "status");

-- ============================================================================
-- INDEXES FOR WEBHOOK_EVENTS TABLE
-- ============================================================================

-- Unique constraint on fingerprint (idempotency)
CREATE UNIQUE INDEX IF NOT EXISTS "webhook_events_fingerprint_key" ON "webhook_events"("fingerprint");

-- Index for querying events by payment
CREATE INDEX IF NOT EXISTS "webhook_events_paymentId_idx" ON "webhook_events"("paymentId");

-- ============================================================================
-- FOREIGN KEYS
-- ============================================================================

-- Payment belongs to Order (RESTRICT delete - cannot delete order with payments)
ALTER TABLE "payments" ADD CONSTRAINT "payments_orderId_fkey" 
    FOREIGN KEY ("orderId") REFERENCES "orders"("id") 
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- WebhookEvent belongs to Payment (CASCADE delete - delete events when payment deleted)
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_paymentId_fkey" 
    FOREIGN KEY ("paymentId") REFERENCES "payments"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE;

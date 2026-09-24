-- Product Search Optimization: pg_trgm indexes for ILIKE queries
-- ============================================================================
-- This migration adds GIN trigram indexes to improve the performance of
-- case-insensitive substring searches (ILIKE '%query%') on product fields.
--
-- The existing search semantics are UNCHANGED - users still search the same
-- way, and results are identical. This only optimizes the database execution
-- strategy for these queries.
--
-- Columns indexed:
--   - products."nameEn"  (English name)
--   - products."nameAr"  (Arabic name)
--   - products.sku       (SKU code)
--
-- These are the fields used by the product search in product.service.ts:
--   where.OR = [
--     { nameEn: { contains: search, mode: 'insensitive' } },
--     { nameAr: { contains: search, mode: 'insensitive' } },
--     { sku:    { contains: search, mode: 'insensitive' } },
--   ];
-- ============================================================================

-- Enable the pg_trgm extension (idempotent - safe to run if already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN trigram indexes for case-insensitive substring search
-- gin_trgm_ops is optimized for ILIKE '%pattern%' queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "products_nameEn_trgm_idx"
  ON products USING gin ("nameEn" gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "products_nameAr_trgm_idx"
  ON products USING gin ("nameAr" gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "products_sku_trgm_idx"
  ON products USING gin (sku gin_trgm_ops);

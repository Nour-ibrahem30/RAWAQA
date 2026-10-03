# Migration Drift Reconciliation

> **Status:** TECH DEBT - NOT PART OF KASHIER FEATURE  
> **Priority:** HIGH (blocks fresh environment deployments)  
> **Discovered:** October 3, 2026 during Kashier integration audit

## Summary

The production database schema has drifted from the Prisma migration history. This drift **predates the Kashier payment integration** and is unrelated to it.

A fresh database deployed using only migration history will NOT match production.

## Affected Areas

### 1. Products Table: `color` → `colors`

| State | Column | Type |
|-------|--------|------|
| Migration (`20260919004733_init_postgresql`) | `color` | `TEXT` (nullable string) |
| Production Database | `colors` | `TEXT[]` (array) |
| `schema.prisma` | `colors` | `String[] @default([])` |

**Impact:** Fresh DB gets wrong column type; application code expects array.

### 2. Categories Table: Missing `imageAlt`

| State | Column |
|-------|--------|
| Migration (`20260919004733_init_postgresql`) | Not present |
| Production Database | `imageAlt TEXT` exists |
| `schema.prisma` | `imageAlt String?` |

**Impact:** Fresh DB missing column; queries will fail.

### 3. Trigram Indexes: Missing from Production

| State | Indexes |
|-------|---------|
| Migration (`20260924013133_add_product_search_trgm_indexes`) | Creates 3 GIN trgm indexes |
| Production Database | Indexes DO NOT exist |
| `pg_trgm` extension | IS installed |

**Missing indexes:**
- `products_nameEn_trgm_idx`
- `products_nameAr_trgm_idx`
- `products_sku_trgm_idx`

**Impact:** Search performance degraded (not breaking, but suboptimal).

## Root Cause Analysis

The drift was likely caused by one or more of:

1. Schema changes applied via `prisma db push` without corresponding migrations
2. Manual SQL alterations to production
3. Migrations modified after being applied
4. Migration 2 (trgm indexes) may have failed silently or been marked applied without running

## Proposed Resolution

### Option A: Reconciliation Migration (RECOMMENDED)

Create a new migration that safely reconciles drift for both fresh and existing databases:

```sql
-- Migration: Reconcile pre-existing schema drift
-- 20261004000000_reconcile_schema_drift

-- 1. Handle color → colors column change (fresh DBs only)
DO $$
BEGIN
    -- If old 'color' column exists, drop it
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'products' AND column_name = 'color') THEN
        ALTER TABLE "products" DROP COLUMN "color";
    END IF;
    
    -- If 'colors' column doesn't exist, add it
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'products' AND column_name = 'colors') THEN
        ALTER TABLE "products" ADD COLUMN "colors" TEXT[] DEFAULT '{}';
    END IF;
END $$;

-- 2. Add imageAlt to categories (idempotent)
ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "imageAlt" TEXT;

-- 3. Create missing trgm indexes (idempotent)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "products_nameEn_trgm_idx" 
    ON products USING gin ("nameEn" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "products_nameAr_trgm_idx" 
    ON products USING gin ("nameAr" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "products_sku_trgm_idx" 
    ON products USING gin (sku gin_trgm_ops);
```

### Option B: Rewrite Init Migration (BREAKING)

Modify `20260919004733_init_postgresql` to match current schema.

⚠️ **NOT RECOMMENDED** - would invalidate existing deployments.

### Option C: Document and Manual Reconcile

Document that fresh deployments need manual SQL before migrations.

⚠️ **NOT RECOMMENDED** - error-prone, not reproducible.

## Action Items

- [ ] Create reconciliation migration (Option A)
- [ ] Test on isolated Neon branch first
- [ ] Mark as applied on production via `prisma migrate resolve --applied`
- [ ] Verify fresh DB deployment works end-to-end
- [ ] Update deployment documentation

## Related

- **Kashier Migration:** `20261003000000_add_kashier_payments` (SEPARATE - already resolved)
- **Branch:** To be created: `fix/migration-drift-reconciliation`

## Notes

This issue must be resolved before:
- Creating new environments from migrations alone
- CI/CD pipelines that spin up fresh databases
- Disaster recovery requiring full rebuild

This issue does NOT block:
- Kashier Manual E2E testing (uses existing production schema)
- Normal production operation
- Deploying Kashier feature (migrations already applied)

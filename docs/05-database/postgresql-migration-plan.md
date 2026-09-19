# PostgreSQL + Prisma Migration Plan — RAWAQA Production Backend

**Document Status:** Approved Migration Architecture  
**Target Branch:** `refactor/postgresql-prisma`  
**Base Branch:** `main`  
**Date:** September 2026  
**Applicability:** Production E-Commerce Backend (`backend/`)  

---

## 1. Executive Summary & Status Overview

This document defines the complete end-to-end migration strategy for moving the RAWAQA production e-commerce backend from **MongoDB Atlas + Mongoose** to **PostgreSQL 16+ + Prisma ORM**.

### Status Classification Matrix

| Component / Area | Status | Notes |
| :--- | :--- | :--- |
| **Branch Safety Setup (`refactor/postgresql-prisma`)** | **`IMPLEMENTED`** | Branch created from clean `main`. |
| **Comprehensive MongoDB Audit (`postgresql-migration-audit.md`)** | **`IMPLEMENTED`** | All 18 Mongoose models, queries, aggregations, and indexes audited. |
| **Migration Plan Specification (`postgresql-migration-plan.md`)** | **`IMPLEMENTED`** | This document. |
| **Prisma Dependencies & Configuration** | **`PLANNED`** | Installation of `prisma` and `@prisma/client`. |
| **PostgreSQL Schema Definition (`schema.prisma`)** | **`PLANNED`** | Normalization of 18 entities + relational constraints. |
| **Database Client Singleton (`src/lib/prisma.ts`)** | **`PLANNED`** | Development-safe, production-ready connection pool. |
| **Repository Layer Abstraction (`src/repositories/`)** | **`PLANNED`** | Clean separation of persistence from business services. |
| **Authentication & Session Migration** | **`REQUIRED`** | Zero regression on HTTP-only cookie JWT and refresh tokens. |
| **Transactional Checkout & Inventory Locking** | **`REQUIRED`** | Strict ACID concurrency-safe stock decrement; zero overselling. |
| **Catalog, Cart, Order, and Review Services Migration** | **`REQUIRED`** | Domain services migrated to repositories. |
| **Data Migration Script (`migrate-mongodb-to-postgres.ts`)** | **`REQUIRED`** | Full ETL with `--dry-run` and FK dependency ordering. |
| **Prisma Seed Script (`prisma/seed.ts`)** | **`PLANNED`** | Standard development/system seeder. |
| **Health Check & Diagnostic Endpoints** | **`REQUIRED`** | Live/Ready/Diagnostic with secret redaction. |
| **Test Suite PostgreSQL Migration** | **`REQUIRED`** | Unit, integration, and concurrency tests. |
| **Mongoose Deprecation & Cleanup** | **`PLANNED`** | Executed ONLY after complete verification. |

---

## 2. Current Architecture vs. Target Architecture

### 2.1. Current Architecture (MongoDB + Mongoose)
```
Frontend (Next.js 14)
       │ HTTP / JSON
       ▼
Express API Layer (backend/src/)
       │ Controllers & Direct Service Calls
       ▼
Mongoose ODM (backend/src/models/)
       │ MongoDB Wire Protocol
       ▼
MongoDB Atlas (Document Store / Replica Set)
```
*Limitations of current architecture:*
- Transient DNS lookup issues with MongoDB Atlas direct replica-set seeds (`getaddrinfo EAI_AGAIN`).
- Denormalized document arrays (`Product.images`, `Product.inventory`, `Order.items`, `Cart.items`) risk consistency drift.
- Lack of true relational foreign keys and database-level cascading.
- Floating-point numbers (`Number`) used for currency, creating rounding risks.

### 2.2. Target Architecture (PostgreSQL + Prisma)
```
Frontend (Next.js 14 — Zero Contract Changes)
       │ HTTP / JSON (HTTP-only Cookies for JWT)
       ▼
Express API Layer (backend/src/controllers/ & routes/)
       │
       ▼
Domain Services (backend/src/services/)
       │ Business Rules, Validation, Orchestration
       ▼
Repository Layer (backend/src/repositories/)
       │ Persistence Abstraction & Mapping
       ▼
Prisma ORM (backend/src/lib/prisma.ts)
       │ SQL Queries / ACID Transactions / Connection Pooling
       ▼
PostgreSQL 16+ (Relational Database)
```
*Benefits of target architecture:*
- Strict relational constraints (`FOREIGN KEY ... ON DELETE CASCADE/RESTRICT`).
- Exact financial precision via `DECIMAL(12, 2)` and Prisma `Decimal`.
- Native row-level locking (`SELECT ... FOR UPDATE`) and serializable transactions preventing inventory race conditions.
- Connection-pooling resilience over standard PostgreSQL wire protocol.

---

## 3. Database Schema Strategy

The schema normalizes MongoDB embedded subdocuments into relational tables while maintaining exact conceptual parity:

### 3.1. Entity Mapping & Normalization

| Existing Mongoose Model | PostgreSQL / Prisma Entity | Relationship / Normalization Notes |
| :--- | :--- | :--- |
| `User` | `User` | Maps 1:1. Retains role, authProvider, googleId, verification flags. |
| `RefreshSession` | `RefreshSession` | Belongs to `User` (`ON DELETE CASCADE`). |
| `OtpToken` | `OtpToken` | Belongs to `User` (`ON DELETE CASCADE`). |
| `Category` | `Category` | Normalized category tree with unique slugAr and slugEn. |
| `Product` | `Product` | Normalized core product fields, bilingual text, price, slugs, SKU. |
| *Product.images (array)* | `ProductImage` | Table linked to `Product` (`ON DELETE CASCADE`). |
| *Product.inventory (subdoc)* | `Inventory` | 1:1 dedicated table linked to `Product` for fast row-level locking. |
| `ShippingAddress` | `ShippingAddress` | Address book belonging to `User` (`ON DELETE CASCADE`). |
| `Cart` | `Cart` | Belongs to optional `User` or guest `sessionId`. |
| *Cart.items (array)* | `CartItem` | Table linked to `Cart` and `Product`. Unique `(cartId, productId)`. |
| `Order` | `Order` | Core order metadata, totals, status enums, shipping address snapshot. |
| *Order.items (array)* | `OrderItem` | Table linked to `Order` with checkout snapshot fields for immutability. |
| `Coupon` | `Coupon` | Discount rule definition with creator relation. |
| *Coupon.products/categories* | Join Tables | Implicit M:N relations via Prisma. |
| `CouponUsage` | `CouponUsage` | Tracks redemption per user and order (unique order constraint). |
| `Review` | `Review` | Unique `(productId, userId)` constraint. |
| `Wishlist` | `Wishlist` & M:N `Product` | Saved products per user. |
| `IdempotencyKey` | `IdempotencyKey` | Unique `key` with TTL/timeout tracking. |
| `OutboxEvent` | `OutboxEvent` | Transactional outbox with `lockedBy`, `lockedUntil` concurrency fields. |
| `ReconciliationReport` | `ReconciliationReport` | ERP sync logs with 1:M `ReconciliationDiscrepancy`. |
| `SiteSettings` | `SiteSettings` | Singleton config record (`key = 'default'`), colors as JSONB. |
| `Ad` | `Ad` | Promotional banners with placement enum and date filters. |
| `SiteContent` | `SiteContent` | Section content blocks with unique `section` and JSONB data. |

---

## 4. Migration Strategy

The migration executes in controlled stages without disrupting the existing codebase until verified:

```
Stage 1: Branch Setup & Audit (Complete)
   ↓
Stage 2: Prisma Schema & Client Setup
   ↓
Stage 3: Repository Layer Construction
   ↓
Stage 4: Service-by-Service Refactoring (Auth → Catalog → Cart → Checkout → Orders → Workers)
   ↓
Stage 5: Data Migration Tooling & Testing (Dry-Run & Real Execution)
   ↓
Stage 6: Test Suite Migration & Concurrency Verification
   ↓
Stage 7: Mongoose Deprecation & Final Cleanup
   ↓
Stage 8: Documentation, Verification, & Push
```

---

## 5. Data Integrity Strategy

1. **Monetary Safety:**
   - All price, subtotal, discount, shipping, and tax columns are typed `Decimal @db.Decimal(12, 2)`.
   - JavaScript operations will use `Prisma.Decimal` or strict integer-cent conversion to prevent precision loss.
2. **Referential Integrity:**
   - Foreign keys enforce parent-child integrity (`RESTRICT` on deleting categories with products or users with orders; `CASCADE` on cart items, product images, and sessions).
3. **Historical Audit Preservation:**
   - `OrderItem` stores snapshot data (`snapshotSku`, `snapshotNameAr`, `snapshotNameEn`, `snapshotPrice`, `snapshotImage`) ensuring historical orders remain intact even if products are subsequently renamed or archived.
4. **Unique Constraints:**
   - Enforced at the database level for `User.email`, `User.googleId`, `Product.sku`, `Product.slugAr`, `Product.slugEn`, `Category.slugAr`, `Category.slugEn`, `Coupon.code`, `Order.orderNumber`, `IdempotencyKey.key`.

---

## 6. Inventory Concurrency Strategy (Overselling Prevention)

### 6.1. The Concurrency Threat
Under concurrent traffic (e.g. flash sales or limited stock), two parallel requests can read available stock simultaneously and both proceed to reserve it, causing negative inventory (overselling).

### 6.2. The PostgreSQL Transaction Solution
All stock reservations will execute inside an interactive PostgreSQL transaction with an atomic conditional update:

```ts
await prisma.$transaction(async (tx) => {
  // Atomic conditional decrement:
  const result = await tx.inventory.updateMany({
    where: {
      productId: item.productId,
      availableQuantity: { gte: item.quantity }, // Guard condition
    },
    data: {
      reservedQuantity: { increment: item.quantity },
      availableQuantity: { decrement: item.quantity },
    },
  });

  if (result.count === 0) {
    // Immediate rollback of the entire transaction
    throw new InsufficientStockError(item.productId);
  }

  // Create order item ...
});
```

Because `updateMany` with a `gte` clause evaluates atomically under PostgreSQL row lock, only one concurrent transaction can succeed if stock is insufficient. The second transaction modifies 0 rows, triggers an exception, and rolls back cleanly.

---

## 7. Authentication & API Compatibility

### 7.1. Authentication Preservation
- **JWT & HTTP-Only Cookies:** Tokens continue to be signed using `JWT_SECRET`, set via `res.cookie('token', ...)` with identical `httpOnly`, `sameSite`, and `secure` configurations.
- **Refresh Session Rotation:** Stored in `refresh_sessions` table with SHA-256 token hashing and device fingerprinting.
- **Password Security:** Hashes are generated and verified using `bcryptjs` with identical salt rounds.
- **Roles & Permissions:** `customer`, `admin`, and `super_admin` enums mapped directly to PostgreSQL.

### 7.2. API Response Serialization
The Next.js frontend expects fields such as `id` (or `_id`) and formatted decimal prices.
- All repository/service outputs will map the PostgreSQL primary key `id` to both `id` and `_id` where necessary to maintain 100% backward compatibility.
- Decimal values returned in JSON will be serialized as numbers/strings matching the exact existing frontend contract.

---

## 8. Testing Strategy

1. **Unit Tests:** Validate repository methods, business logic calculations, coupon validations, and cart operations.
2. **Integration Tests:** Test HTTP endpoints using Supertest against a dedicated PostgreSQL test instance.
3. **Concurrency Stress Tests:** Simulate 10+ concurrent checkout requests competing for 1 unit of stock, verifying that exactly 1 succeeds and 9 fail gracefully without negative inventory.
4. **Health Check Tests:** Verify `/health/live`, `/health/ready`, and `/health/db-diagnostic` properly test PostgreSQL connection and redact sensitive connection details.

---

## 9. Rollback Strategy

1. **Branch Isolation:** All migration work is strictly isolated on branch `refactor/postgresql-prisma`.
2. **Non-Destructive Database Operations:** MongoDB Atlas remains untouched and fully active in production.
3. **Instant Rollback:** If any issue arises during testing, switching back requires only checking out `main` and deploying the existing container.
4. **Data Sync Fallback:** The data migration script is non-destructive and only reads from MongoDB.

---

## 10. Production Cutover Strategy

1. **Pre-Cutover:**
   - Deploy PostgreSQL database instance.
   - Run `npx prisma migrate deploy` on production PostgreSQL.
   - Execute dry-run data migration (`npm run migrate:mongodb:dry-run`).
2. **Maintenance Window (Cutover):**
   - Enable maintenance mode / drain incoming traffic.
   - Execute final data migration (`npm run migrate:mongodb`).
   - Run reconciliation validation (verify record counts and financial sums).
   - Switch application environment variable `DATABASE_URL` and deploy `refactor/postgresql-prisma` build.
   - Run automated health probes (`/health/ready`).
   - Re-enable public traffic.
3. **Post-Cutover:**
   - Monitor real-time logs and Sentry error tracking.
   - Keep MongoDB replica-set active in read-only standby for 14 days before retirement.

---

## 11. Documentation Plan

The following documents will be created/updated within the existing project documentation structure:
- `docs/03-architecture/backend-architecture.md` (Updated)
- `docs/05-database/postgresql-schema.md` (New)
- `docs/05-database/prisma.md` (New)
- `docs/05-database/mongo-to-postgres.md` (New)
- `docs/06-engineering/repository-pattern.md` (New)
- `docs/06-engineering/transactions.md` (New)
- `docs/09-testing/database-testing.md` (New)
- `docs/10-deployment/postgresql-production.md` (New)
- `README.md` (Updated to reflect PostgreSQL + Prisma stack)

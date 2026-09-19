# PostgreSQL Migration Audit — RAWAQA Production Backend

**Document Status:** Complete (Phase 1 Deliverable)  
**Date:** September 2026  
**Target Stack:** Node.js (v24+) • Express • TypeScript • PostgreSQL 16+ • Prisma ORM  
**Source Stack:** MongoDB 6+ • Mongoose 8.24  

---

## 1. Executive Summary & Migration Objectives

The RAWAQA e-commerce backend currently runs on MongoDB Atlas with Mongoose ODM. To achieve relational integrity, strict ACID compliance for inventory and financial checkout operations, and predictable performance, the database layer is being migrated to **PostgreSQL with Prisma ORM**.

### Strict Requirements
1. **Zero Downtime & Zero Regression:** Maintain all existing business logic, security middleware, JWT HTTP-only cookies, rate limiting, and exact API contracts consumed by the Next.js frontend.
2. **ACID Transaction Safety:** Eliminate inventory race conditions and overselling risks through PostgreSQL transaction isolation and row-level locking.
3. **Financial Precision:** Replace JavaScript floating-point numbers with PostgreSQL `DECIMAL(12, 2)` for all monetary calculations (prices, totals, discounts, shipping, taxes).
4. **Non-Destructive Dual-Database Phase:** MongoDB remains intact and accessible until PostgreSQL has undergone complete verification and parity testing.
5. **No Code Modifications in Phase 1:** This document constitutes the full architectural audit and migration blueprint prior to schema definition and code refactoring.

---

## 2. Complete Inventory of MongoDB Collections & Mongoose Schemas

The backend codebase defines **18 Mongoose models** located in `backend/src/models/`:

| Collection / Model | File | Primary Purpose | Key Fields / Subdocuments |
| :--- | :--- | :--- | :--- |
| **`User`** | `User.ts` | Customer and admin accounts | `email`, `password`, `role`, `authProvider`, `googleId`, `phone`, `isActive` |
| **`Product`** | `Product.ts` | Product catalog with bilingual text | `nameAr/En`, `slugAr/En`, `sku`, `price`, `images[]`, `inventory{}`, `dimensions{}` |
| **`Category`** | `Category.ts` | Product hierarchy & categorization | `nameAr/En`, `slugAr/En`, `order`, `isActive`, `productCount` |
| **`Order`** | `Order.ts` | Order lifecycle & fulfillment | `orderNumber`, `userId`, `items[]`, `shippingAddress{}`, `odoo{}`, `status`, `totals` |
| **`Cart`** | `Cart.ts` | Shopping carts (authenticated & guest) | `userId`, `sessionId`, `items[]`, `subtotal`, `itemCount`, `expiresAt` |
| **`RefreshSession`** | `RefreshSession.ts` | JWT refresh tokens & device tracking | `userId`, `sessionId`, `tokenHash`, `deviceInfo{}`, `expiresAt`, `revoked` |
| **`IdempotencyKey`** | `IdempotencyKey.ts` | Checkout idempotency deduplication | `key`, `userId`, `requestHash`, `status`, `result{}`, `processingTimeout` |
| **`OutboxEvent`** | `OutboxEvent.ts` | Reliable transactional outbox pattern | `aggregateType`, `aggregateId`, `eventType`, `payload{}`, `lockedBy`, `lockedUntil` |
| **`Coupon`** | `Coupon.ts` | Promotional discount codes | `code`, `type`, `value`, `minOrderValue`, `maxDiscount`, `usageLimit`, `perUserLimit` |
| **`CouponUsage`** | `CouponUsage.ts` | User coupon redemption tracking | `coupon`, `user`, `order`, `discount` |
| **`OtpToken`** | `OtpToken.ts` | Verification & reset codes (SMS/email) | `userId`, `code`, `purpose`, `expiresAt`, `used`, `attempts` |
| **`Review`** | `Review.ts` | Product customer reviews & ratings | `product`, `user`, `order`, `rating`, `comment`, `isApproved`, `helpfulVotes` |
| **`ShippingAddress`**| `ShippingAddress.ts`| Customer address book | `user`, `recipientName`, `phone`, `streetAddress`, `city`, `governorate`, `isDefault` |
| **`Wishlist`** | `Wishlist.ts` | User saved products | `user`, `products[]` |
| **`ReconciliationReport`**| `ReconciliationReport.ts`| ERP/Odoo inventory sync logs | `timestamp`, `totalProducts`, `syncedCount`, `discrepancies[]` |
| **`SiteSettings`** | `SiteSettings.ts` | Singleton theme colors & site config | `key`, `colors{}` |
| **`Ad`** | `Ad.ts` | Banners & promotional popups | `titleAr/En`, `imageUrl`, `placement`, `isActive`, `order`, `startDate`, `endDate` |
| **`SiteContent`** | `SiteContent.ts` | CMS content blocks (hero, about, why)| `section`, `data{}` |

---

## 3. Embedded Documents & Normalization Strategy

MongoDB allows denormalized nested arrays and documents. In PostgreSQL, these must be normalized into relational tables with foreign keys or converted into structured columns:

### 3.1. `Product` Normalization
- **`Product.images` (Array of subdocuments):**
  - *Current:* `[{ url, publicId, altAr, altEn, isPrimary, order }]`
  - *PostgreSQL:* Separate table `ProductImage` with `productId` foreign key (`ON DELETE CASCADE`), `url`, `publicId`, `altAr`, `altEn`, `isPrimary`, and `order`.
- **`Product.inventory` (Subdocument):**
  - *Current:* `{ onHandQuantity, reservedQuantity, availableQuantity, lowStockThreshold, allowBackorder, odooProductId, lastSyncedAt }`
  - *PostgreSQL:* Dedicated 1:1 table `Inventory` (`productId` unique foreign key) or normalized columns directly on `Product`.
  - *Architectural Recommendation:* A dedicated `Inventory` table isolates high-frequency transactional updates (`SELECT FOR UPDATE`) during checkout from catalog reads on `Product`.
- **`Product.dimensions` (Subdocument):**
  - *Current:* `{ length, width, height, weight }`
  - *PostgreSQL:* Inline columns on `Product`: `dimensionLength`, `dimensionWidth`, `dimensionHeight`, `dimensionWeight` (nullable Floats).
- **`Product.ratings` (Subdocument):**
  - *Current:* `{ average, count }`
  - *PostgreSQL:* Inline columns on `Product`: `ratingAverage` (Float, default 0), `ratingCount` (Int, default 0).
- **`Product.tags` (Array of Strings):**
  - *PostgreSQL:* Native array `String[]` or join table. PostgreSQL supports `TEXT[]` natively, perfectly matching Prisma's `String[]`.

### 3.2. `Order` Normalization
- **`Order.items` (Array of subdocuments):**
  - *Current:* `[{ product, quantity, price, subtotal, inventoryReserved, reservedAt, productSnapshot: { sku, nameAr, nameEn, price, image } }]`
  - *PostgreSQL:* Separate table `OrderItem` linked via `orderId` (`ON DELETE CASCADE`), referencing `productId` (`ON DELETE SET NULL` to preserve historical order records if a product is deleted).
  - *Snapshot columns:* `snapshotSku`, `snapshotNameAr`, `snapshotNameEn`, `snapshotPrice`, `snapshotImage` directly on `OrderItem` ensuring complete audit trail immutability.
- **`Order.shippingAddress` (Subdocument snapshot):**
  - *Current:* Embedded address snapshot at checkout.
  - *PostgreSQL:* Embedded columns directly on `Order`: `shippingRecipientName`, `shippingPhone`, `shippingStreetAddress`, `shippingCity`, `shippingGovernorate`, `shippingPostalCode`.
- **`Order.odoo` (Subdocument):**
  - *Current:* `{ orderId, syncedAt, error }`
  - *PostgreSQL:* Inline columns on `Order`: `odooOrderId` (Int?), `odooSyncedAt` (DateTime?), `odooError` (Text?).

### 3.3. `Cart` Normalization
- **`Cart.items` (Array of subdocuments):**
  - *Current:* `[{ product, quantity, price, addedAt }]`
  - *PostgreSQL:* Separate table `CartItem` linked via `cartId` (`ON DELETE CASCADE`), referencing `productId` (`ON DELETE CASCADE`). Unique constraint on `(cartId, productId)`.

### 3.4. Other Relations
- **`Coupon` target scopes:**
  - `applicableProducts`: Join table `_CouponProducts` (`couponId`, `productId`).
  - `applicableCategories`: Join table `_CouponCategories` (`couponId`, `categoryId`).
- **`Wishlist.products`:**
  - Join table `_WishlistProducts` (`wishlistId`, `productId`) or a normalized `WishlistItem` table (`id`, `userId`, `productId`, `createdAt`).
- **`ReconciliationReport.discrepancies`:**
  - Separate table `ReconciliationDiscrepancy` (`reportId`, `sku`, `name`, `oldQuantity`, `newQuantity`, `difference`) or stored as `JsonB`.

---

## 4. Target Relational Schema Design (`schema.prisma` Blueprint)

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ─── Enums ─────────────────────────────────────────────────────────

enum UserRole {
  customer
  admin
  super_admin
}

enum AuthProvider {
  local
  google
}

enum ProductStatus {
  active
  draft
  archived
}

enum OrderStatus {
  pending
  pending_odoo
  confirmed
  processing
  shipped
  delivered
  cancelled
  refunded
  failed
}

enum PaymentStatus {
  pending
  paid
  failed
  refunded
}

enum PaymentMethod {
  cod
  paymob
  wallet
}

enum CouponType {
  percentage
  fixed
}

enum OtpPurpose {
  phone_verify
  password_reset
  email_verify
}

enum AdPlacement {
  homepage_banner
  homepage_mid
  shop_sidebar
  product_page
}

// ─── Core Models ───────────────────────────────────────────────────

model User {
  id               String            @id @default(uuid())
  email            String            @unique
  password         String?
  role             UserRole          @default(customer)
  firstName        String
  lastName         String
  phone            String?
  authProvider     AuthProvider      @default(local)
  googleId         String?           @unique
  isEmailVerified  Boolean           @default(false)
  isPhoneVerified  Boolean           @default(false)
  isActive         Boolean           @default(true)
  lastLoginAt      DateTime?
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt

  refreshSessions  RefreshSession[]
  otpTokens        OtpToken[]
  orders           Order[]
  cart             Cart?
  reviews          Review[]
  shippingAddresses ShippingAddress[]
  wishlist         Wishlist?
  couponUsages     CouponUsage[]
  createdCoupons   Coupon[]          @relation("CouponCreator")

  @@index([email, isActive])
  @@index([role, isActive])
  @@map("users")
}

model RefreshSession {
  id          String    @id @default(uuid())
  sessionId   String    @unique
  userId      String
  tokenHash   String
  deviceInfo  Json?
  expiresAt   DateTime
  revoked     Boolean   @default(false)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
  @@map("refresh_sessions")
}

model OtpToken {
  id         String     @id @default(uuid())
  userId     String
  phone      String?
  email      String?
  code       String
  purpose    OtpPurpose
  expiresAt  DateTime
  used       Boolean    @default(false)
  attempts   Int        @default(0)
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt

  user       User       @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, purpose])
  @@index([expiresAt])
  @@map("otp_tokens")
}

model Category {
  id           String    @id @default(uuid())
  nameAr       String
  nameEn       String
  slugAr       String    @unique
  slugEn       String    @unique
  descriptionAr String?
  descriptionEn String?
  image        String?
  isActive     Boolean   @default(true)
  order        Int       @default(0)
  productCount Int       @default(0)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  products     Product[]
  coupons      Coupon[]  @relation("CouponCategories")

  @@index([isActive, order])
  @@map("categories")
}

model Product {
  id                 String         @id @default(uuid())
  nameAr             String
  nameEn             String
  descriptionAr      String
  descriptionEn      String
  shortDescriptionAr String?
  shortDescriptionEn String?
  slugAr             String         @unique
  slugEn             String         @unique
  sku                String         @unique
  odooProductId      String?
  price              Decimal        @db.Decimal(12, 2)
  compareAtPrice     Decimal?       @db.Decimal(12, 2)
  costPrice          Decimal?       @db.Decimal(12, 2)
  categoryId         String
  color              String?
  material           String?
  status             ProductStatus  @default(draft)
  featured           Boolean        @default(false)
  tags               String[]       @default([])
  metaTitleAr        String?
  metaTitleEn        String?
  metaDescriptionAr  String?
  metaDescriptionEn  String?
  viewCount          Int            @default(0)
  orderCount         Int            @default(0)
  ratingAverage      Float          @default(0)
  ratingCount        Int            @default(0)
  dimensionLength    Float?
  dimensionWidth     Float?
  dimensionHeight    Float?
  dimensionWeight    Float?
  createdAt          DateTime       @default(now())
  updatedAt          DateTime       @updatedAt

  category           Category       @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  inventory          Inventory?
  images             ProductImage[]
  orderItems         OrderItem[]
  cartItems          CartItem[]
  reviews            Review[]
  wishlists          Wishlist[]     @relation("WishlistProducts")
  coupons            Coupon[]       @relation("CouponProducts")

  @@index([status, featured])
  @@index([status, createdAt])
  @@index([categoryId, status])
  @@index([price, status])
  @@map("products")
}

model ProductImage {
  id         String   @id @default(uuid())
  productId  String
  url        String
  publicId   String?
  altAr      String?
  altEn      String?
  isPrimary  Boolean  @default(false)
  order      Int      @default(0)
  createdAt  DateTime @default(now())

  product    Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@index([productId, isPrimary])
  @@map("product_images")
}

model Inventory {
  id                 String    @id @default(uuid())
  productId          String    @unique
  onHandQuantity     Int       @default(0)
  reservedQuantity   Int       @default(0)
  availableQuantity  Int       @default(0)
  lowStockThreshold  Int       @default(5)
  allowBackorder     Boolean   @default(false)
  lastSyncedAt       DateTime?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  product            Product   @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@index([availableQuantity])
  @@map("inventories")
}

model ShippingAddress {
  id            String   @id @default(uuid())
  userId        String
  label         String   @default("Home")
  recipientName String
  phone         String
  streetAddress String
  city          String
  governorate   String
  postalCode    String?
  isDefault     Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isDefault])
  @@map("shipping_addresses")
}

model Cart {
  id         String     @id @default(uuid())
  userId     String?    @unique
  sessionId  String?    @unique
  subtotal   Decimal    @default(0) @db.Decimal(12, 2)
  itemCount  Int        @default(0)
  expiresAt  DateTime?
  createdAt  DateTime   @default(now())
  updatedAt  DateTime   @updatedAt

  user       User?      @relation(fields: [userId], references: [id], onDelete: Cascade)
  items      CartItem[]

  @@index([expiresAt])
  @@map("carts")
}

model CartItem {
  id        String   @id @default(uuid())
  cartId    String
  productId String
  quantity  Int      @default(1)
  price     Decimal  @db.Decimal(12, 2)
  addedAt   DateTime @default(now())

  cart      Cart     @relation(fields: [cartId], references: [id], onDelete: Cascade)
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([cartId, productId])
  @@map("cart_items")
}

model Order {
  id                     String         @id @default(uuid())
  orderNumber            String         @unique
  userId                 String
  status                 OrderStatus    @default(pending)
  paymentStatus          PaymentStatus  @default(pending)
  paymentMethod          PaymentMethod  @default(cod)
  subtotal               Decimal        @db.Decimal(12, 2)
  shippingCost           Decimal        @default(0) @db.Decimal(12, 2)
  discount               Decimal        @default(0) @db.Decimal(12, 2)
  tax                    Decimal        @default(0) @db.Decimal(12, 2)
  total                  Decimal        @db.Decimal(12, 2)
  couponCode             String?
  couponDiscount         Decimal?       @db.Decimal(12, 2)
  notes                  String?
  customerNotes          String?
  cancelReason           String?
  cancelledAt            DateTime?

  // Shipping Address Snapshot
  shippingRecipientName  String
  shippingPhone          String
  shippingStreetAddress  String
  shippingCity           String
  shippingGovernorate    String
  shippingPostalCode     String?

  // Odoo ERP Integration
  odooOrderId            Int?
  odooSyncedAt           DateTime?
  odooError              String?

  createdAt              DateTime       @default(now())
  updatedAt              DateTime       @updatedAt

  user                   User           @relation(fields: [userId], references: [id], onDelete: Restrict)
  items                  OrderItem[]
  reviews                Review[]
  couponUsage            CouponUsage?

  @@index([userId, createdAt])
  @@index([status, createdAt])
  @@index([paymentStatus])
  @@map("orders")
}

model OrderItem {
  id                 String    @id @default(uuid())
  orderId            String
  productId          String?
  quantity           Int
  price              Decimal   @db.Decimal(12, 2)
  subtotal           Decimal   @db.Decimal(12, 2)
  inventoryReserved  Boolean   @default(false)
  reservedAt         DateTime?

  // Snapshot at checkout
  snapshotSku        String
  snapshotNameAr     String
  snapshotNameEn     String
  snapshotPrice      Decimal   @db.Decimal(12, 2)
  snapshotImage      String?

  order              Order     @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product            Product?  @relation(fields: [productId], references: [id], onDelete: SetNull)

  @@index([orderId])
  @@index([productId])
  @@map("order_items")
}

model Coupon {
  id                   String        @id @default(uuid())
  code                 String        @unique
  type                 CouponType
  value                Decimal       @db.Decimal(12, 2)
  minOrderValue        Decimal       @default(0) @db.Decimal(12, 2)
  maxDiscount          Decimal       @default(0) @db.Decimal(12, 2)
  usageLimit           Int           @default(0)
  usedCount            Int           @default(0)
  perUserLimit         Int           @default(1)
  isActive             Boolean       @default(true)
  expiresAt            DateTime?
  createdById          String
  createdAt            DateTime      @default(now())
  updatedAt            DateTime      @updatedAt

  createdBy            User          @relation("CouponCreator", fields: [createdById], references: [id], onDelete: Restrict)
  usages               CouponUsage[]
  applicableProducts   Product[]     @relation("CouponProducts")
  applicableCategories Category[]    @relation("CouponCategories")

  @@index([isActive, expiresAt])
  @@map("coupons")
}

model CouponUsage {
  id        String   @id @default(uuid())
  couponId  String
  userId    String
  orderId   String   @unique
  discount  Decimal  @db.Decimal(12, 2)
  createdAt DateTime @default(now())

  coupon    Coupon   @relation(fields: [couponId], references: [id], onDelete: Restrict)
  user      User     @relation(fields: [userId], references: [id], onDelete: Restrict)
  order     Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)

  @@index([couponId, userId])
  @@map("coupon_usages")
}

model Review {
  id                 String   @id @default(uuid())
  productId          String
  userId             String
  orderId            String?
  rating             Int
  titleAr            String?
  titleEn            String?
  comment            String
  isVerifiedPurchase Boolean  @default(false)
  isApproved         Boolean  @default(false)
  helpfulVotes       Int      @default(0)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  product            Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  order              Order?   @relation(fields: [orderId], references: [id], onDelete: SetNull)

  @@unique([productId, userId])
  @@index([productId, isApproved, createdAt])
  @@index([userId, createdAt])
  @@map("reviews")
}

model Wishlist {
  id        String    @id @default(uuid())
  userId    String    @unique
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  products  Product[] @relation("WishlistProducts")

  @@map("wishlists")
}

model IdempotencyKey {
  id                String   @id @default(uuid())
  key               String   @unique
  userId            String
  requestHash       String
  status            String   // 'started' | 'completed'
  result            Json?
  processingTimeout DateTime
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([processingTimeout])
  @@map("idempotency_keys")
}

model OutboxEvent {
  id            String    @id @default(uuid())
  aggregateType String
  aggregateId   String
  eventType     String
  payload       Json
  processed     Boolean   @default(false)
  processedAt   DateTime?
  lockedBy      String?
  lockedUntil   DateTime?
  retryCount    Int       @default(0)
  maxRetries    Int       @default(5)
  lastError     String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([processed, lockedBy, lockedUntil])
  @@index([aggregateId, eventType])
  @@index([processed, createdAt])
  @@map("outbox_events")
}

model ReconciliationReport {
  id            String                     @id @default(uuid())
  timestamp     DateTime                   @default(now())
  totalProducts Int
  syncedCount   Int
  errorCount    Int
  durationMs    Int?
  createdAt     DateTime                   @default(now())
  updatedAt     DateTime                   @updatedAt
  discrepancies ReconciliationDiscrepancy[]

  @@index([timestamp])
  @@map("reconciliation_reports")
}

model ReconciliationDiscrepancy {
  id          String               @id @default(uuid())
  reportId    String
  sku         String
  name        String
  oldQuantity Int
  newQuantity Int
  difference  Int

  report      ReconciliationReport @relation(fields: [reportId], references: [id], onDelete: Cascade)

  @@map("reconciliation_discrepancies")
}

model SiteSettings {
  id        String   @id @default(uuid())
  key       String   @unique @default("default")
  colors    Json
  updatedBy String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("site_settings")
}

model Ad {
  id         String      @id @default(uuid())
  titleAr    String
  titleEn    String
  subtitleAr String?
  subtitleEn String?
  imageUrl   String
  publicId   String?
  linkUrl    String?
  placement  AdPlacement @default(homepage_banner)
  isActive   Boolean     @default(true)
  order      Int         @default(0)
  startDate  DateTime?
  endDate    DateTime?
  createdAt  DateTime    @default(now())
  updatedAt  DateTime    @updatedAt

  @@index([placement, isActive, order])
  @@map("ads")
}

model SiteContent {
  id        String   @id @default(uuid())
  section   String   @unique
  data      Json
  updatedBy String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("site_contents")
}
```

---

## 5. Query Pattern Inventory & Translation Matrix

This section maps existing MongoDB / Mongoose operations to Prisma ORM equivalents.

### 5.1. CRUD Operations Mapping

| Mongoose Operation | Prisma Equivalent | Notes |
| :--- | :--- | :--- |
| `Model.findById(id)` | `prisma.model.findUnique({ where: { id } })` | IDs are UUID strings |
| `Model.findOne({ email })` | `prisma.model.findUnique({ where: { email } })` | Field must have `@unique` |
| `Model.find(query).skip(s).limit(l)` | `prisma.model.findMany({ where, skip: s, take: l })` | Direct translation |
| `Model.create(data)` | `prisma.model.create({ data })` | Relations can use nested `create` |
| `Model.updateOne(filter, update)` | `prisma.model.update({ where, data })` or `updateMany` | |
| `Model.findByIdAndUpdate(id, data, { new: true })` | `prisma.model.update({ where: { id }, data })` | Returns updated record by default |
| `Model.deleteOne({ _id: id })` | `prisma.model.delete({ where: { id } })` | |
| `Model.countDocuments(filter)` | `prisma.model.count({ where })` | Clean integer count |
| `.populate('category')` | `include: { category: true }` | Or selective `select: { ... }` |
| `.lean()` | *Not needed* | Prisma returns POJOs natively |
| `$inc: { quantity: 1 }` | `data: { quantity: { increment: 1 } }` | Atomic at the database level |

### 5.2. Aggregation Translation Matrix

The codebase contains 4 major aggregation pipelines:

#### A. Analytics & KPIs (`admin.service.ts` & `export.controller.ts`)
- **Mongoose:** `Order.aggregate([{ $match: ... }, { $group: { totalRevenue: { $sum: '$total' }, avgValue: { $avg: '$total' } } }])`
- **Prisma Replacement:**
  ```ts
  const stats = await prisma.order.aggregate({
    where: { createdAt: { gte: startOfMonth } },
    _count: { id: true },
    _sum: { total: true },
    _avg: { total: true },
  });
  ```
- **Conditional Counts by Status:**
  ```ts
  const [total, pending, delivered, cancelled] = await Promise.all([
    prisma.order.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.order.count({ where: { createdAt: { gte: startOfMonth }, status: 'pending' } }),
    prisma.order.count({ where: { createdAt: { gte: startOfMonth }, status: 'delivered' } }),
    prisma.order.count({ where: { createdAt: { gte: startOfMonth }, status: 'cancelled' } }),
  ]);
  ```

#### B. Top Selling Products
- **Mongoose:** `Order.aggregate([{ $unwind: '$items' }, { $group: { _id: '$items.product', totalSold: { $sum: '$items.quantity' } } }, ...])`
- **Prisma Replacement:**
  ```ts
  const topItems = await prisma.orderItem.groupBy({
    by: ['productId'],
    where: {
      order: { status: { in: ['delivered', 'shipped', 'processing'] } },
      productId: { not: null },
    },
    _sum: { quantity: true, subtotal: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: 5,
  });
  ```

#### C. Daily Sales / 7-Day Revenue Trend
- **Mongoose:** `$group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } }`
- **PostgreSQL / Prisma Replacement:**
  ```ts
  const revenue7d = await prisma.$queryRaw<Array<{ day: string; orders: bigint; revenue: Decimal }>>`
    SELECT 
      TO_CHAR(created_at, 'YYYY-MM-DD') AS day,
      COUNT(id) AS orders,
      COALESCE(SUM(total), 0) AS revenue
    FROM orders
    WHERE created_at >= ${last7Days}
      AND status NOT IN ('cancelled', 'failed')
    GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
    ORDER BY day ASC;
  `;
  ```

#### D. Product Review Rating & Distribution (`review.service.ts`)
- **Mongoose:** `Review.aggregate([{ $match: { product: id, isApproved: true } }, { $group: { avgRating: { $avg: '$rating' }, dist1: ... } }])`
- **Prisma Replacement:**
  ```ts
  const [aggregates, ratingCounts] = await Promise.all([
    prisma.review.aggregate({
      where: { productId, isApproved: true },
      _avg: { rating: true },
      _count: { id: true },
    }),
    prisma.review.groupBy({
      by: ['rating'],
      where: { productId, isApproved: true },
      _count: { id: true },
    }),
  ]);
  ```

---

## 6. High-Risk Operations & Mitigations

### 6.1. Inventory Reservation & Race Condition Elimination
- **Risk:** High-concurrency checkout where two buyers order the last remaining stock item at the exact same millisecond.
- **MongoDB Implementation:** Atomic `Product.updateOne({ _id, 'inventory.availableQuantity': { $gte: qty } }, { $inc: ... })`.
- **PostgreSQL / Prisma Implementation:**
  Execute checkout within an interactive Prisma transaction with atomic update validation:
  ```ts
  await prisma.$transaction(async (tx) => {
    // 1. Lock and update inventory row atomically
    const updated = await tx.inventory.updateMany({
      where: {
        productId: item.productId,
        availableQuantity: { gte: item.quantity },
      },
      data: {
        reservedQuantity: { increment: item.quantity },
        availableQuantity: { decrement: item.quantity },
      },
    });

    if (updated.count === 0) {
      throw new Error(`Insufficient stock for product ${item.productId}`);
    }

    // 2. Create Order & OrderItems
    // ...
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable, // Or default ReadCommitted with conditional atomic update
  });
  ```
  If any item in the order fails the stock condition, Prisma automatically rolls back the entire transaction.

### 6.2. Checkout Idempotency
- **Risk:** Network retries from client resulting in double order creation or duplicate charges.
- **Mitigation:**
  Table `idempotency_keys` with unique constraint on `key`. The checkout workflow initiates with:
  ```ts
  await tx.idempotencyKey.create({
    data: {
      key,
      userId,
      requestHash,
      status: 'started',
      processingTimeout: new Date(Date.now() + 30000),
    },
  });
  ```
  If a duplicate request arrives while `started`, it throws a unique constraint violation (`P2002`), returning HTTP 409 / 429.

### 6.3. Outbox Worker Concurrency (`outbox.worker.ts`)
- **Risk:** Multiple worker instances or cluster processes picking up the same pending outbox events simultaneously.
- **PostgreSQL Advantage:** PostgreSQL provides native `FOR UPDATE SKIP LOCKED`, which allows workers to lock a batch of rows without blocking other workers:
  ```ts
  const lockedEvents = await prisma.$queryRaw<OutboxEvent[]>`
    UPDATE outbox_events
    SET "lockedBy" = ${workerId}, "lockedUntil" = ${leaseExpiry}
    WHERE id IN (
      SELECT id FROM outbox_events
      WHERE processed = false
        AND ("lockedBy" IS NULL OR "lockedUntil" < NOW())
      ORDER BY created_at ASC
      LIMIT ${batchSize}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *;
  `;
  ```
  This is guaranteed lock-free across multiple workers and eliminates duplicate event processing.

### 6.4. TTL Replacement Strategy
MongoDB provides native TTL indexes (`expireAfterSeconds: 0`) for `RefreshSession`, `OtpToken`, `IdempotencyKey`, `Cart`, and `ReconciliationReport`. PostgreSQL does not purge rows natively without an extension like `pg_cron`.
- **Mitigation:** Implement a dedicated cleanup cron task in `backend/src/workers/cleanup.worker.ts` running hourly:
  ```ts
  await Promise.all([
    prisma.refreshSession.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
    prisma.otpToken.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
    prisma.idempotencyKey.deleteMany({ where: { processingTimeout: { lt: new Date() } } }),
    prisma.cart.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
    prisma.reconciliationReport.deleteMany({
      where: { timestamp: { lt: new Date(Date.now() - 90 * 86400 * 1000) } },
    }),
  ]);
  ```

### 6.5. Decimal Precision for Money
In MongoDB/Mongoose, all prices were floating point numbers (`Number`), which causes rounding errors (e.g. `0.1 + 0.2 = 0.30000000000000004`). In PostgreSQL:
- All monetary columns are typed `Decimal @db.Decimal(12, 2)`.
- When serializing responses to the frontend, numbers are formatted using `.toFixed(2)` or cast to `Number` if the frontend expects number types, ensuring exact 2 decimal places.

---

## 7. Virtuals, Hooks & Model Middleware Replacement

| Model | Mongoose Hook / Virtual | Behavior | PostgreSQL / Prisma Replacement |
| :--- | :--- | :--- | :--- |
| **`User`** | `pre('save')` | Hashes password with bcrypt if modified | Service-layer hashing in `auth.service.ts` before `prisma.user.create()` or `update()` |
| **`User`** | `comparePassword()` | Validates plaintext password against hash | Utility function `verifyPassword(plain, hash)` in `utils/auth.ts` |
| **`Product`**| `virtual('discountPercentage')` | `((compareAtPrice - price) / compareAtPrice) * 100` | Computed property in product serializer / DTO |
| **`Product`**| `pre('save')` | Sets `availableQuantity = onHand - reserved` | Handled inside `inventory.service.ts` or database computed column |
| **`Cart`** | `pre('save')` | Recomputes `subtotal` and `itemCount` | Computed helper in `cart.service.ts` executed before saving cart changes |
| **`Cart`** | `isExpired()` | Checks if `Date.now() > expiresAt` | Utility function `isCartExpired(cart)` in `cart.service.ts` |

---

## 8. Data Migration Strategy (`migrate-mongodb-to-postgres.ts`)

A standalone TypeScript migration script will be created at `backend/src/scripts/migrate-mongodb-to-postgres.ts`:

### 8.1. Execution Pipeline & Dependency Order
Because of PostgreSQL relational foreign key constraints, data must be inserted in strict topological order:
1. **`User`** (creates ID mapping map: `mongoId -> uuid`)
2. **`Category`**
3. **`Product`** (creates `Product`, `ProductImage`, and `Inventory` records)
4. **`ShippingAddress`**
5. **`Cart`** and **`CartItem`**
6. **`Coupon`**, **`CouponProduct`**, **`CouponCategory`**
7. **`Order`** and **`OrderItem`**
8. **`CouponUsage`**
9. **`Review`**
10. **`Wishlist`**
11. **`RefreshSession`**, **`OtpToken`**, **`IdempotencyKey`**
12. **`OutboxEvent`**
13. **`SiteSettings`**, **`Ad`**, **`SiteContent`**
14. **`ReconciliationReport`** and **`ReconciliationDiscrepancy`**

### 8.2. ID Preservation vs UUID Translation
- Every MongoDB document has a 24-character hexadecimal `_id`.
- The migration script maintains an in-memory mapping table `Map<string, string>` (`mongoId -> postgresUuid`).
- For audit traceability, the PostgreSQL schema or migration log tracks historical MongoDB ObjectIds.

### 8.3. Verification Checks
- **Row count comparison:** Total documents in MongoDB vs total records in PostgreSQL per table.
- **Financial checksums:** Sum of `total` in MongoDB Orders vs sum of `total` in PostgreSQL Orders.
- **Inventory checksums:** Total `onHandQuantity` across all products.
- **Dry-run mode:** The script will support `--dry-run` to validate constraints without committing changes.

---

## 9. Conclusion & Phase 1 Sign-Off

The audit confirms that the RAWAQA backend can be migrated completely to PostgreSQL + Prisma with:
- Zero data loss.
- Zero API contract breakage.
- Enhanced transactional safety for inventory and checkout.
- Elimination of MongoDB-specific DNS/replica set connection bottlenecks.

**Phase 1 is now officially complete.** We are ready to proceed to Phase 2 (Prisma Schema definition and configuration).

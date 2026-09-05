# Data Dictionary — RAWAQA (MongoDB)

**Version:** 2.0
**Last Updated:** 2026-09-02
**Status:** Target schema — Not Yet Implemented
**Database:** MongoDB | **ODM:** Mongoose

> **⚠️ SUPERSEDED HISTORY:** Version 1.0 described PostgreSQL tables with SQL types (UUID, VARCHAR, DECIMAL, TIMESTAMPTZ, JSONB). That schema is superseded by DEC-003-MONGODB. Do NOT reference SQL types, Prisma models, or `DATABASE_URL` for this project.

---

## Type Reference

| Mongoose/MongoDB Type | Description |
|-----------------------|-------------|
| `ObjectId` | MongoDB's 12-byte BSON identifier. Default `_id`. |
| `String` | UTF-8 string |
| `Number` | IEEE 754 double (used for prices, quantities, sort orders) |
| `Boolean` | true / false |
| `Date` | BSON Date (UTC) |
| `Object` | Freeform embedded object (used for payloads) |
| `LocalizedString` | `{ ar: String, en: String }` — see Localization Pattern |
| `[SubDocument]` | Embedded array of typed sub-documents |

**Monetary values:** Stored as `Number` in EGP (e.g. `3450`, not `"EGP 3,450"`). Formatted for display in the frontend. This resolves ISSUE-008.

**Sensitivity levels:**

| Level | Examples |
|-------|----------|
| Public | Product name, price, category |
| Internal | Order totals, SKUs, status |
| Confidential | Phone, full name, address |
| Restricted | `passwordHash`, API keys (env only — never in DB) |

---

## Collection: `users`

| Field | Type | Required | Unique | Description |
|-------|------|----------|--------|-------------|
| `_id` | ObjectId | Auto | Yes | MongoDB primary key |
| `email` | String | Yes | Yes | Login email, lowercase-normalized |
| `phone` | String | Yes | Yes | Egyptian mobile, E.164 format (`+20xxxxxxxxx`) |
| `passwordHash` | String | Yes | No | bcrypt hash, cost ≥ 12. Never returned by API. |
| `fullName` | String | Yes | No | Customer display name |
| `role` | String enum | Yes | No | `'customer'` (default) or `'admin'` |
| `refreshTokenHash` | String | No | No | Hash of active refresh token. Null if no active session. |
| `savedAddresses` | Address[] | No | No | Embedded saved delivery addresses (see sub-doc below) |
| `createdAt` | Date | Auto | No | Mongoose `timestamps` |
| `updatedAt` | Date | Auto | No | Mongoose `timestamps` |

### Sub-document: `savedAddresses[]`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | Sub-document ID |
| `governorate` | String | Yes | Egyptian governorate (e.g. Cairo, Alexandria) |
| `city` | String | Yes | City or district |
| `street` | String | Yes | Street address |
| `notes` | String | No | Delivery instructions |
| `isDefault` | Boolean | No | Default delivery address flag |

---

## Collection: `categories`

| Field | Type | Required | Unique | Description |
|-------|------|----------|--------|-------------|
| `_id` | ObjectId | Auto | Yes | MongoDB primary key |
| `name` | LocalizedString | Yes | No | `{ ar: 'استرخاء', en: 'Relax' }` |
| `description` | LocalizedString | No | No | Optional category blurb |
| `slug` | String | Yes | Yes | Language-independent URL slug (`relax`, `game`, `kids`, `outdoor`) |
| `sortOrder` | Number | No | No | Display order in navigation / filters |
| `active` | Boolean | Yes | No | Hidden categories excluded from catalog |

**Seed values:**

| slug | name.en | name.ar |
|------|---------|---------|
| relax | Relax | استرخاء |
| game | Game | جيمنج |
| kids | Kids | أطفال |
| outdoor | Outdoor | خارجي |

---

## Collection: `products`

| Field | Type | Required | Unique | Description |
|-------|------|----------|--------|-------------|
| `_id` | ObjectId | Auto | Yes | MongoDB primary key |
| `slug` | String | Yes | Yes | URL slug (`cloud-lounger`). Language-independent. |
| `name` | LocalizedString | Yes | No | `{ ar: '...', en: 'The Cloud Lounger' }` |
| `description` | LocalizedString | Yes | No | Short description for product cards |
| `longDescription` | LocalizedString | No | No | Full description for PDP accordion sections |
| `categoryId` | ObjectId | Yes | No | Ref to `categories._id` |
| `basePrice` | Number | Yes | No | Default price in EGP (numeric). Variants may override. |
| `featured` | Boolean | No | No | `true` = shown in homepage featured section |
| `active` | Boolean | Yes | No | `false` = hidden from catalog |
| `images` | ProductImage[] | No | No | Embedded image array |
| `variants` | ProductVariant[] | Yes | No | Embedded variant array (min 1) |
| `createdAt` | Date | Auto | No | |
| `updatedAt` | Date | Auto | No | |

### Sub-document: `images[]`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | |
| `url` | String | Yes | Storage URL or relative path |
| `altText` | LocalizedString | No | `{ ar, en }` accessibility text |
| `sortOrder` | Number | No | Gallery display order |

### Sub-document: `variants[]`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | Variant sub-document ID |
| `sku` | String | Yes | Stock keeping unit. Globally unique (enforced by index on `products.variants.sku`). |
| `color` | String | No | Colour name in English (display formatting is frontend concern) |
| `size` | String | No | Size label (e.g. `Standard`, `Large`, `XL`) |
| `price` | Number | No | Price override in EGP. If absent, inherits `basePrice`. |
| `stockQuantity` | Number | Yes | Available stock. Minimum 0. |
| `active` | Boolean | No | `false` hides variant from selection |

**Note on colour/size localization:** Colour and size are stored as single English strings at MVP. Full localization of variant labels is a post-MVP consideration. The `variantLabel` snapshot on cart/order items handles display.

---

## Collection: `carts`

| Field | Type | Required | Unique | Description |
|-------|------|----------|--------|-------------|
| `_id` | ObjectId | Auto | Yes | |
| `userId` | ObjectId | No | No | Ref to `users._id`. Null for guest carts. |
| `sessionId` | String | No | Yes (sparse) | UUID v4. Required when `userId` is null. |
| `items` | CartItem[] | No | No | Embedded cart items |
| `expiresAt` | Date | No | No | TTL field. Guest carts expire after 7 days. Authenticated carts do not expire (set null). |
| `updatedAt` | Date | Auto | No | |

**Constraint:** Exactly one of `userId` or `sessionId` must be non-null. Enforced at application level.

### Sub-document: `items[]`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | |
| `productId` | ObjectId | Yes | Ref to `products._id` |
| `variantId` | ObjectId | Yes | Ref to embedded `products.variants._id` |
| `sku` | String | Yes | Snapshot of `variant.sku` at add-to-cart time |
| `productName` | LocalizedString | Yes | Snapshot `{ ar, en }` at add-to-cart time |
| `variantLabel` | String | Yes | e.g. `'Terracotta · Large'` |
| `priceSnapshot` | Number | Yes | Price (EGP) at add-to-cart time. Re-validated at checkout. |
| `quantity` | Number | Yes | Minimum 1 |

---

## Collection: `orders`

| Field | Type | Required | Unique | Description |
|-------|------|----------|--------|-------------|
| `_id` | ObjectId | Auto | Yes | |
| `orderNumber` | String | Yes | Yes | Format: `RWQ-{zero-padded sequential}` e.g. `RWQ-10483` |
| `userId` | ObjectId | No | No | Ref to `users._id`. Null for guest orders (DEC-013). |
| `status` | String enum | Yes | No | Order lifecycle status (see values below) |
| `subtotal` | Number | Yes | No | EGP sum of line totals |
| `shippingFee` | Number | Yes | No | EGP. `0` if subtotal ≥ 3000 EGP (free shipping threshold). |
| `total` | Number | Yes | No | `subtotal + shippingFee` |
| `paymentMethod` | String | Yes | No | `'cod'` (only valid value at MVP — DEC-005) |
| `customerSnapshot` | CustomerSnapshot | Yes | No | Immutable customer data captured at order time |
| `shippingAddress` | AddressSnapshot | Yes | No | Immutable address captured at order time |
| `items` | OrderItem[] | Yes | No | Immutable item snapshots (min 1) |
| `statusHistory` | StatusHistoryEntry[] | Auto | No | Append-only status change log |
| `odooOrderId` | String | No | No | Odoo `sale.order` ID. Null until synced. |
| `odooSyncStatus` | String enum | Yes | No | Odoo sync state (see values below) |
| `smsStatus` | String enum | Yes | No | SMS send state (see values below) |
| `createdAt` | Date | Auto | No | |
| `updatedAt` | Date | Auto | No | |

**`status` values:**
`pending` → `confirmed` → `preparing` → `shipped` → `delivered`
`cancelled` (allowed from `pending` and `confirmed` only)

**`odooSyncStatus` values:**
- `pending` — Order saved; sync not yet attempted
- `syncing` — Job in progress
- `synced` — Odoo sale order created successfully; `odooOrderId` is set
- `failed` — All retries exhausted
- `retrying` — Awaiting next scheduled retry

**`smsStatus` values:**
- `pending` — Not yet attempted
- `sent` — SMS delivered to provider
- `failed` — All retries exhausted
- `skipped` — SMS disabled (`SMS_ENABLED=false`) or phone invalid

### Sub-document: `customerSnapshot` (immutable after creation)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `fullName` | String | Yes | Name as entered at checkout |
| `phone` | String | Yes | E.164 format (`+20xxxxxxxxx`) |
| `email` | String | No | Optional — may be absent for guest orders |

### Sub-document: `shippingAddress` (immutable after creation)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `governorate` | String | Yes | Egyptian governorate |
| `city` | String | Yes | City or district |
| `street` | String | Yes | Full street address |
| `notes` | String | No | Delivery instructions |

### Sub-document: `items[]` (immutable after creation)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | |
| `productId` | ObjectId | Yes | Reference (informational; product may be deleted) |
| `variantId` | ObjectId | Yes | Reference (informational) |
| `sku` | String | Yes | SKU snapshot |
| `productName` | LocalizedString | Yes | `{ ar, en }` snapshot at purchase time |
| `variantLabel` | String | Yes | e.g. `'Terracotta · Large'` |
| `quantity` | Number | Yes | Min 1 |
| `unitPrice` | Number | Yes | EGP price at purchase time |
| `lineTotal` | Number | Yes | `unitPrice × quantity` |

### Sub-document: `statusHistory[]` (append-only)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | |
| `status` | String enum | Yes | Same enum as `orders.status` |
| `note` | String | No | Optional admin note |
| `createdAt` | Date | Auto | Timestamp of status change |

---

## Collection: `integrationLogs`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | |
| `orderId` | ObjectId | Yes | Ref to `orders._id` |
| `provider` | String enum | Yes | `'odoo'` or `'sms'` |
| `direction` | String | Yes | `'outbound'` (website → external) |
| `status` | String enum | Yes | `'success'` / `'failed'` / `'retry'` |
| `requestPayload` | Object | No | Sanitized request data. API keys redacted. Phone masked. |
| `responsePayload` | Object | No | Provider response body |
| `errorMessage` | String | No | Error description on failure |
| `attemptNumber` | Number | Yes | `1` = first attempt; increments on retry |
| `createdAt` | Date | Auto | |

---

## Indexes Summary

| Collection | Index | Type | Rationale |
|------------|-------|------|-----------|
| `users` | `{ email: 1 }` | Unique | Login lookup |
| `users` | `{ phone: 1 }` | Unique | Phone uniqueness, SMS lookup |
| `users` | `{ role: 1 }` | Regular | Admin list queries |
| `categories` | `{ slug: 1 }` | Unique | Category URL lookup |
| `products` | `{ slug: 1 }` | Unique | Product URL lookup |
| `products` | `{ 'variants.sku': 1 }` | Unique (sparse) | Global SKU uniqueness |
| `products` | `{ categoryId: 1, active: 1 }` | Compound | Shop category filter |
| `products` | `{ featured: 1, active: 1 }` | Compound | Homepage featured |
| `products` | `{ active: 1, basePrice: 1 }` | Compound | Price sort |
| `products` | Text on name + description | Text | Search |
| `carts` | `{ userId: 1 }` | Sparse | User cart lookup |
| `carts` | `{ sessionId: 1 }` | Unique (sparse) | Guest cart lookup |
| `carts` | `{ expiresAt: 1 }` | TTL | Auto-expire guest carts |
| `orders` | `{ orderNumber: 1 }` | Unique | Track order lookup |
| `orders` | `{ userId: 1 }` | Sparse | Customer order history |
| `orders` | `{ status: 1 }` | Regular | Admin order filter |
| `orders` | `{ createdAt: -1 }` | Regular | Default sort |
| `orders` | `{ odooSyncStatus: 1 }` | Regular | Failed sync admin view |
| `orders` | `{ 'customerSnapshot.phone': 1 }` | Regular | Order lookup by phone |
| `integrationLogs` | `{ orderId: 1, provider: 1 }` | Compound | Order log lookup |
| `integrationLogs` | `{ provider: 1, status: 1 }` | Compound | Failure dashboard |

---

## Mongoose Architecture Notes

Mongoose schemas and models map directly to these collections:

```
models/
├── User.ts           → users collection
├── Category.ts       → categories collection
├── Product.ts        → products collection (with variant/image sub-docs)
├── Cart.ts           → carts collection (with item sub-docs)
├── Order.ts          → orders collection (with snapshot + item sub-docs)
└── IntegrationLog.ts → integrationLogs collection
```

Controllers must not query Mongoose directly. All database access goes through:

```
repositories/
├── UserRepository.ts
├── CategoryRepository.ts
├── ProductRepository.ts
├── CartRepository.ts
├── OrderRepository.ts
└── IntegrationLogRepository.ts
```

---

## Related Documents

- Collection structure overview: `docs/05-database/ERD.md`
- Localization field pattern: `docs/03-architecture/Localization-Architecture.md`
- Security (sensitive field handling): `docs/08-security/Security-Specification.md`
- Database decision: `docs/00-ai/Decision-Log.md` DEC-003-MONGODB

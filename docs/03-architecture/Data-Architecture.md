# Data Architecture — RAWAQA

## Source of Truth

| Data | System of Record |
|------|------------------|
| Products, variants, stock | PostgreSQL (website DB) |
| Orders | PostgreSQL |
| Customers (website) | PostgreSQL |
| Fulfillment in ERP | Odoo (after sync) |
| SMS delivery status | Provider + `integration_logs` |

**Note:** Full inventory sync from Odoo is out of scope for MVP.

## Timestamps

All `created_at` / `updated_at` in UTC (TIMESTAMPTZ).

## IDs

- Internal: UUID v4  
- Public order reference: `RWQ-{sequence}`  
- Variant: SKU string (unique)

## Integrity

- FK constraints enforced  
- Order snapshots immutable (customer_snapshot, order_items prices)  
- Soft delete optional for products (`deleted_at`)

## Retention

| Data | Retention |
|------|-----------|
| Orders | 7 years (business requirement — confirm with client) |
| Integration logs | 1 year |
| Session/cart abandoned | 30 days purge job |

## PII Handling

Phone, email, address — confidential. See [Data-Dictionary.md](../05-database/Data-Dictionary.md) sensitivity levels.

## Analytics (Future)

Export orders to analytics warehouse — out of MVP scope.

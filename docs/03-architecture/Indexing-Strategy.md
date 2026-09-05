# Indexing Strategy — RAWAQA

Based on [../05-database/ERD.md](../05-database/ERD.md).

## Primary Indexes (MVP)

```sql
-- Products
CREATE INDEX idx_products_category ON products(category_id) WHERE active = true;
CREATE INDEX idx_products_featured ON products(featured) WHERE active = true;
CREATE INDEX idx_products_slug ON products(slug);

-- Variants
CREATE UNIQUE INDEX idx_variants_sku ON product_variants(sku);
CREATE INDEX idx_variants_product ON product_variants(product_id);

-- Orders
CREATE UNIQUE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);

-- Cart
CREATE INDEX idx_cart_user ON carts(user_id);
CREATE INDEX idx_cart_session ON carts(session_id);

-- Integration
CREATE INDEX idx_integration_order ON integration_logs(order_id);
CREATE INDEX idx_integration_provider_status ON integration_logs(provider, status);
```

## Query Patterns

| Query | Index used |
|-------|------------|
| Shop catalog by category | idx_products_category |
| Admin orders by status | idx_orders_status |
| Track by RWQ- number | idx_orders_number |
| Customer order history | idx_orders_user |

## Full-Text Search (Future)

`GIN` index on `products.name || description` when search volume warrants — optional post-MVP.

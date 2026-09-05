# Migration Plan — RAWAQA

**Status:** Planned — No migrations exist yet

**Canonical ERD:** [../05-database/ERD.md](../05-database/ERD.md)

---

## Principles

- All schema changes via numbered migrations only  
- Never edit production DB manually  
- Backup before each production migration  
- Migrations must be reversible where practical  

---

## Migration Sequence

| ID | Name | Contents |
|----|------|----------|
| M001 | init_users_categories | users, categories |
| M002 | products_variants_images | products, product_variants, product_images |
| M003 | carts | carts, cart_items |
| M004 | orders | orders, order_items, order_status_history |
| M005 | integration_logs | integration_logs |
| M006 | seed_products | 8 products from `js/main.js` PRODUCTS |
| M007 | seed_admin | Admin user (env-provided email) |

---

## Seed Data Mapping (M006)

From `main.js` PRODUCTS array:

| slug | name | cat | price (EGP) |
|------|------|-----|-------------|
| cloud-lounger | The Cloud Lounger | Relax | 3450 |
| nomad-sack | Nomad Sack | Relax | 2100 |
| gamers-nest | Gamer's Nest | Game | 2950 |
| mini-cloud | Mini Cloud — Kids Puff | Kids | 1650 |
| dune-roll | Outdoor Dune | Outdoor | 2700 |
| drift-sofa | The Drift Sofa Bag | Relax | 5200 |
| reading-nook | Reading Nook Puff | Relax | 2300 |
| poolside-roll | Poolside Roll | Outdoor | 1980 |

Each product gets at least one default variant with generated SKU.

---

## Deployment Migration Process

1. Backup production database  
2. Run migrations on staging → smoke test  
3. Run migrations on production during maintenance window  
4. Verify row counts and seed data  
5. Rollback plan: restore backup if migration fails  

---

## Rollback

- Keep down migrations for M001–M005 where safe  
- M006 seed: document DELETE script  
- Production rollback: restore from backup preferred over down migrations  

---

## Open Decisions

- ORM tool (Prisma, TypeORM, Alembic, etc.) — follows backend stack choice

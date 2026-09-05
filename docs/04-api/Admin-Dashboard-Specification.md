# Admin Dashboard Specification — RAWAQA

**Status:** Not Yet Implemented — Required for MVP

---

## Overview

Web-based admin interface for RAWAQA staff to manage products, orders, and view customers. Access restricted to users with `role=admin`.

**Budget portion:** Included in Backend Development (10,000 EGP) + Frontend (12,000 EGP).

---

## Dashboard Overview

| Widget | Data Source | Description |
|--------|-------------|-------------|
| Orders today | `GET /admin/dashboard` | Count since midnight |
| Pending orders | orders where status ∈ pending, confirmed, preparing | Needs action |
| Total products | active product count | Catalog size |
| Recent orders | Last 10 orders | Quick access table |
| Failed syncs (Planned) | orders where odoo_sync_status=failed | Ops alert |

---

## Product Management

### Create Product
- Fields: name, slug, description, long description, category, base_price, featured, active  
- Variants: colour, size, SKU, price override, stock_quantity  
- Images: multi-upload, sort order, alt text  

### Read / List
- Table: name, category, price, stock summary, active, actions  
- Search/filter by name, category  

### Update
- Edit all fields; add/remove variants  
- Stock adjustment with audit note (Planned)  

### Delete
- Soft delete (`active=false`) preferred over hard delete if orders reference product  

### Business Rules
- SKU unique across variants  
- Inactive products hidden from shop  
- Price in EGP  

---

## Order Management

### List View
- Columns: order_number, customer name, phone, total, status, date  
- Filter by status, date range  
- Sort by newest first  

### Order Detail
- Customer snapshot (name, phone, email)  
- Shipping address  
- Line items: product, variant, qty, unit price, line total  
- Subtotal, shipping, total  
- Status history timeline  
- Odoo sync status + odoo_order_id  
- SMS status  

### Status Updates
| From | To | Notes |
|------|-----|-------|
| pending | confirmed, cancelled | |
| confirmed | preparing, cancelled | |
| preparing | shipped | Optional tracking number field (Planned) |
| shipped | delivered | |

Updates append to `order_status_history` → drives customer Track Order timeline.

---

## Customer Management

- List: name, phone, email, order count, last order date  
- Detail: profile + linked orders (read-only)  
- No delete customer if orders exist (GDPR requests — manual process)

---

## Admin Security

| Control | Implementation |
|---------|----------------|
| Authentication | Admin login → JWT with role=admin |
| Authorization | Middleware on all `/admin/*` routes |
| Session | JWT expiry 24h; logout clears token |
| Route isolation | `/admin` not linked from public nav |
| HTTPS | Required in production |
| Audit | Log status changes with admin user ID |

---

## UI Approach (Recommended)

Extend project with `/admin` section:
- Option A: Separate `admin.html` + `admin.js` sharing API  
- Option B: Admin routes in same SPA with role-gated views  

Match RAWAQA design tokens where practical; prioritize data density and clarity over marketing aesthetics.

---

## API Reference

See [../04-api/API-Design.md](../04-api/API-Design.md) — Admin APIs section.

---

## Acceptance Criteria

- [ ] Admin can add product visible on shop within 1 minute  
- [ ] Admin can view and update order status  
- [ ] Non-admin receives 403 on admin routes  
- [ ] Dashboard KPIs accurate  

See [../02-requirements/FRS.md](../02-requirements/FRS.md) §9.

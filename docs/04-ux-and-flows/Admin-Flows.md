# Admin Flows — RAWAQA

**Status:** Not Yet Implemented

---

## Flow 1: Admin Login

1. Navigate to `/admin` (not linked from public site)  
2. Enter email + password  
3. System validates `role=admin`  
4. Redirect to dashboard  
5. JWT stored for subsequent requests  

**Failure:** Invalid credentials → error message; rate limit after 10 attempts.

---

## Flow 2: Dashboard Overview

1. View orders today, pending count, product count  
2. Scan recent orders list  
3. Click order → order detail  

---

## Flow 3: Create Product

1. Products → "Add product"  
2. Fill: name, description, category, price  
3. Add variants (colour, size, SKU, stock)  
4. Upload images  
5. Save → product `active=true`  
6. Verify on customer shop  

---

## Flow 4: Edit Product

1. Products list → select product  
2. Update fields or stock  
3. Save  
4. Changes reflect on shop immediately  

---

## Flow 5: Manage Orders

1. Orders list (filter by status)  
2. Open order → customer info, items, total  
3. Update status dropdown (e.g., preparing → shipped)  
4. Optional note  
5. Save → customer track timeline updates  

---

## Flow 6: Handle Failed Odoo Sync (Planned)

1. Dashboard shows failed sync alert  
2. Admin opens order → sees `odoo_sync_status=failed`  
3. Click "Retry sync"  
4. System re-queues Odoo job  

---

## Permissions

All admin flows require JWT with `role=admin`. Non-admin receives 403.

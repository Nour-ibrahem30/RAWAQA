# User Journeys — RAWAQA

## Journey 1: First Purchase (Happy Path)

| Step | User Action | System Response | Status |
|------|-------------|-----------------|--------|
| 1 | Lands on homepage | Hero, featured products, navigation | Implemented |
| 2 | Clicks "Explore Collection" | Routes to Shop | Implemented |
| 3 | Browses products | Grid from static `PRODUCTS` | Partial |
| 4 | Opens product detail | PDP with variants | Partial |
| 5 | Selects colour, size, qty | Client-side selection | Partial |
| 6 | Clicks "Add to Cart" | Toast + badge increment | Partial |
| 7 | Opens cart | Static cart lines | Partial |
| 8 | Clicks Checkout | Toast placeholder | **Not Yet Implemented** |
| 9 | Enters name, phone, address | Form validation | **Required** |
| 10 | Confirms order | Order saved, confirmation page | **Required** |
| 11 | Receives SMS | Provider API call | **Integration Required** |
| 12 | Order in Odoo | Backend push | **Integration Required** |

**Failure states (required):**
- Out of stock → block add to cart  
- Invalid phone → validation error  
- Odoo failure → order saved locally, retry queue, admin alert  
- SMS failure → order still confirmed; log for retry  

---

## Journey 2: Track Order

| Step | User Action | System Response | Status |
|------|-------------|-----------------|--------|
| 1 | Navigates to Track Order | Form with input | Implemented (UI) |
| 2 | Enters order number | — | Partial |
| 3 | Clicks Track | Shows timeline | Mock data only |
| 4 | Views status | Timeline + meta | **Required** — API lookup |

---

## Journey 3: Registered Customer — Order History

| Step | User Action | System Response | Status |
|------|-------------|-----------------|--------|
| 1 | Login | Auth API | **Not Yet Implemented** |
| 2 | View account / orders | Order list | **Required** |
| 3 | Open order detail | Line items, status | **Required** |

---

## Journey 4: Admin — Fulfill Order

| Step | User Action | System Response | Status |
|------|-------------|-----------------|--------|
| 1 | Admin login | JWT/session | **Required** |
| 2 | View orders dashboard | Order list with filters | **Required** |
| 3 | Open order | Customer info, items, total | **Required** |
| 4 | Update status to "Shipped" | DB update; optional SMS | **Required** |
| 5 | Verify in Odoo | Sync status field | **Planned** (status sync optional) |

---

## Journey 5: Admin — Add Product

| Step | User Action | System Response | Status |
|------|-------------|-----------------|--------|
| 1 | Navigate to Products | Product list | **Required** |
| 2 | Create product | Form: name, price, category, images | **Required** |
| 3 | Save | API persist + image upload | **Required** |
| 4 | Product live on shop | Frontend catalog refresh | **Required** |

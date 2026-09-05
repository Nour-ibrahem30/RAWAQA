# UX Flows — RAWAQA

> Canonical UX doc: [../07-ux/UX-Documentation.md](../07-ux/UX-Documentation.md)

## Primary Purchase Flow

```
Home → Shop → Product Detail → Add to Cart → Cart → Checkout → Confirmation
                                                      ↓
                                              SMS + Odoo (async)
```

**Status:** Steps through Cart = Partial; Checkout onward = Not Implemented

---

## Checkout Flow (Planned)

1. Review cart items and totals  
2. Enter customer name + phone (+ email optional)  
3. Enter delivery address (governorate, city, street)  
4. Review order summary  
5. Place order (COD)  
6. Confirmation page with RWQ- number  

---

## Authentication Flow (Planned)

```
Register/Login → JWT stored → Account nav visible → Order history
```

---

## Track Order Flow

```
Track page → Enter RWQ- number → Submit → Timeline + meta
```

**Current:** Mock data for RWQ-10482 only.

---

## Admin Flow (Planned)

```
Admin login → Dashboard → [Products | Orders] → Action → Save
```

---

## Error Recovery Flows

| Error | User action |
|-------|-------------|
| Stock conflict at checkout | Return to cart, adjust qty |
| Network error | Retry button |
| Invalid track number | Re-enter or contact support |

---

## Mobile Flow Notes

- Burger menu for nav (≤880px)  
- Sticky summary on cart (desktop); stacked on mobile  
- Checkout form single column on mobile  

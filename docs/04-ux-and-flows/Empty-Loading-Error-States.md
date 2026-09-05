# Empty, Loading, Error & Success States — RAWAQA

> See [../07-ux/UX-Documentation.md](../07-ux/UX-Documentation.md) for full table.

---

## Cart

| State | Design | Current |
|-------|--------|---------|
| **Loading** | Skeleton lines | Not implemented |
| **Empty** | "Your cart is empty" + Shop CTA | Not implemented (shows static items) |
| **Success** | Items + summary | Partial (static) |
| **Error** | Stock conflict message | Not implemented |

---

## Shop

| State | Design | Current |
|-------|--------|---------|
| **Loading** | Skeleton product cards | Not implemented |
| **Empty** | "No products match filters" | Not implemented |
| **Error** | Retry button | Not implemented |

---

## Checkout (Planned)

| State | Design |
|-------|--------|
| **Loading** | Disabled submit + spinner |
| **Validation error** | Inline field errors |
| **Server error** | Banner + retry |
| **Success** | Confirmation page |

---

## Track Order

| State | Design | Current |
|-------|--------|---------|
| **Initial** | Empty result area | Implemented |
| **Loading** | Spinner on button | Not implemented |
| **Success** | Timeline card | Mock only |
| **Error** | "Order not found" | Not implemented |

---

## Add to Cart (PDP)

| State | Current |
|-------|---------|
| **Success** | Toast "Added to your cart" | Implemented |
| **Error** | Out of stock toast | Not implemented |

---

## Global Toast

Implemented: `#toast` in `index.html`, `showToast()` in `main.js` — used for cart, lang switch, checkout placeholder.

---

## Retry / Recovery

All error states should offer:
- Clear message (plain language)  
- Primary action (Retry or Go back)  
- Secondary action (Contact support) where appropriate  

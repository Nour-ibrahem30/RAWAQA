# Information Architecture — RAWAQA

> See also [../07-ux/UX-Documentation.md](../07-ux/UX-Documentation.md)

## Sitemap

```
/ (Home)
├── /shop (All Products)
├── /product/:id (Product Detail)
├── /cart
├── /checkout (Planned)
├── /order-confirmation/:number (Planned)
├── /track
├── /login (Planned)
├── /register (Planned)
├── /account (Planned)
│   └── /account/orders
│   └── /account/orders/:id
└── /admin (Planned)
    ├── /admin/dashboard
    ├── /admin/products
    ├── /admin/orders
    └── /admin/customers
```

**Current SPA routes (client-side):** `home`, `shop`, `product`, `cart`, `track` via `data-route` in `main.js`.

---

## Navigation Model

| Level | Items |
|-------|-------|
| Primary | Shop, Collections, Why Rawaqa, About, Track Order |
| Utility | Search, Language, Cart |
| Footer | Shop categories, Support, Brand links |

---

## Route Groups

| Group | Auth | Pages |
|-------|------|-------|
| Public | None | Home, Shop, Product, Track |
| Commerce | Optional | Cart, Checkout |
| Account | Required | Profile, Orders |
| Admin | Admin JWT | Dashboard, Products, Orders |

---

## Content Hierarchy

1. **Brand / Story** — Hero, Moment, Why Rawaqa, Reviews  
2. **Commerce** — Categories → Products → Variants → Cart  
3. **Post-purchase** — Confirmation, Track, SMS  
4. **Operations** — Admin (separate from public nav)  

---

## Admin Module Map

| Module | Primary actions |
|--------|-----------------|
| Dashboard | View KPIs, recent orders |
| Products | CRUD, images, stock |
| Orders | List, detail, status |
| Customers | View, order history link |

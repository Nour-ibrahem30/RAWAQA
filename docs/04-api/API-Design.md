# API Design — RAWAQA

**Document ID:** RAWAQA-API-001
**Version:** 2.0
**Last Updated:** 2026-09-02
**Status:** Specification (API **Not Yet Implemented**)

> **⚠️ UPDATED:** Version 2.0 adds bilingual language negotiation (`Accept-Language`), guest checkout session pattern (`X-Session-ID`), and removes obsolete PostgreSQL/Prisma references. Stack is confirmed: Node.js + TypeScript + Express + MongoDB.

---

## Overview

The RAWAQA backend exposes a RESTful JSON API. All endpoints below are **Required** for production unless marked Optional.

**Base URL (production):** `https://api.rawaqa.example.com/v1` *(client to confirm domain)*
**Base URL (development):** `http://localhost:3000/api/v1`

---

## Standards

| Aspect | Convention |
|--------|------------|
| Format | JSON request/response |
| Auth | Bearer JWT in `Authorization` header |
| Guest Auth | `X-Session-ID` header (UUID v4) — for cart and checkout without JWT |
| Language | `Accept-Language: ar` or `Accept-Language: en` header on all requests |
| Dates | ISO 8601 UTC |
| Money | Numeric EGP (e.g. `3450` — **not** `"EGP 3,450"`) |
| Errors | `{ "error": { "code", "message", "details" } }` |
| Pagination | `?page=1&limit=20` → `{ data, meta: { total, page, limit } }` |

---

## Language Negotiation

All API responses for user-facing content are localised based on the `Accept-Language` request header.

### Request Header
```http
Accept-Language: ar
```
or
```http
Accept-Language: en
```

### Server Behaviour
| Header value | Language returned |
|-------------|------------------|
| `ar` | Arabic |
| `en` | English |
| Absent or unsupported | Arabic (default — DEC-023) |

### Customer-facing endpoints
Return a single resolved string for the requested language:
```json
{ "name": "الكرسي السحابي", "lang": "ar" }
```

### Admin endpoints (`/api/admin/*`)
Return both language values so admins can view and edit all content:
```json
{ "name": { "ar": "الكرسي السحابي", "en": "The Cloud Lounger" } }
```

### Missing Translation Fallback
If the requested language translation is absent, the other language is returned with a flag:
```json
{ "name": "The Cloud Lounger", "lang": "ar", "translationMissing": true }
```

---

## Guest Session Pattern

Cart and checkout operations support both authenticated users (JWT) and guests (`X-Session-ID`).

### Guest Identification
1. On first cart interaction without a JWT, the backend creates a guest cart and returns a `sessionId` (UUID v4).
2. The frontend stores `sessionId` and sends it on subsequent requests:

```http
X-Session-ID: 550e8400-e29b-41d4-a716-446655440000
```

### Auth Precedence
- If `Authorization: Bearer <jwt>` is present → authenticated user flow
- Else if `X-Session-ID` is present and valid UUID → guest flow
- Else → 401 on protected endpoints

### Cart Merge
When a guest user registers or logs in, the backend merges the guest cart (`sessionId`) into the user cart (`userId`). The guest cart is then deleted.

---

## Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | Public | Create customer account |
| POST | `/auth/login` | Public | Returns JWT + refresh token cookie |
| POST | `/auth/refresh` | Cookie (refresh token) | Issue new access token |
| POST | `/auth/logout` | User | Clear refresh token hash in DB |
| GET | `/auth/me` | User | Current user profile |

### POST `/auth/register`

**Request:**
```json
{
  "email": "user@example.com",
  "phone": "+201012345678",
  "password": "securePassword123",
  "full_name": "Nour Ahmed"
}
```

**Validation:**
- Email: valid format, unique  
- Phone: Egyptian mobile format `+20` or `01xxxxxxxxx`  
- Password: min 8 chars  

**Response 201:**
```json
{
  "user": { "id": "uuid", "email": "...", "full_name": "..." },
  "token": "eyJ..."
}
```

**Errors:** 400 validation, 409 email exists

---

## Products (Public)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/products` | Public | List with filters |
| GET | `/products/:id` | Public | Product detail |
| GET | `/categories` | Public | Category list |

### GET `/products`

**Query parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `category` | string | Relax, Game, Kids, Outdoor |
| `min_price` | number | Min price EGP |
| `max_price` | number | Max price EGP |
| `color` | string | Filter by colour |
| `in_stock` | boolean | In stock only |
| `q` | string | Search term |
| `sort` | string | `recommended`, `price_asc`, `price_desc`, `newest` |
| `page`, `limit` | number | Pagination |

**Response 200:**
```json
{
  "data": [
    {
      "id": "64a1b2c3d4e5f6a7b8c9d0e1",
      "slug": "cloud-lounger",
      "name": "الكرسي السحابي",
      "description": "وسادة جلوس فاخرة للاسترخاء...",
      "price": 3450,
      "currency": "EGP",
      "category": "relax",
      "images": [{ "url": "...", "alt": "..." }],
      "variants": [
        { "id": "...", "color": "Terracotta", "size": "Large", "sku": "CL-TR-L", "stock": 12, "price": 3450 }
      ],
      "inStock": true,
      "featured": true,
      "lang": "ar"
    }
  ],
  "meta": { "total": 8, "page": 1, "limit": 20 }
}
```

**Note:** `name` and `description` return the resolved language string (not `{ ar, en }` object). `price` is numeric EGP. `lang` confirms the language used. Admin product endpoints return `{ ar, en }` objects.

**Maps to current static data:** `PRODUCTS` array in `js/main.js` (to be replaced with API calls)

---

## Cart

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/cart` | JWT **or** X-Session-ID | Get active cart |
| POST | `/cart/items` | JWT **or** X-Session-ID | Add item |
| PATCH | `/cart/items/:itemId` | JWT **or** X-Session-ID | Update quantity |
| DELETE | `/cart/items/:itemId` | JWT **or** X-Session-ID | Remove item |
| DELETE | `/cart` | JWT **or** X-Session-ID | Clear cart |
| POST | `/cart/merge` | JWT (after login) | Merge guest cart into user cart |

### POST `/cart/items`

**Request:**
```json
{
  "productId": "64a1b2c3d4e5f6a7b8c9d0e1",
  "variantId": "64a1b2c3d4e5f6a7b8c9d0e2",
  "quantity": 2
}
```

**Validation:**
- `quantity` ≥ 1
- variant exists and is active
- sufficient stock for quantity

**Response 200:** Full cart object with computed subtotal. On first guest cart creation, response includes `sessionId`.

**Guest first-cart response example:**
```json
{
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "items": [...],
  "subtotal": 6900
}
```

---

## Orders

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/orders` | JWT **or** X-Session-ID | Create order (checkout) — guest or authenticated |
| GET | `/orders` | JWT | Customer order history (authenticated only) |
| GET | `/orders/:id` | JWT | Order detail (own only) |
| GET | `/orders/track/:orderNumber` | Public | Track by RWQ- number |

### POST `/orders` (Checkout)

Supports both **guest checkout** (DEC-013) and **authenticated checkout**.

**Request:**
```json
{
  "customer": {
    "fullName": "Nour Ahmed",
    "phone": "+201012345678",
    "email": "nour@example.com"
  },
  "shippingAddress": {
    "governorate": "Cairo",
    "city": "New Cairo",
    "street": "Street 90, Building 5",
    "notes": "Call before delivery"
  },
  "paymentMethod": "cod"
}
```

**Auth rules:**
- With JWT: `userId` taken from token; `customerSnapshot` still captured
- With `X-Session-ID`: `userId` = null; `customerSnapshot` is mandatory
- No auth at all: 401

**Business rules:**
1. Validate cart not empty (from JWT userId or X-Session-ID sessionId)
2. Re-validate stock for all items at checkout time
3. Calculate shipping: free if subtotal ≥ 3000 EGP, otherwise apply fee
4. Generate order number `RWQ-{sequential}`
5. Capture `customerSnapshot` and `shippingAddress` snapshot (immutable)
6. Save order with `status: confirmed`
7. Clear cart
8. Enqueue `odoo-sync` job (async — DEC-009)
9. Enqueue `sms-send` job (async — DEC-010)

**Response 201:**
```json
{
  "order": {
    "id": "64a1b2c3d4e5f6a7b8c9d0e1",
    "orderNumber": "RWQ-10483",
    "status": "confirmed",
    "subtotal": 5100,
    "shippingFee": 0,
    "total": 5100,
    "currency": "EGP",
    "items": [...],
    "createdAt": "2026-09-02T17:00:00Z"
  }
}
```

**Note:** All monetary values are numeric EGP (`5100`, not `"EGP 5,100"`).

**Errors:** 400 validation, 401 no auth, 409 stock conflict, 422 empty cart

---

## Admin APIs

All require `Authorization: Bearer` with `role: admin`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/dashboard` | KPIs |
| GET/POST | `/admin/products` | List/create products |
| GET/PATCH/DELETE | `/admin/products/:id` | Product CRUD |
| GET | `/admin/orders` | List orders (filter by status) |
| GET | `/admin/orders/:id` | Order detail |
| PATCH | `/admin/orders/:id/status` | Update status |
| GET | `/admin/customers` | Customer list |

### PATCH `/admin/orders/:id/status`

**Request:**
```json
{ "status": "shipped", "note": "Handed to courier" }
```

**Allowed transitions:**
`pending` → `confirmed` → `preparing` → `shipped` → `delivered`  
`cancelled` (from pending/confirmed only)

---

## Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Phone number is invalid",
    "details": [{ "field": "phone", "message": "Must be valid Egyptian mobile" }]
  }
}
```

| HTTP | Code | When |
|------|------|------|
| 400 | VALIDATION_ERROR | Invalid input |
| 401 | UNAUTHORIZED | Missing/invalid token |
| 403 | FORBIDDEN | Insufficient role |
| 404 | NOT_FOUND | Resource missing |
| 409 | CONFLICT | Stock, duplicate |
| 422 | UNPROCESSABLE | Business rule violation |
| 500 | INTERNAL_ERROR | Server error |
| 503 | SERVICE_UNAVAILABLE | DB down |

---

## Rate Limiting (Required)

| Endpoint group | Limit |
|----------------|-------|
| Public catalog | 100 req/min/IP |
| Auth | 10 req/min/IP |
| Checkout | 5 req/min/IP |
| Admin | 60 req/min/user |

---

## OpenAPI

Full skeleton: [openapi.yaml](../04-api/openapi.yaml)

---

## Current Frontend → API Migration Notes

| Current (`main.js`) | Target API | Notes |
|---------------------|------------|-------|
| `PRODUCTS` array | `GET /products` | Replace static array; send `Accept-Language` header |
| `productCard()` / `fillProduct()` | Response mapping | Map `name`, `description` directly (already resolved string) |
| `cartCount` increment | `POST /cart/items` | Get `sessionId` from first response if guest |
| Static cart HTML | `GET /cart` render | Wire to real cart data |
| `checkout-note` toast | `POST /orders` | Send `X-Session-ID` or JWT |
| Track demo (RWQ-10482) | `GET /orders/track/:number` | Replace hardcoded demo |

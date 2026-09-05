# RAWAQA 2.0 - Backend API Documentation

## Overview

Production-grade e-commerce backend with:
- **48 API Endpoints** across 6 modules
- **Atomic Inventory Management** with MongoDB transactions
- **True Refresh Token Rotation** with session tracking
- **Idempotency Keys** for checkout operations
- **Outbox Pattern** for reliable event processing
- **Odoo ERP Integration** for inventory sync
- **SMS Notifications** (Vonage) in Arabic/English

---

## Base URL

```
Development: http://localhost:5002/api
Production: https://api.rawaqa.com/api
```

---

## Authentication

### Endpoints

#### 1. Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "Ahmed Mohamed",
  "email": "ahmed@example.com",
  "phone": "+201234567890",
  "password": "SecurePass@123"
}

Response: 201 Created
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": { "id": "...", "name": "Ahmed Mohamed", "email": "...", "role": "customer" },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

#### 2. Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "ahmed@example.com",
  "password": "SecurePass@123"
}

Response: 200 OK
{
  "success": true,
  "data": {
    "user": { ... },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

#### 3. Refresh Token (True Rotation)
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}

Response: 200 OK
{
  "success": true,
  "data": {
    "accessToken": "...",
    "refreshToken": "..." // NEW token issued, old one invalidated
  }
}
```

#### 4. Logout
```http
POST /api/auth/logout
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "refreshToken": "eyJhbGc..."
}

Response: 200 OK
```

#### 5. Get Current User
```http
GET /api/auth/me
Authorization: Bearer <accessToken>

Response: 200 OK
{
  "success": true,
  "data": {
    "id": "...",
    "name": "Ahmed Mohamed",
    "email": "ahmed@example.com",
    "role": "customer",
    "phone": "+201234567890"
  }
}
```

#### 6. Update Profile
```http
PUT /api/auth/profile
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "name": "Ahmed Ali Mohamed",
  "phone": "+201098765432"
}
```

#### 7. Change Password
```http
PUT /api/auth/password
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "currentPassword": "OldPass@123",
  "newPassword": "NewPass@456"
}
```

---

## Products

### Public Endpoints

#### 1. List Products (with filters)
```http
GET /api/products?page=1&limit=20&category=bean-bags&minPrice=500&maxPrice=2000&sort=price&order=asc&search=كرسي

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "id": "...",
      "sku": "BB-001",
      "nameAr": "كرسي فوم كبير",
      "nameEn": "Large Bean Bag Chair",
      "descriptionAr": "...",
      "descriptionEn": "...",
      "price": 1200,
      "compareAtPrice": 1500,
      "images": ["url1.jpg", "url2.jpg"],
      "category": { "id": "...", "nameAr": "كراسي فوم", "nameEn": "Bean Bags" },
      "inventory": {
        "availableQuantity": 25,
        "lowStockThreshold": 5
      },
      "featured": true,
      "status": "active"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "pages": 8
  }
}
```

#### 2. Get Single Product
```http
GET /api/products/:id

Response: 200 OK
```

#### 3. Get Product by SKU
```http
GET /api/products/sku/:sku

Response: 200 OK
```

#### 4. Get Featured Products
```http
GET /api/products/featured?limit=10

Response: 200 OK
```

#### 5. Get Low Stock Products (Admin)
```http
GET /api/products/low-stock?threshold=10
Authorization: Bearer <admin-token>

Response: 200 OK
```

#### 6. Get Related Products
```http
GET /api/products/:id/related?limit=5

Response: 200 OK
```

### Admin Endpoints

#### 7. Create Product
```http
POST /api/products
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "sku": "BB-005",
  "nameAr": "كرسي فوم متوسط",
  "nameEn": "Medium Bean Bag",
  "descriptionAr": "كرسي فوم مريح...",
  "descriptionEn": "Comfortable bean bag...",
  "price": 950,
  "compareAtPrice": 1200,
  "category": "category-id",
  "images": ["url1.jpg", "url2.jpg"],
  "inventory": {
    "onHandQuantity": 50,
    "reservedQuantity": 0,
    "lowStockThreshold": 5
  },
  "featured": false
}

Response: 201 Created
```

#### 8. Update Product
```http
PUT /api/products/:id
Authorization: Bearer <admin-token>

Response: 200 OK
```

#### 9. Delete Product (Soft Delete)
```http
DELETE /api/products/:id
Authorization: Bearer <admin-token>

Response: 200 OK
```

---

## Categories

### Public Endpoints

#### 1. List Categories
```http
GET /api/categories?includeProducts=true

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "id": "...",
      "nameAr": "كراسي فوم",
      "nameEn": "Bean Bags",
      "descriptionAr": "...",
      "descriptionEn": "...",
      "slug": "bean-bags",
      "image": "category.jpg",
      "productCount": 24,
      "status": "active"
    }
  ]
}
```

#### 2. Get Category by ID
```http
GET /api/categories/:id?includeProducts=true

Response: 200 OK
```

#### 3. Get Category by Slug
```http
GET /api/categories/slug/:slug

Response: 200 OK
```

#### 4. Get Active Categories
```http
GET /api/categories/active

Response: 200 OK
```

### Admin Endpoints

#### 5. Create Category
```http
POST /api/categories
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "nameAr": "وسائد",
  "nameEn": "Pillows",
  "descriptionAr": "وسائد مريحة",
  "descriptionEn": "Comfortable pillows",
  "slug": "pillows",
  "image": "pillows.jpg"
}

Response: 201 Created
```

#### 6. Update Category
```http
PUT /api/categories/:id
Authorization: Bearer <admin-token>

Response: 200 OK
```

#### 7. Delete Category
```http
DELETE /api/categories/:id
Authorization: Bearer <admin-token>

Response: 200 OK
```

#### 8. Reorder Categories
```http
PUT /api/categories/reorder
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "categoryIds": ["id1", "id2", "id3"]
}

Response: 200 OK
```

---

## Cart

### Endpoints

#### 1. Get Cart
```http
GET /api/cart
Authorization: Bearer <accessToken> (optional for guest)

Response: 200 OK
{
  "success": true,
  "data": {
    "id": "...",
    "items": [
      {
        "product": {
          "id": "...",
          "nameAr": "كرسي فوم كبير",
          "nameEn": "Large Bean Bag",
          "price": 1200,
          "images": ["..."]
        },
        "quantity": 2,
        "price": 1200,
        "total": 2400
      }
    ],
    "itemCount": 2,
    "subtotal": 2400
  }
}
```

#### 2. Add to Cart
```http
POST /api/cart/items
Authorization: Bearer <accessToken> (optional)
Content-Type: application/json

{
  "productId": "product-id",
  "quantity": 2
}

Response: 200 OK
```

#### 3. Update Cart Item
```http
PUT /api/cart/items/:productId
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "quantity": 3
}

Response: 200 OK
```

#### 4. Remove from Cart
```http
DELETE /api/cart/items/:productId
Authorization: Bearer <accessToken>

Response: 200 OK
```

#### 5. Clear Cart
```http
DELETE /api/cart
Authorization: Bearer <accessToken>

Response: 200 OK
```

#### 6. Merge Guest Cart (on login)
```http
POST /api/cart/merge
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "guestCartId": "guest-cart-id"
}

Response: 200 OK
```

#### 7. Calculate Totals
```http
GET /api/cart/totals?governorate=Cairo
Authorization: Bearer <accessToken>

Response: 200 OK
{
  "success": true,
  "data": {
    "subtotal": 2400,
    "shipping": 50,
    "tax": 336,
    "total": 2786
  }
}
```

---

## Checkout

### Endpoints

#### 1. Process Checkout (Atomic + Idempotency)
```http
POST /api/checkout
Authorization: Bearer <accessToken>
Idempotency-Key: unique-key-123
Content-Type: application/json

{
  "cartId": "cart-id",
  "shippingAddress": {
    "recipientName": "Ahmed Mohamed",
    "phone": "+201234567890",
    "streetAddress": "123 Main Street",
    "city": "Cairo",
    "governorate": "Cairo",
    "postalCode": "11511"
  },
  "paymentMethod": "cash_on_delivery",
  "notes": "Please call before delivery"
}

Response: 201 Created
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "id": "...",
    "orderNumber": "RWQ20260903001",
    "status": "pending",
    "items": [...],
    "subtotal": 2400,
    "shippingCost": 50,
    "tax": 336,
    "total": 2786,
    "paymentMethod": "cash_on_delivery",
    "shippingAddress": {...}
  },
  "fromCache": false
}
```

#### 2. Cancel Order
```http
POST /api/checkout/cancel/:orderId
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "reason": "Customer requested cancellation"
}

Response: 200 OK
```

#### 3. Confirm Delivery (Admin)
```http
POST /api/checkout/confirm-delivery/:orderId
Authorization: Bearer <admin-token>

Response: 200 OK
```

---

## Orders

### User Endpoints

#### 1. Get My Orders
```http
GET /api/orders/my?page=1&limit=10
Authorization: Bearer <accessToken>

Response: 200 OK
{
  "success": true,
  "data": [
    {
      "id": "...",
      "orderNumber": "RWQ20260903001",
      "status": "pending",
      "total": 2786,
      "createdAt": "2026-09-03T10:30:00Z"
    }
  ],
  "pagination": {...}
}
```

#### 2. Get Order by ID
```http
GET /api/orders/:id
Authorization: Bearer <accessToken>

Response: 200 OK
```

#### 3. Get Order by Number
```http
GET /api/orders/number/:orderNumber
Authorization: Bearer <accessToken>

Response: 200 OK
```

#### 4. Get Order Statistics
```http
GET /api/orders/stats
Authorization: Bearer <accessToken>

Response: 200 OK
{
  "success": true,
  "data": {
    "totalOrders": 15,
    "totalRevenue": 28500,
    "avgOrderValue": 1900,
    "pendingOrders": 3,
    "deliveredOrders": 10
  }
}
```

### Admin Endpoints

#### 5. List All Orders
```http
GET /api/orders?page=1&limit=20&status=pending
Authorization: Bearer <admin-token>

Response: 200 OK
```

#### 6. Update Order Status
```http
PUT /api/orders/:id/status
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "status": "processing",
  "notes": "Order being prepared"
}

Response: 200 OK
```

#### 7. Update Payment Status
```http
PUT /api/orders/:id/payment
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "paymentStatus": "paid"
}

Response: 200 OK
```

#### 8. Add Tracking Info
```http
PUT /api/orders/:id/tracking
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "trackingNumber": "TRK123456789",
  "carrier": "Aramex"
}

Response: 200 OK
```

---

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "ErrorType",
  "message": "Human-readable error message"
}
```

### HTTP Status Codes

- `200 OK` - Success
- `201 Created` - Resource created
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Idempotency key conflict
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

---

## Rate Limiting

- **Global**: 100 requests per 15 minutes
- **Auth endpoints**: 10 requests per 15 minutes

---

## Features

### ✅ Atomic Inventory Management
- Inventory reserved during checkout
- Released on order cancellation
- Deducted on delivery confirmation
- MongoDB transactions ensure consistency

### ✅ True Refresh Token Rotation
- New refresh token issued on every refresh
- Old token immediately invalidated
- Session tracking with jti (session ID)
- bcrypt hash stored in database

### ✅ Idempotency
- Unique keys for checkout operations
- SHA-256 request hash validation
- 24-hour TTL
- Prevents duplicate orders

### ✅ Outbox Pattern
- Reliable event processing
- Atomic lease with worker concurrency
- Automatic retries on failure
- Exactly-once delivery guarantee

### ✅ Background Workers
- **Outbox Worker**: Processes events every 5 seconds
- **Inventory Reconciliation**: Syncs with Odoo every hour

### ✅ SMS Notifications (Arabic)
- Order confirmation
- Order shipped
- Order delivered
- Order cancelled

---

## Tech Stack

- **Runtime**: Node.js 24.x
- **Framework**: Express.js
- **Language**: TypeScript (strict mode)
- **Database**: MongoDB 8.x with Mongoose
- **Authentication**: JWT with bcryptjs
- **SMS**: Vonage (formerly Nexmo)
- **ERP Integration**: Odoo XML-RPC
- **Logging**: Winston with daily rotation
- **Security**: Helmet, CORS, Rate Limiting, Sanitization

---

## Total API Count

- **Auth**: 7 endpoints
- **Products**: 9 endpoints
- **Categories**: 8 endpoints
- **Cart**: 7 endpoints
- **Checkout**: 3 endpoints
- **Orders**: 8 endpoints + 6 admin

**Total: 48 Production-Ready API Endpoints**

---

## Health Check

```http
GET /health

Response: 200 OK
{
  "status": "ok",
  "timestamp": "2026-09-03T12:00:00Z",
  "uptime": 3600,
  "environment": "development",
  "database": "connected"
}
```

---

**RAWAQA 2.0 Backend - Built with ❤️ in Egypt 🇪🇬**

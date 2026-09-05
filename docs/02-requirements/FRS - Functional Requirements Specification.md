# Functional Requirements Specification (Detailed) — RAWAQA

**Reference:** Short FRS at [FRS.md](FRS.md) | **Status:** Specification for Required features

---

## 3.1 Add to Cart

**Function Name:** AddProductToCart

**Purpose:** Add selected product variant and quantity to the customer's cart.

**Users:** Guest (session cart), registered customer

**Trigger / Entry Point:** PDP "Add to Cart" button (`#addToCartBtn`)

**UI/Screen Description:** Product detail page; toast "Added to your cart"; cart badge updates.

**Current Status:** **Partial** — badge increment only in `main.js`; no persistence.

**Inputs:**
- `product_id` (string slug)
- `variant_id` (UUID)
- `quantity` (integer ≥ 1)

**Business Logic:**
1. Validate variant exists and is active  
2. Check `stock_quantity >= quantity`  
3. Upsert cart line (merge if same variant)  
4. Recalculate cart subtotal  

**Outputs:** Updated cart object; HTTP 200

**Validation:** quantity ≥ 1; variant belongs to product

**Error Handling:** 409 if insufficient stock; toast on frontend

**Permissions:** Public (session or auth)

**Dependencies:** `carts`, `cart_items`, `product_variants` tables; POST `/cart/items`

**Acceptance Criteria:**
- [ ] Badge and cart page reflect same items  
- [ ] Stock enforced server-side  
- [ ] Guest cart persists in session cookie  

---

## 5.1 Create Order (Checkout)

**Function Name:** CreateOrder

**Purpose:** Convert cart to confirmed order with customer and delivery data.

**Users:** Guest or registered customer

**Trigger / Entry Point:** Checkout "Place Order" button

**Current Status:** **Not Yet Implemented** — placeholder toast in `main.js`

**Inputs:**
- Customer: `full_name`, `phone`, `email` (optional)
- Shipping: `governorate`, `city`, `street`, `notes`
- `payment_method`: `cod`
- Cart reference

**Business Logic:**
1. Validate all required fields  
2. Re-validate cart stock and prices  
3. Calculate shipping (free if subtotal ≥ 3000 EGP)  
4. Generate `order_number` = `RWQ-{seq}`  
5. Save order + items (snapshot names/prices)  
6. Set status `confirmed`  
7. Enqueue Odoo sync job  
8. Enqueue SMS job  
9. Clear cart  

**Outputs:** Order confirmation with `order_number`; 201 Created

**Validation Rules:**
- Phone: Egyptian mobile format  
- Non-empty cart  
- All address fields required  

**Error Handling:**
- 422 empty cart  
- 409 stock conflict → show which item failed  
- Odoo/SMS failure does NOT roll back order  

**Permissions:** Authenticated or guest session

**Dependencies:** Orders API, Odoo service, SMS service

**Acceptance Criteria:**
- [ ] Order visible in admin immediately  
- [ ] Confirmation page shows RWQ- number  
- [ ] Odoo sync within 60s (happy path)  
- [ ] SMS within 2 min  

---

## 6.1 Customer Registration

**Function Name:** RegisterCustomer

**Purpose:** Create customer account for order history and faster checkout.

**Current Status:** **Not Yet Implemented**

**Inputs:** email, phone, password, full_name

**Business Logic:** Hash password; create user role=customer; issue JWT

**Validation:** Unique email/phone; password ≥ 8 chars

**Acceptance Criteria:**
- [ ] User can login after register  
- [ ] Password never stored plaintext  

---

## 9.2 Admin — Create Product

**Function Name:** AdminCreateProduct

**Purpose:** Add new product to catalog without code changes.

**Current Status:** **Not Yet Implemented**

**Trigger:** Admin → Products → Create

**Inputs:** name, description, category, base_price, variants[], images[]

**Business Logic:** Save product + variants; upload images to storage; set `active=true`

**Permissions:** Admin JWT only

**Acceptance Criteria:**
- [ ] Product appears on shop within 1 minute  
- [ ] Images display on PDP  
- [ ] Invalid data rejected with field errors  

---

## 9.3 Admin — Update Order Status

**Function Name:** AdminUpdateOrderStatus

**Purpose:** Progress order through fulfillment lifecycle.

**Current Status:** **Not Yet Implemented**

**Allowed transitions:**
`pending` → `confirmed` → `preparing` → `shipped` → `delivered`  
`cancelled` from `pending` or `confirmed` only

**Business Logic:** Append `order_status_history` row; optional future SMS on shipped

**Acceptance Criteria:**
- [ ] Status visible on customer track order  
- [ ] Invalid transitions rejected with 422  

---

## 8.1 Track Order

**Function Name:** TrackOrderByNumber

**Purpose:** Public lookup of order status by RWQ- number.

**Current Status:** **Partial** — mock UI for RWQ-10482

**Trigger:** Track Order page `#trackBtn`

**Inputs:** `order_number` (string)

**Outputs:** Timeline from `order_status_history`

**Validation:** Format RWQ-\d+; 404 if not found

**Acceptance Criteria:**
- [ ] Real order shows accurate timeline  
- [ ] Invalid number shows friendly error  

---

## Integration Functions (Required)

### OdooPushOrder — See [../06-integrations/Odoo-Integration-Specification.md](../06-integrations/Odoo-Integration-Specification.md)

### SmsOrderConfirmation — See [../06-integrations/SMS-Integration-Specification.md](../06-integrations/SMS-Integration-Specification.md)

---

*Additional functions follow same template as implementation progresses.*

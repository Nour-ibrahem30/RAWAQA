# QA Test Plans — RAWAQA

## Test Case Index

| ID | Area | Scenario | Priority |
|----|------|----------|----------|
| TC-F01 | Frontend | Home page loads hero and featured products | P1 |
| TC-F02 | Frontend | Shop displays all active products from API | P1 |
| TC-F03 | Frontend | Product detail loads correct variant | P1 |
| TC-F04 | Frontend | Add to cart updates count and cart page | P1 |
| TC-F05 | Frontend | Mobile menu opens/closes | P2 |
| TC-F06 | Frontend | Responsive layout 375px | P1 |
| TC-F07 | Frontend | Checkout form validation errors | P1 |
| TC-F08 | Frontend | Order confirmation page shows RWQ- number | P1 |
| TC-F09 | Frontend | Track valid order shows timeline | P1 |
| TC-F10 | Frontend | Track invalid order shows error | P2 |
| TC-B01 | Backend | GET /products returns paginated list | P1 |
| TC-B02 | Backend | POST /cart/items adds line | P1 |
| TC-B03 | Backend | POST /orders creates order | P1 |
| TC-B04 | Backend | Stock conflict returns 409 | P1 |
| TC-B05 | Backend | Admin product CRUD | P1 |
| TC-B06 | Backend | Admin order status update | P1 |
| TC-A01 | Auth | Register new user | P1 |
| TC-A02 | Auth | Login valid/invalid | P1 |
| TC-A03 | Auth | Customer blocked from /admin | P1 |
| TC-I01 | Odoo | Order sync creates sale.order | P1 |
| TC-I02 | Odoo | Duplicate sync is idempotent | P1 |
| TC-I03 | Odoo | Failure retries then marks failed | P2 |
| TC-I04 | SMS | Confirmation sent on order | P1 |
| TC-I05 | SMS | No duplicate SMS per order | P1 |
| TC-E2E01 | E2E | Full purchase flow | P0 |
| TC-E2E02 | E2E | Admin fulfill order | P1 |
| TC-SEC01 | Security | JWT required on protected routes | P1 |
| TC-SEC02 | Security | Rate limit on login | P2 |

---

## Sample Detailed Test Case

### TC-E2E01 — Full Purchase Flow

**Preconditions:** Staging environment; test products in stock; Odoo/SMS sandbox configured.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open homepage | Hero visible |
| 2 | Navigate to Shop | Products listed |
| 3 | Open "The Cloud Lounger" | PDP loads EGP 3,450 |
| 4 | Select colour, size, qty 1 | Selection reflected |
| 5 | Add to Cart | Toast; cart count +1 |
| 6 | Open Cart | Line item present |
| 7 | Checkout | Form displayed |
| 8 | Enter valid customer + address | No validation errors |
| 9 | Place Order | Confirmation RWQ-XXXXX |
| 10 | Check DB | Order status confirmed |
| 11 | Check Odoo | Sale order exists |
| 12 | Check test phone | SMS received |
| 13 | Track order | Timeline shows confirmed |

**Pass criteria:** All steps pass; no console errors.

---

## Regression Suite (Pre-Release)

Minimum smoke tests:
1. Homepage load  
2. Shop → Product → Add to cart  
3. Checkout (staging)  
4. Admin login + view orders  
5. API health check  

---

## Defect Severity

| Level | Definition |
|-------|------------|
| P0 | Cannot complete purchase; data loss; security breach |
| P1 | Major feature broken; no workaround |
| P2 | Minor feature; workaround exists |
| P3 | Cosmetic |

**Release blocker:** Zero open P0/P1.

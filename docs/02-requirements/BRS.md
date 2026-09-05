# Business Requirements Specification (BRS) — RAWAQA

**Document ID:** RAWAQA-BRS-001  
**Version:** 1.0  
**Status:** Approved for implementation planning

---

## 1. Business Objectives

| ID | Objective |
|----|-----------|
| BO-01 | Launch a professional e-commerce website for RAWAQA bean bag products in Egypt |
| BO-02 | Enable online ordering with clear pricing in EGP |
| BO-03 | Automate order handoff to Odoo ERP for fulfillment |
| BO-04 | Notify customers of order confirmation via SMS |
| BO-05 | Provide admin tools to manage catalog and orders without code changes |
| BO-06 | Deliver within 4–6 weeks at agreed budget of 35,000 EGP |

---

## 2. Stakeholders

| Stakeholder | Interest |
|-------------|----------|
| RAWAQA business owner | Revenue, brand, operational control |
| End customers | Easy purchase, delivery, support |
| Development team | Clear scope, testable requirements |
| Odoo administrator | Accurate order records |
| SMS provider | Message delivery |

---

## 3. Functional Business Requirements

### 3.1 Customer-Facing

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| BR-C01 | Display product catalog with categories | Must | Partial |
| BR-C02 | Show product details with variants | Must | Partial |
| BR-C03 | Shopping cart management | Must | Partial |
| BR-C04 | Checkout with customer and delivery info | Must | Not Yet Implemented |
| BR-C05 | Order confirmation | Must | Not Yet Implemented |
| BR-C06 | Order tracking by order number | Should | Partial |
| BR-C07 | Customer registration and login | Should | Not Yet Implemented |
| BR-C08 | Order history for registered users | Should | Not Yet Implemented |
| BR-C09 | Responsive design for mobile | Must | Implemented |
| BR-C10 | Arabic/English language support | Should | Partial |

### 3.2 Admin

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| BR-A01 | Secure admin authentication | Must | Not Yet Implemented |
| BR-A02 | Product CRUD | Must | Not Yet Implemented |
| BR-A03 | Order list and detail view | Must | Not Yet Implemented |
| BR-A04 | Order status updates | Must | Not Yet Implemented |
| BR-A05 | Customer information view | Should | Not Yet Implemented |
| BR-A06 | Dashboard overview (orders, products) | Should | Not Yet Implemented |

### 3.3 Integrations

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| BR-I01 | Push new orders to Odoo | Must | Integration Required |
| BR-I02 | Map customer data to Odoo partner | Must | Integration Required |
| BR-I03 | Map order line items to Odoo sale order | Must | Integration Required |
| BR-I04 | Send SMS on order confirmation | Must | Integration Required |
| BR-I05 | Log integration success/failure | Must | Integration Required |

---

## 4. Business Rules

| ID | Rule |
|----|------|
| BRU-01 | All prices displayed in EGP |
| BRU-02 | Order numbers use prefix `RWQ-` + unique sequence |
| BRU-03 | Free delivery on orders over EGP 3,000 (per current UI copy) |
| BRU-04 | Phone number required for order and SMS |
| BRU-05 | Admin actions require authentication |
| BRU-06 | Odoo sync occurs after successful local order save |
| BRU-07 | SMS sent after order confirmation (not before payment validation if COD) |
| BRU-08 | Product availability must reflect stock when inventory enabled |

---

## 5. Notification Requirements

| Event | Channel | Recipient | Status |
|-------|---------|-----------|--------|
| Order confirmed | SMS | Customer phone | Integration Required |
| Order status changed (shipped) | SMS | Customer | Planned (optional MVP) |
| Odoo sync failed | Internal log / admin | Operations | Required |
| SMS delivery failed | Internal log | Operations | Required |

---

## 6. Integration Requirements

### Odoo (Budget: 7,000 EGP)
- **In scope:** Customer data, order data, order mapping, API auth, error handling, logging, duplicate prevention  
- **Out of scope:** Accounting, invoices, POS, full inventory sync, payment sync, advanced shipping modules  

### SMS (Budget: 3,000 EGP)
- **In scope:** Order confirmation SMS, provider integration, templates, validation, logging  
- **Out of scope:** Unlimited SMS credits (client pays usage), WhatsApp, marketing campaigns  

---

## 7. Assumptions

1. Single currency (EGP) for MVP  
2. Delivery zones cover Egypt as stated in marketing copy  
3. Client provides Odoo API access before Phase 5  
4. Client registers SMS sender ID with provider  
5. Product catalog initially migrated from current 8 static products  

---

## 8. Constraints

| Constraint | Detail |
|------------|--------|
| Budget | Fixed at 35,000 EGP |
| Timeline | 4–6 weeks |
| Platform | Web only — not mobile app |
| Scope changes | Require Change Request process |

---

## 9. Dependencies

| Dependency | Owner |
|------------|-------|
| Odoo instance + credentials | Client |
| SMS provider account + credits | Client |
| Hosting + domain + SSL | Client |
| Product images and descriptions | Client |
| Payment method decision (COD vs gateway) | Client |

---

## 10. Success Measurements

- Website live on production URL with SSL  
- End-to-end order flow tested  
- ≥1 successful Odoo order sync in staging  
- ≥1 successful SMS in staging  
- Admin can add/edit product without developer  
- Client sign-off on UAT  

---

## 11. Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Client | _________________ | ________ | ________ |
| Project Lead | _________________ | ________ | ________ |

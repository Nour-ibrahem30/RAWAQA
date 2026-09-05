# Requirements Traceability Matrix — RAWAQA

Links business requirements → functional requirements → API → database → UI → integration → test cases.

| Req ID | Business Requirement | Functional Req | API | DB Entity | UI | Integration | Test Case | Status |
|--------|---------------------|----------------|-----|-----------|-----|-------------|-----------|--------|
| BR-C01 | Product catalog | FRS §2.1 | GET /products | products, categories | #page-shop | — | TC-F02, TC-B01 | Partial |
| BR-C02 | Product details | FRS §3 | GET /products/:id | products, variants | #page-product | — | TC-F03 | Partial |
| BR-C03 | Shopping cart | FRS §4 | /cart/* | carts, cart_items | #page-cart | — | TC-F04, TC-B02 | Partial |
| BR-C04 | Checkout | FRS §5 | POST /orders | orders, order_items | Checkout page | — | TC-F07, TC-B03 | Not Implemented |
| BR-C05 | Order confirmation | FRS §5.4 | POST /orders response | orders | Confirm page | Odoo, SMS | TC-F08, TC-E2E01 | Not Implemented |
| BR-C06 | Track order | FRS §8 | GET /orders/track/:n | orders, status_history | #page-track | — | TC-F09, TC-F10 | Partial |
| BR-C07 | Registration/login | FRS §6 | /auth/* | users | Login/Register | — | TC-A01, TC-A02 | Not Implemented |
| BR-C08 | Order history | FRS §7 | GET /orders | orders | Account page | — | TC-E2E01 | Not Implemented |
| BR-C09 | Responsive design | NFR-RB | — | — | All pages | — | TC-F06 | Implemented |
| BR-A01 | Admin auth | FRS §9.5 | /admin/* + JWT | users (role=admin) | Admin login | — | TC-A03 | Not Implemented |
| BR-A02 | Product CRUD | FRS §9.2 | /admin/products | products, variants | Admin Products | — | TC-B05 | Not Implemented |
| BR-A03 | Order management | FRS §9.3 | /admin/orders | orders | Admin Orders | — | TC-B06 | Not Implemented |
| BR-I01 | Odoo order push | BRS §3.3 | Internal job | orders, integration_logs | — | Odoo | TC-I01, TC-I02 | Integration Required |
| BR-I04 | SMS confirmation | BRS §3.3 | Internal job | orders, integration_logs | — | SMS | TC-I04, TC-I05 | Integration Required |
| BRU-03 | Free shipping ≥3000 | FRS GR | POST /orders logic | orders.shipping | Cart summary | — | TC-B03 | Not Implemented |
| — | Featured products | FRS §1.3 | GET /products?featured | products.featured | #featuredGrid | — | TC-F01 | Partial |
| — | Shop filters | FRS §2.5 | GET /products params | products | .filters | — | TC-F02 | Not Implemented |
| — | Search | FRS §2.4 | GET /products?q | products | Search btn | — | TC-F02 | Not Implemented |
| — | Home hero/nav | FRS §1 | — | — | #page-home | — | TC-F01 | Implemented |
| — | Add to cart toast | FRS §3.5 | POST /cart/items | cart_items | Toast | — | TC-F04 | Partial |
| — | Language toggle | FRS §1 | — | — | #langBtn | — | TC-F06 | Partial |

---

## Coverage Summary

| Layer | Total Requirements | Implemented | Partial | Not Implemented |
|-------|-------------------|-------------|---------|-----------------|
| Customer UI | 15 | 3 | 7 | 5 |
| Admin | 5 | 0 | 0 | 5 |
| Integrations | 2 | 0 | 0 | 2 |
| **Overall** | **22** | **3 (14%)** | **7 (32%)** | **12 (54%)** |

*Percentages approximate — partial items count as incomplete for production.*

---

## Traceability Maintenance

When implementing a feature:
1. Update Status column in this matrix  
2. Update [Gap-Analysis.md](Gap-Analysis.md)  
3. Add/adjust test cases in [QA-Test-Plans.md](../09-testing/QA-Test-Plans.md)  
4. Update OpenAPI if API changes  

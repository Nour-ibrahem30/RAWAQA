# User Stories — RAWAQA

## Customer Stories

| ID | As a... | I want to... | So that... | Status |
|----|---------|--------------|------------|--------|
| US-C01 | customer | browse all bean bag products | I can find something for my space | Partial |
| US-C02 | customer | filter by category and price | I narrow choices quickly | Not Implemented |
| US-C03 | customer | see product details with colour/size | I buy the right variant | Partial |
| US-C04 | customer | add items to cart | I collect products before checkout | Partial |
| US-C05 | customer | update cart quantities | I adjust my order | Not Implemented |
| US-C06 | customer | checkout with my address and phone | I can receive delivery | Not Implemented |
| US-C07 | customer | get order confirmation | I know my order was received | Not Implemented |
| US-C08 | customer | receive SMS confirmation | I have record on my phone | Integration Required |
| US-C09 | customer | track my order | I know delivery status | Partial |
| US-C10 | customer | create an account | I see past orders | Not Implemented |
| US-C11 | customer | switch to Arabic layout | the site feels natural | Partial |

## Admin Stories

| ID | As a... | I want to... | So that... | Status |
|----|---------|--------------|------------|--------|
| US-A01 | admin | login securely | only staff access admin | Not Implemented |
| US-A02 | admin | add/edit products | catalog stays current | Not Implemented |
| US-A03 | admin | upload product images | customers see real photos | Not Implemented |
| US-A04 | admin | view all orders | I manage fulfillment | Not Implemented |
| US-A05 | admin | update order status | customers see progress | Not Implemented |
| US-A06 | admin | see dashboard KPIs | I monitor daily sales | Not Implemented |

## System Stories

| ID | As a... | I want to... | So that... | Status |
|----|---------|--------------|------------|--------|
| US-S01 | system | push orders to Odoo | ops fulfill from ERP | Integration Required |
| US-S02 | system | retry failed Odoo sync | no orders are lost | Integration Required |
| US-S03 | system | send SMS on order | customer is notified | Integration Required |
| US-S04 | system | log all integrations | we can debug failures | Not Implemented |

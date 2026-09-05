# Use Case Diagrams — RAWAQA

## Customer — Purchase

```mermaid
flowchart TB
    Customer((Customer))
    
    subgraph RAWAQA System
        UC1[Browse Catalog]
        UC2[View Product]
        UC3[Manage Cart]
        UC4[Checkout]
        UC5[Track Order]
        UC6[Manage Account]
    end
    
    Customer --> UC1
    Customer --> UC2
    Customer --> UC3
    Customer --> UC4
    Customer --> UC5
    Customer --> UC6
    
    UC3 -.-> UC2
    UC4 -.-> UC3
```

| Use Case | Status |
|----------|--------|
| Browse Catalog | Partial |
| View Product | Partial |
| Manage Cart | Partial |
| Checkout | Not Implemented |
| Track Order | Partial |
| Manage Account | Not Implemented |

---

## Admin — Operations

```mermaid
flowchart TB
    Admin((Admin))
    
    subgraph Admin System
        A1[Login]
        A2[Manage Products]
        A3[Manage Orders]
        A4[View Dashboard]
    end
    
    Admin --> A1
    Admin --> A2
    Admin --> A3
    Admin --> A4
```

**Status:** All Not Yet Implemented

---

## System — Integrations

```mermaid
flowchart TB
    System[Backend Order Service]
    Odoo((Odoo))
    SMS((SMS Provider))
    
    System -->|Sync Order| Odoo
    System -->|Send Confirmation| SMS
```

**Status:** Integration Required

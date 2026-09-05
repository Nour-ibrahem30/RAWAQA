# Data Flow Diagram — RAWAQA

## Level 0 — Context

```mermaid
flowchart LR
    Customer[Customer]
    Admin[Admin]
    Website[RAWAQA Platform]
    Odoo[Odoo]
    SMS[SMS Provider]
    DB[(Database)]

    Customer --> Website
    Admin --> Website
    Website --> DB
    Website --> Odoo
    Website --> SMS
```

## Level 1 — Order Creation

```mermaid
flowchart TB
    subgraph Frontend
        Checkout[Checkout Form]
    end
    subgraph Backend
        Validate[Validate Order]
        SaveOrder[Save Order]
        Queue[Job Queue]
        OdooJob[Odoo Sync]
        SmsJob[SMS Send]
    end
    subgraph Stores
        DB[(PostgreSQL)]
        Log[(integration_logs)]
    end

    Checkout --> Validate
    Validate --> SaveOrder
    SaveOrder --> DB
    SaveOrder --> Queue
    Queue --> OdooJob
    Queue --> SmsJob
    OdooJob --> Log
    SmsJob --> Log
```

## External Entities

| Entity | Role |
|--------|------|
| Customer | Browses, purchases |
| Admin | Manages catalog/orders |
| Odoo | Receives sale orders |
| SMS Provider | Delivers confirmation |

## Data Stores

| Store | Contents |
|-------|----------|
| PostgreSQL | Products, carts, orders, users |
| integration_logs | Odoo/SMS audit trail |
| File storage | Product images |

See [System-Architecture.md](System-Architecture.md) for sequence diagrams.

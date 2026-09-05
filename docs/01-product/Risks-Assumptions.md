# Risks & Assumptions — RAWAQA

## Technical Risks

| ID | Risk | Likelihood | Impact | Mitigation |
|----|------|------------|--------|------------|
| R1 | Backend delay while frontend appears "done" | High | High | Clear gap docs; parallel Phase 2/3 |
| R2 | Odoo API incompatibility with client version | Medium | High | Confirm version Week 1; spike test |
| R3 | SMS sender ID registration delay | Medium | Medium | Client starts registration early |
| R4 | Cart/checkout UX mismatch with static prototype | Medium | Medium | Dynamic cart in Phase 2 |
| R5 | No tests → production bugs | High | High | CI from Phase 3 |

## Business Risks

| ID | Risk | Mitigation |
|----|------|------------|
| B1 | Scope creep (payment, WhatsApp) | CR process |
| B2 | Client content not ready | Placeholder images; seed products |
| B3 | Hosting not provisioned | Deployment checklist Week 4 |

## Assumptions

1. Client approves existing RAWAQA visual design as production baseline  
2. Eight prototype products represent initial catalog  
3. One warehouse / fulfillment flow  
4. Egypt domestic delivery only for MVP  
5. English UI primary; Arabic RTL layout with phased translation  
6. Developer has access to staging Odoo and SMS for integration testing  
7. 4–6 week timeline assumes timely client feedback (≤3 business days)  
8. No concurrent major rebrand during build  

## Dependencies on Client

- Odoo credentials by end of Week 1  
- SMS provider account by Week 4  
- Hosting/DNS by Week 5  
- Product images before production launch  
- UAT sign-off within 5 business days of staging ready  

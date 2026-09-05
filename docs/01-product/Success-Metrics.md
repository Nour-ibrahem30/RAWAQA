# Success Metrics — RAWAQA

## Business Metrics

| Metric | Target | Measurement | Phase |
|--------|--------|-------------|-------|
| Online orders/month | Client-defined baseline + growth | Admin dashboard | Post-launch |
| Checkout completion rate | ≥ 60% | Analytics funnel | Month 1 |
| Average order value | Track vs offline | Order reports | Month 1 |
| Odoo sync success rate | ≥ 99% | `integration_logs` | Launch |
| SMS delivery rate | ≥ 98% | Provider dashboard | Launch |

## Product Metrics

| Metric | Target | Tool |
|--------|--------|------|
| Homepage bounce rate | < 55% | Analytics |
| Shop → Product click-through | > 25% | Analytics |
| Add-to-cart rate | > 8% of PDP views | Events |
| Cart abandonment | < 40% | Funnel |

## Technical Metrics

| Metric | Target | Tool |
|--------|--------|------|
| LCP (mobile) | < 2.5s | Lighthouse |
| API p95 (catalog) | < 300ms | APM |
| API p95 (checkout) | < 500ms | APM |
| Uptime | 99.5% | Uptime monitor |
| P0 bugs open | 0 at launch | Issue tracker |

## Operational Metrics

| Metric | Target |
|--------|--------|
| Admin time to add product | < 5 min |
| Failed Odoo sync unresolved > 24h | 0 |
| Mean time to deploy hotfix | < 4 hours |

## UAT Success

Client sign-off when all P0/P1 test cases pass on staging and one production smoke order completes end-to-end.

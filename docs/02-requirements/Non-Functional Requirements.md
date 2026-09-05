# Non-Functional Requirements (Expanded) — RAWAQA

> **Short reference:** [NFR.md](NFR.md)

## Performance Targets

| Metric | Target | Verification |
|--------|--------|--------------|
| LCP (mobile) | < 2.5s | Lighthouse |
| API catalog p95 | < 300ms | APM |
| API checkout p95 | < 500ms | Load test |

## Security

HTTPS, JWT, bcrypt, validation, CORS, rate limits. See [../08-security/Security-Specification.md](../08-security/Security-Specification.md).

## Reliability

99.5% uptime; Odoo/SMS async retry; RPO 24h / RTO 4h.

## Accessibility

WCAG 2.1 AA target; focus states implemented in CSS.

## Browser Support

Chrome, Firefox, Safari (last 2 versions). No IE11.

See [NFR.md](NFR.md) for full list.

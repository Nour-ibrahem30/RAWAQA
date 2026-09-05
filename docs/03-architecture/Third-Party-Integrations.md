# Third-Party Integrations — RAWAQA

| Service | Purpose | Direction | Auth | Status |
|---------|---------|-----------|------|--------|
| **Odoo ERP** | Order + customer sync | Outbound | API key / user+key | Integration Required |
| **SMS Provider** | Order confirmation | Outbound | API key | Integration Required |
| **Google Fonts** | Typography | Outbound (CDN) | None | Implemented |
| **Hosting** | Static + API serve | — | — | Client responsibility |

---

## Odoo ERP

| Item | Content |
|------|---------|
| Service Name | Odoo (client instance) |
| Purpose | Create sale orders from website orders |
| Direction | Outbound |
| Auth Method | API key or XML-RPC credentials |
| Endpoints | `/xmlrpc/2`, JSON-RPC, or External API |
| Data Sent | Partner, order lines, client_order_ref |
| Data Received | partner_id, sale_order_id |
| Timeout | 30 seconds |
| Retries | 3 with exponential backoff |
| Fallback | Order saved locally; admin retry |
| Logging | `integration_logs` (redacted) |
| Security | Env credentials only |

**Full spec:** [../06-integrations/Odoo-Integration-Specification.md](../06-integrations/Odoo-Integration-Specification.md)

**Out of scope:** Accounting, POS, full inventory, invoices.

---

## SMS Provider (TBD)

| Item | Content |
|------|---------|
| Service Name | Client-selected (Twilio, local gateway, etc.) |
| Purpose | Transactional order confirmation |
| Direction | Outbound |
| Auth Method | API key |
| Data Sent | Phone (E.164), message body |
| Data Received | message_id, delivery status |
| Timeout | 15 seconds |
| Retries | 2 |
| Fallback | Order confirmed; log failure |
| Logging | `integration_logs` |
| Security | Env API key; redact phone in logs |

**Full spec:** [../06-integrations/SMS-Integration-Specification.md](../06-integrations/SMS-Integration-Specification.md)

**External costs:** SMS credits, sender ID — client paid.

---

## Google Fonts (Current)

| Item | Content |
|------|---------|
| Purpose | Fraunces, Manrope, Noto Sans Arabic |
| Direction | Browser → fonts.googleapis.com |
| Note | Consider self-hosting for privacy/perf (optional) |

---

## Future Integrations (Out of Scope)

- Paymob / Fawry payment  
- Meta Pixel / Google Analytics  
- WhatsApp Business API  

Require Change Request.

# Queue & Jobs Architecture — RAWAQA

**Status:** Planned — Required for Odoo/SMS

| Job | Trigger | Retries |
|-----|---------|---------|
| `odoo.sync_order` | Order confirmed | 3 |
| `sms.order_confirmation` | Order confirmed | 2 |

Jobs run async after order save. Idempotency via `odoo_sync_status` / `sms_status`.

See [Integration-Architecture.md](Integration-Architecture.md).

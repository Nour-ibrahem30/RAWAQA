# Error Handling Strategy — RAWAQA

**Status:** Required for backend — Not Yet Implemented

---

## Goals

- Consistent JSON errors across API  
- Safe messages (no stack traces to clients)  
- Actionable validation errors for forms  
- Integration failures don't corrupt orders  

---

## Error Response Standard

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable summary",
    "details": [
      { "field": "phone", "message": "Must be valid Egyptian mobile" }
    ]
  }
}
```

---

## HTTP Status Mapping

| Status | Code | When |
|--------|------|------|
| 400 | VALIDATION_ERROR | Invalid input |
| 401 | UNAUTHORIZED | Missing/invalid JWT |
| 403 | FORBIDDEN | Wrong role |
| 404 | NOT_FOUND | Resource missing |
| 409 | CONFLICT | Stock, duplicate email |
| 422 | UNPROCESSABLE | Business rule (empty cart) |
| 429 | RATE_LIMITED | Too many requests |
| 500 | INTERNAL_ERROR | Unexpected server error |
| 503 | SERVICE_UNAVAILABLE | DB unreachable |

---

## Validation Errors

- Return all field errors in one response (don't fail on first field)  
- Frontend maps `details[].field` to form inputs  

---

## Domain Errors

| Scenario | Code | HTTP |
|----------|------|------|
| Insufficient stock | STOCK_CONFLICT | 409 |
| Empty cart checkout | EMPTY_CART | 422 |
| Invalid status transition | INVALID_TRANSITION | 422 |
| Order not found (track) | ORDER_NOT_FOUND | 404 |

---

## Integration Errors

| Scenario | User sees | System does |
|----------|-----------|-------------|
| Odoo timeout | Order confirmed | Retry job + log |
| SMS failure | Order confirmed | Retry + log |
| DB error during checkout | "Try again" | 503, no partial order |

---

## Sensitive Data Rules

- Never return password hashes, JWT secrets, or provider API keys  
- Log integration payloads with redaction  

---

## Frontend Error UX

| Context | Behavior |
|---------|----------|
| Checkout | Inline field errors + summary banner |
| Add to cart | Toast with stock message |
| API offline | Toast "Connection problem" + retry |
| Track order | "Order not found" empty state |

**Current gap:** Only toast for checkout placeholder in `main.js`.

---

## Logging

- 4xx: warn level with request ID  
- 5xx: error level + stack in server logs only  
- Integration failures: `integration_logs` table  

---

## Testing

- Unit tests for each error code path  
- Contract tests for error JSON shape  

See [../04-api/API-Design.md](../04-api/API-Design.md).

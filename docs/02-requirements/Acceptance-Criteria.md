# Acceptance Criteria — RAWAQA (MVP Launch)

## Customer — Catalog

- [ ] Shop loads products from API (not static JS array)
- [ ] Product detail shows price, variants, stock status
- [ ] Featured products on homepage from `featured=true` flag
- [ ] Mobile layout works at 375px width

## Customer — Cart & Checkout

- [ ] Add to cart persists across page navigation
- [ ] Cart shows correct subtotal, shipping, total
- [ ] Free shipping applied when subtotal ≥ EGP 3,000
- [ ] Checkout validates phone and required address fields
- [ ] Successful checkout shows confirmation with RWQ- order number
- [ ] Cart cleared after successful order

## Customer — Account & Track

- [ ] Register and login work with secure passwords
- [ ] Logged-in user sees order history
- [ ] Track order returns real timeline for valid RWQ- number
- [ ] Invalid track number shows clear error

## Admin

- [ ] Admin login restricted to admin role
- [ ] Create product → visible on shop
- [ ] Edit product price → reflected on shop
- [ ] Deactivate product → hidden from shop
- [ ] View order with customer info and line items
- [ ] Update order status → reflected in track timeline

## Integrations

- [ ] New order creates Odoo sale order (staging)
- [ ] Duplicate sync does not create duplicate Odoo order
- [ ] Odoo failure: order still saved; status `failed`; retry scheduled
- [ ] SMS sent on order confirmation (staging test number)
- [ ] No duplicate SMS for same order

## Non-Functional

- [ ] Production served over HTTPS
- [ ] No API keys in frontend bundle
- [ ] Database migrations run cleanly on staging and production
- [ ] Smoke test suite passes post-deploy

## Client UAT Sign-Off

- [ ] Client completes test purchase on production
- [ ] Client verifies order in Odoo
- [ ] Client receives test SMS
- [ ] Written sign-off received

**Reference:** [Requirements-Traceability-Matrix.md](Requirements-Traceability-Matrix.md)

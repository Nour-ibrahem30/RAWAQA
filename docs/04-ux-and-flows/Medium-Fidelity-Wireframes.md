# Medium-Fidelity Wireframes — RAWAQA

Adds component intent and hierarchy to low-fi blocks. Matches `css/styles.css` components.

## Navigation

- Fixed top nav; transparent on home hero → solid on scroll (`.nav.solid`)
- Mobile: burger opens full-screen `#mmenu`
- Cart badge `#cartCount` on icon

## Shop Page

- **Filters (sticky):** Category checkboxes, price range slider, colour dots, in-stock checkbox
- **Toolbar:** "8 products" count + sort dropdown
- **Grid:** `.prod-card` — media, name, desc, price, swatches

## Product Detail

- **Gallery:** Main SVG/image + 3 thumbnails
- **Options:** Colour swatches (`.opt-swatch`), size pills (`.size-pill`), qty box
- **CTAs:** Add to Cart (ink), Buy Now (gold)
- **Accordion:** Description, Features, Materials, etc.

## Cart

- **Line item:** Thumb, name, variant, qty controls, remove link, price column
- **Summary card (sticky):** Subtotal, shipping, total, Checkout button

## Checkout (Planned)

- Single-column form on mobile; two-column with sticky summary on desktop
- Required fields marked; phone with Egypt hint
- Place Order primary button full width

## Admin (Planned)

- Table list views with status badges
- Product form: tabs or sections for details / variants / images
- Order detail: customer block + line items + status dropdown

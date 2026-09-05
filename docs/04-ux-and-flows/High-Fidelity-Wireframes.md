# High-Fidelity Wireframes — RAWAQA

**Status:** Implemented in prototype — see `index.html` + `css/styles.css`

## Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| --charcoal | #15130F | Dark bg, hero |
| --ivory | #F7F4EC | Light sections |
| --gold-light | #D2B56A | Primary CTA |
| --clay/indigo/ochre/forest | Category colours | Tiles, products |

## Typography

- Headlines: Fraunces (`.display-1`, `.display-2`)
- Body: Manrope + Noto Sans Arabic

## Page Notes

### Home
- Full-viewport hero with glow gradient
- Category tiles 4-col → 2-col mobile
- Product grid 3-col → 2-col mobile

### Shop
- Filter sidebar 250px; collapses below content on mobile
- Sort pill select styled

### Product
- Sticky `.pdp-info` on desktop
- Price: bold 1.3rem EGP format

### Cart
- Summary `.summary-card` white card with border radius 22px

### Track
- Pill-shaped search input
- Timeline with done/current/pending node states

## Planned Pages (Not Built)

- Checkout: match cart summary styling
- Confirmation: large RWQ- number, order summary, continue shopping CTA
- Login/Register: centered card on ivory background
- Admin: dark sidebar or light dashboard — TBD at implementation

## Responsive Breakpoint

Primary: `max-width: 880px` in CSS.

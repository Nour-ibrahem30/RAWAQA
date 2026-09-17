# RAWAQA UX Overhaul — v1

This package is a presentation-layer upgrade for the existing RAWAQA Next.js storefront.

## Included

- `frontend/src/components/ui/RAWAQAUxFoundation.tsx`
  - keyboard focus treatment
  - reduced-motion support
  - rendering defaults
  - responsive container foundation
  - safe form focus states
  - subtle product-card hover behavior
- `frontend/src/styles/rawaqa-ux-overhaul.css`
  - section/container system
  - typography hierarchy
  - responsive product grid
  - CTA/button system
  - 44px touch targets
  - product media ratio
  - optional mobile sticky CTA

## Integration

1. Copy the files into the existing RAWAQA repository at the same paths.
2. Import the CSS once from the existing global stylesheet/layout:

```tsx
import '@/styles/rawaqa-ux-overhaul.css';
```

3. Add the foundation component inside the existing locale layout, after the existing global providers/loaders:

```tsx
<RAWAQAUxFoundation />
```

4. Import it:

```tsx
import RAWAQAUxFoundation from '@/components/ui/RAWAQAUxFoundation';
```

## Important

This package does NOT modify API contracts, authentication, cart state, checkout, order state, MongoDB, or deployment configuration.

## Next implementation layer

Apply the classes to the existing screens in this order:

1. Navbar hierarchy + mobile navigation
2. Home hero + primary CTA
3. Category discovery
4. Product cards
5. Shop filters/search
6. Product details
7. Cart and checkout conversion UX
8. Empty/loading/error states
9. RTL/LTR visual QA
10. Core Web Vitals and animation audit

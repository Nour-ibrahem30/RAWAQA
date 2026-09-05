# Caching Strategy — RAWAQA

**Status:** Planned — minimal caching at MVP launch

## Public Catalog

| Resource | Cache | TTL | Rule |
|----------|-------|-----|------|
| GET /products | CDN or HTTP cache | 5 min | Invalidate on admin product change |
| GET /products/:id | HTTP cache | 5 min | Same |
| Product images | CDN long cache | 1 year | Cache-bust on URL change |

## No Cache

| Resource | Reason |
|----------|--------|
| Cart, orders, auth | User-specific |
| Checkout POST | Transactional |
| Admin routes | Always fresh |

## MVP Approach

Static frontend assets: long cache with hash filenames (when bundler added). API catalog: optional Redis cache post-launch if load requires.

**Current prototype:** Static files only — browser default caching.

# Localization Architecture — RAWAQA

**Document ID:** RAWAQA-ARCH-L10N-001
**Version:** 1.0
**Last Updated:** 2026-09-02
**Status:** Specification — Not Yet Implemented
**Decision:** DEC-015 (Arabic + English from MVP), DEC-023 (default language: Arabic)

---

## 1. Overview

RAWAQA supports Arabic and English from MVP launch. This is not a post-MVP feature. Both languages must be fully functional before production.

The architecture covers:
- Database storage of localized content
- API language negotiation
- Frontend language state and direction switching
- RTL (Arabic) and LTR (English) layout requirements
- Language persistence strategy

---

## 2. Supported Languages

| Code | Language | Direction | Default |
|------|----------|-----------|---------|
| `ar` | Arabic | RTL | ✅ Yes |
| `en` | English | LTR | No |

**Default (DEC-023):** When no language preference is expressed, Arabic (`ar`) is returned.

---

## 3. Database Localization Pattern

All human-readable content that differs between languages uses a single embedded `LocalizedString` object:

```
{
  ar: "استرخاء",
  en: "Relax"
}
```

This is stored as an embedded sub-document within the parent MongoDB document. **Documents are never duplicated per language.**

### Localized Fields by Collection

| Collection | Localized Fields |
|-----------|-----------------|
| `categories` | `name`, `description` |
| `products` | `name`, `description`, `longDescription`, `images[].altText` |
| `orders.items[]` | `productName` (snapshot) |
| `carts.items[]` | `productName` (snapshot) |

### Language-Independent Fields (not localized)

| Field | Reason |
|-------|--------|
| `slug` | URL identifier — must be consistent across languages |
| `sku` | Internal stock code |
| Prices (`basePrice`, `price`, `unitPrice`) | Numeric — formatting is a display concern |
| `orderNumber` | `RWQ-{seq}` — brand-specific format |
| `phone`, `email` | Contact data |
| `governorate`, `city`, `street` | Egyptian addresses — Arabic as entered |
| `status` enum values | Internal system values |
| `color`, `size` (variant labels) | Stored in English at MVP; display formatting is frontend concern |

### Fallback Rule

If a localized field is missing the requested language:

1. Fall back to the other supported language.
2. Include `"translationMissing": true` in the API response for that field.
3. Never return null or an empty string when a fallback exists.
4. If both `ar` and `en` are empty or absent, the document is invalid and must not be served.

**Example fallback response:**
```json
{
  "name": "Relax",
  "translationMissing": true,
  "lang": "ar"
}
```

---

## 4. API Language Negotiation

### Request — How Frontend Sends Language Preference

The frontend sends an `Accept-Language` header on every API request:

```http
GET /api/products HTTP/1.1
Accept-Language: ar
```

or

```http
Accept-Language: en
```

### Server Language Resolution

```
1. Read Accept-Language header
2. Extract first supported tag (ar or en)
3. If unsupported or absent → default to 'ar' (DEC-023)
4. Apply to all localized field selections in this request
5. Include selected language in response metadata
```

### Response — How Backend Returns Localized Content

The API returns the **resolved string value** for the requested language, not the `{ ar, en }` object. The client receives a clean, language-specific response:

```json
// Request: Accept-Language: ar
{
  "id": "...",
  "slug": "cloud-lounger",
  "name": "الكرسي السحابي",
  "description": "وسادة جلوس فاخرة...",
  "lang": "ar"
}

// Request: Accept-Language: en
{
  "id": "...",
  "slug": "cloud-lounger",
  "name": "The Cloud Lounger",
  "description": "Full-size lounging bag...",
  "lang": "en"
}
```

**Admin endpoints** (`/api/admin/*`) return **both** language values so admins can view and edit all content:

```json
{
  "name": {
    "ar": "الكرسي السحابي",
    "en": "The Cloud Lounger"
  }
}
```

### Error Message Localization

- Validation error messages returned to the customer (e.g. "Phone is required") should be localized.
- Admin error messages may be in English only at MVP.
- The `Accept-Language` header applies to user-facing error messages where feasible.

**OPEN DECISION — DEC-024 influence:** Error message localization strategy for guest vs authenticated users is deferred until language persistence is decided. MVP may ship English error messages only if localized error strings are not provided by the client.

---

## 5. Frontend Internationalization Architecture

### Language State

```
Language Selection (user action or default)
        ↓
Language State (in-memory: 'ar' | 'en')
        ↓ ─────────────────────────────────┐
        ↓                                  ↓
Localized UI strings              Accept-Language header
(static UI text: labels,          on all API requests
 navigation, buttons,
 error messages)
        ↓
Document direction + font
(dir="rtl" lang="ar" or
 dir="ltr" lang="en")
```

### Language State Location

The current frontend uses a global variable pattern (`toggleLang()` in `main.js`). When the backend API is connected, language state must also drive the `Accept-Language` header on all `fetch()` calls.

**Persistence strategy (DEC-024 — OPEN):** The exact persistence mechanism is not yet decided. Options:

| Option | Pros | Cons |
|--------|------|------|
| `localStorage` key | Simple, guest-compatible, no server round-trip | Not synced across devices |
| URL prefix (`/ar/`, `/en/`) | SEO-friendly | Requires router changes |
| User profile field | Server-persisted, device-synced | Requires auth; guest-blind |
| Cookie | Works for guest + auth | Requires cookie management |

**Interim behaviour:** Until DEC-024 is resolved, use `localStorage` as the implementation default. The UI should persist the user's last language choice and restore it on next visit.

### Default Language Behaviour

| User Type | First Visit | Subsequent Visit |
|-----------|-------------|-----------------|
| Guest | Arabic (`ar`) | Restored from `localStorage` if set |
| Authenticated | Arabic (`ar`) if no profile preference | User profile preference (post-MVP) |
| Admin | English (`en`) recommended | Configurable |

---

## 6. RTL / LTR Layout Requirements

Arabic is RTL. English is LTR. The layout must fully adapt — not just text direction. Changing `dir` attribute alone is insufficient.

### Document-Level

```html
<!-- Arabic -->
<html dir="rtl" lang="ar">

<!-- English -->
<html dir="ltr" lang="en">
```

### Component-Level Requirements

#### Navigation
- RTL: Logo on right, nav links on left, hamburger on left
- LTR: Logo on left, nav links on right, hamburger on right
- Dropdown menus: open in correct direction

#### Typography
- Arabic: Noto Sans Arabic or equivalent Arabic-optimised font
- English: Manrope / Fraunces (already in prototype)
- Line height adjustments: Arabic text typically needs more vertical spacing
- Font size: Arabic may need slightly larger size at the same `rem` value for visual parity

#### Product Cards
- RTL: Text right-aligned, price right-aligned, colour swatches flow RTL
- LTR: Text left-aligned, price left-aligned, colour swatches flow LTR

#### Forms (Checkout, Register, Login)
- RTL: Labels right-aligned, inputs right-to-left text entry
- Phone input: Egyptian format — direction should be LTR regardless of page direction (phone numbers are always LTR)
- Error messages: align to field label side

#### Cart
- RTL: Product name on right, price on left, quantity controls in correct order
- LTR: Standard LTR layout
- Subtotal, shipping, total rows: always right-aligned for currency

#### Tables (Admin Order List, Customer List)
- RTL: Column headers right-aligned, data right-aligned
- LTR: Standard LTR table layout
- Pagination: Previous/Next reversed in RTL (→ becomes Previous, ← becomes Next)

#### Breadcrumbs
- Separator character reverses: RTL uses `\` or `←` style, LTR uses `/` or `→`
- Order: Home → Category → Product (display order reverses in RTL)

#### Pagination
- RTL: Next page button on left, previous on right
- LTR: Next on right, previous on left

#### Icons with Directional Meaning
| Icon | LTR | RTL |
|------|-----|-----|
| Back arrow | ← | → |
| Forward arrow | → | ← |
| Chevron (open/close) | Flip horizontally | |
| Cart icon | No flip | No flip |
| Search icon | No flip | No flip |
| Close (×) | No flip | No flip |

**Rule:** Icons that represent physical direction (arrows, chevrons indicating navigation direction) must be mirrored in RTL. Icons that represent objects (cart, search, star) must not be mirrored.

#### Checkout Flow
- All form elements right-aligned in RTL
- CTA buttons (right-to-left reading order matches button position)
- Order summary panel: adapts side placement

#### Admin Interface
- Admin may operate in English-only at MVP
- If Arabic admin support is added: all admin forms, tables, and navigation follow the same RTL rules

### CSS Implementation Strategy

The existing `css/styles.css` uses CSS custom properties. RTL adaptation should use:

```css
/* Logical properties — automatically flip in RTL */
margin-inline-start: 1rem;   /* instead of margin-left */
padding-inline-end: 1rem;    /* instead of padding-right */
text-align: start;           /* instead of text-align: left */
```

Or alternatively, a `:root[dir="rtl"]` block for targeted overrides where logical properties cannot be used.

**The existing design system CSS variables must not be changed.** RTL adaptations layer on top.

### Spacing Considerations
- Arabic text with diacritics (tashkeel) needs additional line-height
- Arabic text in headings may render wider than English equivalent — card/grid layouts must accommodate

### Responsive Behaviour
- RTL and LTR must both be tested at 375px (mobile), 768px (tablet), 1280px (desktop)
- Flexbox `flex-direction` with `row-reverse` is not sufficient — use logical CSS properties instead

---

## 7. SMS Templates (Bilingual)

SMS messages are sent in the customer's language preference. The SMS adapter receives the language code alongside the order data.

### Order Confirmation — Arabic (primary)
```
RAWAQA: تم تأكيد طلبك {orderNumber}. الإجمالي {total} جنيه. شكراً لثقتك بنا.
```

### Order Confirmation — English (fallback)
```
RAWAQA: Your order {orderNumber} is confirmed. Total EGP {total}. Thank you!
```

**Unicode:** Arabic SMS messages use Unicode (UCS-2) encoding. This reduces characters per SMS segment to 70 (vs 160 for GSM-7). The SMS provider must support Unicode. Template length must be verified against per-segment limits (DEC-004 dependency).

---

## 8. Admin Content Management

The admin product creation and editing interface must support entry of both `ar` and `en` values for localized fields.

### Admin Product Form Requirements
- Separate inputs for `name.ar` and `name.en`
- Separate textarea for `description.ar` and `description.en`
- `ar` fields: RTL text input direction
- `en` fields: LTR text input direction
- Both `ar` and `en` are required before a product can be marked `active`

**Client responsibility:** Provide Arabic copy for all 8 existing products before go-live.

---

## 9. Implementation Checklist (Not Yet Done)

```
□ Mongoose LocalizedString sub-schema defined and reused across models
□ API middleware extracts Accept-Language and attaches lang to request context
□ Service layer selects correct language field based on request context
□ Admin API returns { ar, en } objects (not resolved strings)
□ Customer API returns resolved string + lang metadata
□ Frontend toggleLang() updated to persist choice to localStorage
□ Frontend fetch wrapper attaches Accept-Language header on all requests
□ CSS logical properties applied to layout-direction-sensitive components
□ Arabic font (Noto Sans Arabic) confirmed and loaded
□ RTL layout tested at 375px, 768px, 1280px
□ Directional icons audited and mirrored where required
□ SMS template Unicode length verified with selected provider
□ Admin product form supports ar + en input fields
□ All 8 seed products have Arabic content (client to provide)
```

---

## Related Documents

- Database schema: `docs/05-database/ERD.md` (LocalizedString pattern)
- API language negotiation: `docs/04-api/API-Design.md`
- Language decisions: `docs/00-ai/Decision-Log.md` DEC-015, DEC-023, DEC-024
- SMS templates: `docs/06-integrations/SMS-Integration-Specification.md`

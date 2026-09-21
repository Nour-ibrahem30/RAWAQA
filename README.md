<div align="center">

<img src="frontend/public/logo.png" alt="RAWAQA Logo" width="110" />

# RAWAQA — رواقة

### راحة حرفية. مصممة للحياة.
### Crafted Comfort. Designed for Life.

**Bilingual e-commerce platform for premium bean bag chairs — built for Egypt.**

<br />

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-blue?logo=postgresql)](https://neon.tech)
[![Cloudflare Workers](https://img.shields.io/badge/Backend-Cloudflare%20Workers-orange?logo=cloudflare)](https://workers.cloudflare.com)
[![Vercel](https://img.shields.io/badge/Frontend-Vercel-black?logo=vercel)](https://vercel.com)

<br />

**[🌐 Live Website](https://rawaqa-ruby.vercel.app/ar)**

</div>

---

## Overview

**RAWAQA** is a full-stack e-commerce platform for the Egyptian market specialising in premium bean bag chairs.

- **Arabic / English** bilingual with full RTL/LTR support
- **Cloudflare Workers** backend with zero cold starts
- **Neon PostgreSQL** with Prisma ORM
- **Vercel** frontend with ISR
- **Cloudinary** image storage with direct browser upload
- **Cash on Delivery** checkout with inventory protection

---

## ✨ Features

| Area | Highlights |
|---|---|
| **Storefront** | Product browsing, categories, cart, checkout, order tracking |
| **Auth** | JWT + refresh tokens, Google OAuth, email verification |
| **Admin** | Dashboard, products, orders, categories, coupons, ads, content, site settings |
| **CMS** | Live editable Hero, About, Why, Stats, CTA, Footer sections |
| **Theme** | Dynamic color presets + full light/white theme via CSS variables |
| **Animations** | Cinematic entrance animations, scroll-reveal, stagger effects (see below) |
| **SEO** | Dynamic sitemap, robots.txt, image alt text management |
| **Security** | Rate limiting, ownership checks, server-side price validation, idempotency |

---

## 🎬 Animation System

RAWAQA uses a layered animation system built entirely with CSS keyframes and CSS custom properties — no external animation library required.

### Hero Section

| Element | Animation | Duration |
|---|---|---|
| Background slideshow | `heroZoom` — Ken Burns slow zoom | 8 s |
| Eyebrow label | `heroEyebrowInLtr/Rtl` — directional slide + fade | 650 ms |
| Accent line | `heroAccentGrow` — scaleX from origin | 500 ms |
| Headline words | `heroWordDrop` — per-word blur + translateY stagger | 700 ms × n |
| Separator line | `heroAccentGrow` — delayed after headline | 600 ms |
| Sub-copy | `heroSubIn` — blur + translateY | 650 ms |
| CTA buttons | `heroCTAIn` — spring overshoot scale | 550 ms × 2 |
| Stats numbers | `heroStatIn` + `heroGoldLinePulse` — slide in then pulse | 480 ms |
| Gold ambient glow | `glowPulse` — continuous opacity breathe | 5 s ∞ |

### Scroll Reveal

Sections fade/slide in as they enter the viewport using `IntersectionObserver` + CSS transitions:

```css
/* Hidden until .visible is added */
[data-reveal="up"]    { opacity: 0; transform: translateY(40px); }
[data-reveal="left"]  { opacity: 0; transform: translateX(-40px); }
[data-reveal="scale"] { opacity: 0; transform: scale(.94) translateY(20px); }

/* Triggered by JS observer */
.section-reveal.visible [data-reveal] { opacity: 1; transform: none; }
```

Children with `data-stagger` animate sequentially with 60–460 ms delays.

### Product Cards

```
Card entrance     cardEntrance   — translateY + scale + blur   560 ms per card
Image crossfade   opacity        — smooth 220 ms crossfade     
Dot indicators    width expand   — active dot expands to pill  280 ms
Hover lift        translateY     — card lifts 6 px on hover   
```

### Loading Screen

Full-screen luxury intro with:
- Kinetic concentric rings (counter-rotating, diamond nodes)
- Gold ember particles drifting upward
- Shimmer text gradient sweep
- Liquid gold progress thread
- 3.2 s default duration, user-skippable

### Theme Transitions

All CSS custom properties transition smoothly (280 ms) when switching between the 7 colour presets — backgrounds, borders, text, buttons all blend without a flash.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────┐
│     Next.js 14 (App Router)         │
│     Vercel — ISR revalidate 60s     │
└──────────────────┬──────────────────┘
                   │ HTTPS / REST
                   ▼
┌─────────────────────────────────────┐
│   Express on Cloudflare Workers     │
│   Prisma + @prisma/adapter-neon     │
└──────────────────┬──────────────────┘
                   │ WebSocket / 443
                   ▼
┌─────────────────────────────────────┐
│   Neon PostgreSQL (serverless)      │
└─────────────────────────────────────┘
```

**Image uploads** go directly from the browser to **Cloudinary** (unsigned preset) — bypassing the Worker to avoid `multipart/form-data` limitations.

---

## 🧰 Tech Stack

### Frontend

| Tech | Purpose |
|---|---|
| Next.js 14 | React framework, App Router, ISR |
| TypeScript | Type safety |
| Tailwind CSS | Utility styling |
| next-intl | Arabic / English i18n |
| Cairo | Arabic typography |
| Fraunces | Display headings |
| Manrope | Interface body text |
| Cloudinary | Direct browser image upload |

### Backend

| Tech | Purpose |
|---|---|
| Cloudflare Workers | Serverless edge runtime |
| Express (via Hono adapter) | REST API |
| TypeScript | Type safety |
| Prisma 7 | ORM |
| Neon PostgreSQL | Database |
| JWT | Auth tokens |
| Zod | Input validation |

---

## 🎨 Design Tokens

```css
/* Default dark theme */
--charcoal:   #15130F;   /* primary background */
--charcoal-soft: #1E1B15; /* card surfaces */
--ivory:      #F7F4EC;   /* primary text / light bg */
--gold-light: #D2B56A;   /* CTAs, active states */
--gold:       #AD8A4C;   /* hover, highlights */
--ink:        #262117;   /* body text */
```

7 preset themes available in `/admin/settings`:
Classic Gold (default) · Imperial Emerald · Sapphire Midnight · Tuscan Terracotta · Obsidian Noir · Bordeaux Plum · **Pure White**

---

## ⚙️ Local Development

```bash
# Frontend
cd frontend
npm install
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL
npm run dev                         # http://localhost:3000

# Backend
cd backend
npm install
cp .env.example .env               # set DATABASE_URL, JWT secrets
npm run dev                         # http://localhost:10000
```

### Key env vars

**Frontend** (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:10000/api
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your-unsigned-preset
```

**Backend** (`backend/.env`)
```env
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
CLOUDINARY_ENABLED=true
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

---

## 📁 Project Structure

```
RAWAQA/
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── [locale]/      # storefront pages
│       │   └── admin/         # admin dashboard
│       ├── components/
│       │   ├── ui/            # HeroSlideshow, LoadingScreen, etc.
│       │   ├── product/       # ProductCard, WishlistButton
│       │   ├── auth/          # GoogleAuthButton
│       │   └── layout/        # Navbar, Footer
│       ├── context/           # Auth, Cart, Toast
│       └── lib/               # api.ts, utils.ts, types.ts
│
├── backend/
│   └── src/
│       ├── controllers/
│       ├── services/
│       ├── repositories/
│       ├── routes/
│       ├── middleware/
│       └── workers/           # outbox, auto-cancel
│
├── docs/                      # architecture, API, deployment docs
└── README.md
```

---

## 🔐 Security

- Server-side price validation — browser values never trusted
- Atomic inventory reservation — no overselling
- JWT access (15 min) + refresh (7 days) rotation
- Rate limiting on auth endpoints (Cloudflare IP-aware)
- Ownership checks on all customer resources
- Idempotency keys on order creation
- Zod schema validation on all API inputs
- CORS restricted to production origin

---

## 🚀 Deployment

| Service | Purpose |
|---|---|
| **Vercel** | Frontend (auto-deploy from `main`) |
| **Cloudflare Workers** | Backend edge runtime |
| **Neon** | PostgreSQL serverless DB |
| **Cloudinary** | Image CDN + upload |
| **Render** (fallback) | Node.js backend alternative |

---

## 🗺️ Roadmap

- [x] Bilingual storefront (AR/EN)
- [x] PostgreSQL + Prisma cutover
- [x] Cloudflare Workers deployment
- [x] Dynamic CMS (Hero, About, Why, Stats, CTA, Footer)
- [x] 7 colour theme presets + light theme
- [x] Direct Cloudinary upload
- [x] Google OAuth
- [x] Admin dashboard with full CRUD
- [ ] Online payment gateway (Paymob / Stripe)
- [ ] Odoo ERP integration
- [ ] SMS notifications
- [ ] Shipping provider integration

---

<div align="center">

### RAWAQA — رواقة
**راحة حرفية. مصممة للحياة.**
🇪🇬 Made in Egypt

</div>

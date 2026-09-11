<div align="center">

<img src="frontend/public/logo.png" alt="RAWAQA Logo" width="100" style="border-radius: 20px;" />

# RAWAQA — رواقة

### راحة حرفية. مصممة للحياة.
### Crafted Comfort. Designed for Life.

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-green?logo=mongodb)](https://mongodb.com)
[![Node.js](https://img.shields.io/badge/Node.js-≥18-339933?logo=node.js)](https://nodejs.org)
[![License](https://img.shields.io/badge/License-Private-red)](.)

</div>

---

## نظرة عامة | Overview

**RAWAQA** منصة تجارة إلكترونية متكاملة لبيع كراسي البين باج الفاخرة في السوق المصري. تدعم اللغتين العربية والإنجليزية، مع نظام إدارة طلبات كامل وتكامل مع Odoo ERP وإشعارات SMS.

**RAWAQA** is a full-stack e-commerce platform for premium bean bag chairs in the Egyptian market — bilingual Arabic/English, with a complete order management system, Odoo ERP integration, and SMS notifications.

---

## هيكل المشروع | Project Structure

```
RAWAQA/
├── frontend/               # Next.js 14 · TypeScript · Tailwind CSS
│   └── src/
│       ├── app/            # App Router pages (AR/EN locales)
│       ├── components/     # Reusable UI components
│       ├── context/        # Cart, Auth, Toast providers
│       └── lib/            # API client, types, utilities
│
├── backend/                # Node.js · TypeScript · Express
│   └── src/
│       ├── controllers/    # Route handlers
│       ├── services/       # Business logic
│       ├── models/         # Mongoose schemas
│       ├── routes/         # API route definitions
│       ├── middleware/     # Auth, validation, security
│       └── workers/        # Background job processors
│
└── ai/                     # AI context & documentation layer
```

---

## التقنيات | Tech Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.2 | React framework + App Router |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 3.x | Utility-first styling |
| next-intl | 3.x | Arabic / English i18n |
| Cairo | Google Fonts | Arabic typography |
| Fraunces | Google Fonts | Display headings |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | ≥ 18 | Runtime |
| Express | 4.18 | HTTP framework |
| TypeScript | 5.x | Type safety |
| Mongoose | 8.x | MongoDB ODM |
| JWT + bcryptjs | — | Authentication |
| Zod | 3.x | Input validation |
| Winston | 3.x | Structured logging |
| Vonage SDK | 3.x | SMS notifications |

### Infrastructure
| Service | Purpose |
|---------|---------|
| MongoDB | Primary database |
| Odoo ERP | Order & inventory sync |
| Vonage | SMS order confirmations |
| Vercel | Frontend hosting |
| Render / Abasthan | Backend hosting |

---

## تشغيل المشروع | Local Development

### المتطلبات | Prerequisites

- Node.js ≥ 18
- MongoDB (local or Atlas)
- npm ≥ 9

### Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

### Backend

```bash
cd backend
cp .env.example .env
# Fill in your values in .env
npm install
npm run dev
# → http://localhost:5002
```

### Seed Database

```bash
cd backend
node seed-prod.js
# Creates: admin user, categories, products
```

---

## المتغيرات البيئية | Environment Variables

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:5002/api
```

### Backend (`backend/.env`)

```env
# Database
MONGODB_URI=mongodb://localhost:27017/rawaqa

# Authentication
JWT_ACCESS_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# SMS (Vonage)
SMS_ENABLED=true
SMS_PROVIDER=vonage
VONAGE_API_KEY=your-api-key
VONAGE_API_SECRET=your-api-secret
VONAGE_FROM_NUMBER=RAWAQA

# Odoo ERP (optional)
ODOO_SYNC_ENABLED=false
ODOO_URL=https://your-odoo.com
ODOO_DB=your-db
ODOO_USERNAME=api_user
ODOO_PASSWORD=your-password

# Admin
ADMIN_EMAIL=admin@rawaqa.com
ADMIN_PASSWORD=StrongPassword123
```

---

## الصفحات | Pages

### Customer

| Route | الصفحة | الوصول |
|-------|--------|--------|
| `/ar` · `/en` | الرئيسية | عام |
| `/[locale]/shop` | المتجر | عام |
| `/[locale]/product/[id]` | تفاصيل المنتج | عام |
| `/[locale]/cart` | سلة التسوق | عام |
| `/[locale]/checkout` | إتمام الطلب | مسجّل |
| `/[locale]/order-confirmation/[n]` | تأكيد الطلب | — |
| `/[locale]/track` | تتبع الطلب | عام |
| `/[locale]/login` | تسجيل الدخول | — |
| `/[locale]/register` | إنشاء حساب | — |
| `/[locale]/account` | حسابي | مسجّل |

### Admin

| Route | الوظيفة |
|-------|---------|
| `/admin` | لوحة التحكم |
| `/admin/products` | إدارة المنتجات |
| `/admin/categories` | إدارة الفئات |
| `/admin/orders` | إدارة الطلبات |
| `/admin/coupons` | إدارة الكوبونات |
| `/admin/ads` | الإعلانات والبانرات |
| `/admin/content` | إدارة المحتوى (CMS) |
| `/admin/settings` | إعدادات الموقع والألوان |

---

## نظام التصميم | Design System

```css
--charcoal:    #15130F   /* خلفية رئيسية */
--ivory:       #F7F4EC   /* خلفية فاتحة */
--gold-light:  #D2B56A   /* لون رئيسي */
--gold:        #AD8A4C   /* لون ثانوي */
--ink:         #262117   /* نص رئيسي */
```

**الخطوط:** Cairo (عربي) · Fraunces (عناوين) · Manrope (نص)

---

## الأمان | Security

- ✅ JWT (15 دقيقة access / 7 أيام refresh مع rotation)
- ✅ bcryptjs — تشفير كلمات المرور
- ✅ MongoDB Sanitize — حماية من NoSQL injection
- ✅ Rate limiting على endpoints المصادقة
- ✅ Helmet security headers
- ✅ Zod input validation
- ✅ CORS configuration
- ✅ Idempotency keys — منع الطلبات المكررة
- ✅ Ownership check على إلغاء الطلبات (IDOR protection)

---

## الميزات الرئيسية | Core Features

- 🛒 سلة تسوق للزوار والمسجّلين مع دمج تلقائي عند تسجيل الدخول
- 📦 إدارة مخزون ذرية (Atomic) — حجز فوري عند الطلب
- 🎟️ نظام كوبونات (نسبة مئوية / مبلغ ثابت + حد أقصى للخصم)
- 💳 الدفع عند الاستلام (Cash on Delivery)
- 📱 إشعارات SMS بالعربية عبر Vonage
- 📧 إشعارات بريد إلكتروني
- 🌐 ثنائية اللغة (عربي RTL + إنجليزي LTR)
- 🖨️ طباعة فواتير وبوالص شحن
- 📊 لوحة تحكم إدارية متكاملة
- 🔄 تكامل مع Odoo ERP (اختياري)

---

## الـ Deploy | Deployment

### Frontend — Vercel

```bash
cd frontend
vercel --prod
```

متغير مطلوب في Vercel:
```
NEXT_PUBLIC_API_URL=https://your-backend-url/api
```

### Backend — Render / VPS

```bash
cd backend
npm run build
npm start   # node dist/server.js
```

---

## التوثيق | Documentation

- [`backend/API-DOCUMENTATION.md`](backend/API-DOCUMENTATION.md) — مرجع API الكامل
- [`backend/DEPLOYMENT.md`](backend/DEPLOYMENT.md) — دليل النشر
- [`ai/`](ai/) — طبقة السياق للـ AI agents

---

<div align="center">

**RAWAQA** — راحة حرفية. مصممة للحياة.

🇪🇬 صنع في مصر

</div>

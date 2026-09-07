# RAWAQA — Deployment Guide

## Frontend (Vercel)

### Vercel Project Settings
- **Framework:** Next.js  
- **Root Directory:** `frontend`  
- **Build Command:** `npm run build`  
- **Output Directory:** `.next`

### Required Environment Variables (Vercel Dashboard)

```
# Backend API URL (your production backend server)
NEXT_PUBLIC_API_URL=https://your-backend-domain.com/api

# Sentry (optional — leave empty to disable)
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=
SENTRY_ORG=
SENTRY_PROJECT=rawaqa-frontend
```

---

## Backend (Server / Railway / Render / VPS)

### Required Environment Variables

```bash
NODE_ENV=production
PORT=5002

# MongoDB Atlas (required)
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/rawaqa?retryWrites=true&w=majority

# JWT (generate with: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
JWT_ACCESS_SECRET=<64-char-random-string>
JWT_REFRESH_SECRET=<64-char-random-string>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS — your Vercel frontend URL
CORS_ORIGIN=https://your-app.vercel.app

# Client URLs (for email verification links)
CLIENT_URL=https://your-app.vercel.app
CLIENT_URL_AR=https://your-app.vercel.app/ar
CLIENT_URL_EN=https://your-app.vercel.app/en

# Security
COOKIE_SECURE=true
COOKIE_SAME_SITE=none
TRUST_PROXY=true
HELMET_CSP_ENABLED=false

# Admin account
ADMIN_EMAIL=admin@rawaqa.com
ADMIN_PASSWORD=<strong-password>

# Cloudinary (for image uploads in production)
CLOUDINARY_ENABLED=true
CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>
CLOUDINARY_FOLDER=rawaqa/products

# Email (optional — for order confirmations)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your@gmail.com
SMTP_PASS=<app-password>
SMTP_FROM=hello@rawaqa.com

# Workers
ENABLE_WORKERS=true
OUTBOX_WORKER_ENABLED=true
RECONCILIATION_ENABLED=false

# Feature Flags
FEATURE_REVIEWS=true
FEATURE_WISHLIST=true

# Sentry (optional)
SENTRY_DSN=
SENTRY_ENVIRONMENT=production
```

---

## Important Notes

1. **File Uploads on Vercel:** Vercel is serverless — local disk uploads won't persist. You MUST set `CLOUDINARY_ENABLED=true` with credentials in production.

2. **MongoDB:** Use MongoDB Atlas (free tier available). Local MongoDB won't be accessible from Vercel/external servers.

3. **CORS:** Set `CORS_ORIGIN` to your exact Vercel domain (e.g. `https://rawaqa.vercel.app`). Multiple origins: `https://rawaqa.vercel.app,https://www.rawaqa.com`

4. **Cookie Security:** In production set `COOKIE_SECURE=true` and `COOKIE_SAME_SITE=none` if frontend and backend are on different domains.

5. **After Deployment:** Run the seed script to create admin user:
   ```bash
   node seed-real-products.js
   ```

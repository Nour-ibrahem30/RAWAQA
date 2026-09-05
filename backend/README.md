# RAWAQA 2.0 - Backend

> Production-grade e-commerce backend for Egyptian bean bag brand

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Server runs on: `http://localhost:5002`

---

## 📋 Overview

**RAWAQA 2.0** is a production-ready e-commerce backend built with Enterprise-grade patterns:

- ✅ **48 API Endpoints** - Complete e-commerce functionality
- ✅ **Atomic Inventory Management** - MongoDB transactions ensure consistency
- ✅ **True Refresh Token Rotation** - Maximum security with session tracking
- ✅ **Idempotency Keys** - Prevent duplicate orders
- ✅ **Outbox Pattern** - Reliable event processing with atomic lease
- ✅ **Odoo ERP Integration** - Real-time inventory sync
- ✅ **SMS Notifications** - Arabic/English via Vonage
- ✅ **Background Workers** - Automated outbox processing & reconciliation
- ✅ **Bilingual Support** - Arabic & English throughout

---

## 🏗️ Architecture

### Tech Stack

- **Runtime**: Node.js 24.x
- **Framework**: Express.js 4.x
- **Language**: TypeScript 5.x (strict mode)
- **Database**: MongoDB 8.x with Mongoose
- **Authentication**: JWT with bcryptjs
- **SMS**: Vonage API
- **ERP**: Odoo XML-RPC Integration
- **Logging**: Winston with daily rotation
- **Security**: Helmet, CORS, Rate Limiting, MongoSanitize

### Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration (database, env, logger)
│   ├── controllers/     # Request handlers (6 modules)
│   ├── middleware/      # Auth, validation, error handling
│   ├── models/          # Mongoose schemas (8 models)
│   ├── routes/          # API routes (6 route files)
│   ├── services/        # Business logic (7 services)
│   ├── utils/           # Utilities (JWT, helpers)
│   ├── workers/         # Background workers (2 workers)
│   └── server.ts        # Application entry point
├── dist/                # Compiled JavaScript (generated)
├── logs/                # Application logs (generated)
├── .env                 # Environment variables (git-ignored)
├── .env.example         # Environment template
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript configuration
└── README.md            # This file
```

---

## 📡 API Endpoints

### Summary

| Module      | Endpoints | Description                          |
|-------------|-----------|--------------------------------------|
| Auth        | 7         | Register, login, refresh, profile    |
| Products    | 9         | CRUD, filtering, search, featured    |
| Categories  | 8         | CRUD, slug lookup, reordering        |
| Cart        | 7         | Add, update, remove, merge, totals   |
| Checkout    | 3         | Process, cancel, confirm delivery    |
| Orders      | 14        | User orders + admin management       |
| **Total**   | **48**    | Production-ready endpoints           |

### Authentication Flow

```
1. POST /api/auth/register  → User registers
2. POST /api/auth/login     → Returns access + refresh tokens
3. Use access token in:       Authorization: Bearer <token>
4. POST /api/auth/refresh   → Get new tokens (old refresh invalidated)
5. POST /api/auth/logout    → Invalidate session
```

### Checkout Flow (Atomic)

```
1. User adds items to cart
2. POST /api/checkout with Idempotency-Key header
   → Atomic transaction:
     - Validates cart & stock
     - Reserves inventory (increments reservedQuantity)
     - Creates order
     - Creates outbox events
     - Stores idempotency key
     - Clears cart
   → All or nothing (transaction rollback on error)
3. Background worker processes outbox events:
   - Syncs to Odoo
   - Sends SMS confirmation
4. On delivery: POST /api/checkout/confirm-delivery/:id
   → Deducts onHandQuantity & reservedQuantity
5. On cancellation: POST /api/checkout/cancel/:id
   → Releases reservedQuantity
```

Full API documentation: [API-DOCUMENTATION.md](./API-DOCUMENTATION.md)

---

## 🔐 Security Features

### Authentication
- **JWT Access Tokens**: 15-minute expiry
- **Refresh Token Rotation**: New token on every refresh, old one invalidated
- **Session Tracking**: jti-based session IDs
- **bcrypt Hashing**: 10 rounds (configurable)

### Request Security
- **Helmet**: Security headers
- **CORS**: Configurable origins
- **Rate Limiting**: Global + per-endpoint limits
- **Mongo Sanitization**: NoSQL injection prevention
- **Input Validation**: express-validator

### Idempotency
- **Unique Keys**: Prevent duplicate operations
- **Request Hashing**: SHA-256 validation
- **TTL**: 24-hour expiry

---

## 💾 Database Models

### Core Models

1. **User** - Customer & admin accounts
2. **Product** - Bean bag products with inventory
3. **Category** - Product categories
4. **Order** - Customer orders with Odoo sync
5. **Cart** - Shopping cart (guest + authenticated)
6. **RefreshSession** - Active user sessions
7. **IdempotencyKey** - Prevent duplicate checkouts
8. **OutboxEvent** - Event sourcing for reliability

### Inventory Model

```typescript
inventory: {
  onHandQuantity: 100,      // Physical stock (from Odoo)
  reservedQuantity: 15,     // Reserved for pending orders
  availableQuantity: 85,    // Computed: onHandQuantity - reservedQuantity
  lowStockThreshold: 10,
  lastSyncedAt: Date
}
```

---

## 🤖 Background Workers

### Outbox Worker

**Purpose**: Process outbox events reliably

**Features**:
- Atomic lease pattern (prevents duplicate processing)
- Runs every 5 seconds
- Batch processing (10 events per cycle)
- Automatic retries (max 5 attempts)
- Graceful shutdown

**Events Processed**:
- `OrderCreated` → Sync to Odoo + Send SMS
- `OrderStatusChanged` → Update Odoo + Notify customer
- `OrderCancelled` → Release inventory + Send SMS
- `OrderDelivered` → Deduct inventory + Send SMS

### Inventory Reconciliation Worker

**Purpose**: Sync inventory with Odoo ERP

**Features**:
- Runs every hour (configurable)
- Batch sync all products
- Discrepancy detection & logging
- Stale product identification

---

## 🔧 Configuration

### Environment Variables

**Required:**
```bash
NODE_ENV=development|production
PORT=5002
MONGODB_URI=mongodb://localhost:27017/rawaqa
JWT_ACCESS_SECRET=<min-32-chars>
JWT_REFRESH_SECRET=<min-32-chars>
```

**Optional (with defaults):**
```bash
# Workers
ENABLE_WORKERS=true
OUTBOX_WORKER_ENABLED=true
RECONCILIATION_ENABLED=false

# SMS
SMS_ENABLED=false
SMS_PROVIDER=mock|vonage|twilio
VONAGE_API_KEY=
VONAGE_API_SECRET=

# Odoo
ODOO_SYNC_ENABLED=false
ODOO_URL=
ODOO_DB=
ODOO_USERNAME=
ODOO_PASSWORD=

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX_REQUESTS=10
```

Full config: [.env.example](./.env.example)

---

## 🧪 Development

### Available Scripts

```bash
# Development
npm run dev          # Start dev server with nodemon

# Build
npm run build        # Compile TypeScript to dist/

# Production
npm start            # Run compiled code from dist/

# Code Quality
npm run lint         # ESLint
npm run format       # Prettier
```

### Development Workflow

1. **Make changes** in `src/`
2. **Auto-reload** via nodemon
3. **Check logs** in `logs/` folder
4. **Test endpoints** with Postman/Insomnia
5. **Build** before committing

---

## 📦 Deployment

### Quick Deploy (PM2)

```bash
# Install PM2
npm install -g pm2

# Build application
npm run build

# Start with PM2
pm2 start dist/server.js --name rawaqa-backend -i 2

# Save configuration
pm2 save
pm2 startup
```

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Generate strong JWT secrets
- [ ] Configure MongoDB with authentication
- [ ] Enable HTTPS (`COOKIE_SECURE=true`)
- [ ] Set restrictive CORS origins
- [ ] Configure Odoo integration
- [ ] Setup SMS provider (Vonage)
- [ ] Enable monitoring (Sentry)
- [ ] Configure backups
- [ ] Setup reverse proxy (Nginx)

Full deployment guide: [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## 📊 Monitoring

### Health Check

```bash
curl http://localhost:5002/health

{
  "status": "ok",
  "timestamp": "2026-09-03T12:00:00Z",
  "uptime": 3600,
  "environment": "development",
  "database": "connected"
}
```

### Logs

```bash
# Application logs
tail -f logs/combined-2026-09-03.log

# Error logs only
tail -f logs/error-2026-09-03.log

# PM2 logs (if using PM2)
pm2 logs rawaqa-backend
```

### Metrics

- Request logs via Winston
- Error tracking via Sentry (if configured)
- Database metrics via MongoDB Atlas (if using cloud)

---

## 🛠️ Troubleshooting

### Port Already in Use

```bash
# Change PORT in .env
PORT=5003

# Or kill process on port 5002
# Windows:
netstat -ano | findstr :5002
taskkill /PID <PID> /F

# Linux/Mac:
lsof -ti:5002 | xargs kill -9
```

### MongoDB Connection Failed

```bash
# Check MongoDB status
# Windows: Check Services
# Linux: sudo systemctl status mongod

# Verify connection string in .env
MONGODB_URI=mongodb://localhost:27017/rawaqa
```

### Workers Not Starting

```bash
# Check ENABLE_WORKERS in .env
ENABLE_WORKERS=true

# Check logs for errors
tail -f logs/combined-*.log | grep worker
```

---

## 🤝 Contributing

### Code Style

- TypeScript strict mode
- ESLint + Prettier
- Conventional commits
- No `any` types (use proper types)

### Commit Format

```
feat: add order cancellation endpoint
fix: resolve inventory race condition
docs: update API documentation
refactor: simplify checkout service
```

---

## 📄 License

UNLICENSED - Private project for RAWAQA

---

## 📞 Support

- **Email**: support@rawaqa.com
- **Documentation**: [API Docs](./API-DOCUMENTATION.md) | [Deployment Guide](./DEPLOYMENT.md)

---

**Built with ❤️ in Egypt 🇪🇬 | RAWAQA 2.0 Backend**

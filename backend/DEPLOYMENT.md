# RAWAQA 2.0 - Backend Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Application Deployment](#application-deployment)
5. [Background Workers](#background-workers)
6. [Monitoring & Logging](#monitoring--logging)
7. [Security Checklist](#security-checklist)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- **Node.js**: v18.x or v20.x (LTS)
- **MongoDB**: v6.0+ or v7.0+
- **PM2**: For process management (production)
- **Nginx**: For reverse proxy (recommended)

### Recommended Infrastructure
- **Compute**: 2 vCPUs, 4GB RAM minimum
- **Storage**: 20GB SSD minimum
- **Network**: 100Mbps minimum

---

## Environment Setup

### 1. Clone Repository
```bash
git clone <repository-url>
cd RAWAQA/backend
```

### 2. Install Dependencies
```bash
npm ci --production
```

### 3. Create Environment File
```bash
cp .env.example .env.production
```

### 4. Configure Environment Variables

**Critical Variables (MUST CHANGE):**

```bash
# Node Environment
NODE_ENV=production
PORT=5000

# Database
MONGODB_URI=mongodb://username:password@localhost:27017/rawaqa?authSource=admin

# JWT Secrets (Generate strong random strings)
JWT_ACCESS_SECRET=$(openssl rand -base64 64)
JWT_REFRESH_SECRET=$(openssl rand -base64 64)

# Cookies
COOKIE_DOMAIN=rawaqa.com
COOKIE_SECURE=true
COOKIE_SAME_SITE=strict

# CORS
CORS_ORIGIN=https://rawaqa.com,https://www.rawaqa.com
CORS_CREDENTIALS=true

# Trust Proxy (if behind Nginx/load balancer)
TRUST_PROXY=true

# Odoo Integration
ODOO_URL=https://your-odoo-instance.com
ODOO_DB=rawaqa_production
ODOO_USERNAME=api_user
ODOO_PASSWORD=<secure-password>
ODOO_SYNC_ENABLED=true

# SMS (Vonage)
SMS_ENABLED=true
SMS_PROVIDER=vonage
VONAGE_API_KEY=<your-api-key>
VONAGE_API_SECRET=<your-api-secret>
VONAGE_FROM_NUMBER=RAWAQA

# Workers
ENABLE_WORKERS=true
OUTBOX_WORKER_ENABLED=true
RECONCILIATION_ENABLED=true

# Client URLs
CLIENT_URL=https://rawaqa.com
CLIENT_URL_AR=https://rawaqa.com/ar
CLIENT_URL_EN=https://rawaqa.com/en

# Admin
ADMIN_EMAIL=admin@rawaqa.com
ADMIN_PASSWORD=<generate-secure-password>

# Monitoring
SENTRY_DSN=<your-sentry-dsn>
SENTRY_ENVIRONMENT=production

# Logging
LOG_LEVEL=warn
LOG_FILE_ENABLED=true
```

---

## Database Setup

### 1. Install MongoDB

**Ubuntu/Debian:**
```bash
# Import MongoDB public key
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install MongoDB
sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

### 2. Create Database User

```bash
mongosh

use admin
db.createUser({
  user: "rawaqa_admin",
  pwd: "<secure-password>",
  roles: [
    { role: "readWrite", db: "rawaqa" },
    { role: "dbAdmin", db: "rawaqa" }
  ]
})

# Test connection
mongosh "mongodb://rawaqa_admin:<password>@localhost:27017/rawaqa?authSource=admin"
```

### 3. Create Indexes

```bash
npm run build
node dist/scripts/create-indexes.js
```

### 4. Seed Initial Data (Optional)

```bash
node dist/scripts/seed-categories.js
node dist/scripts/create-admin.js
```

---

## Application Deployment

### Option 1: PM2 (Recommended)

#### Install PM2
```bash
npm install -g pm2
```

#### Create PM2 Ecosystem File

**ecosystem.config.js:**
```javascript
module.exports = {
  apps: [
    {
      name: 'rawaqa-backend',
      script: './dist/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      max_memory_restart: '1G',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};
```

#### Deploy with PM2
```bash
# Build application
npm run build

# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
# Run the command PM2 provides

# Monitor
pm2 monit

# View logs
pm2 logs rawaqa-backend

# Restart
pm2 restart rawaqa-backend

# Stop
pm2 stop rawaqa-backend
```

### Option 2: Systemd Service

**Create service file:**
```bash
sudo nano /etc/systemd/system/rawaqa-backend.service
```

```ini
[Unit]
Description=RAWAQA 2.0 Backend
After=network.target mongodb.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/rawaqa/backend
ExecStart=/usr/bin/node /var/www/rawaqa/backend/dist/server.js
Restart=on-failure
RestartSec=10s
StandardOutput=journal
StandardError=journal
SyslogIdentifier=rawaqa-backend
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

**Start service:**
```bash
sudo systemctl daemon-reload
sudo systemctl start rawaqa-backend
sudo systemctl enable rawaqa-backend
sudo systemctl status rawaqa-backend

# View logs
sudo journalctl -u rawaqa-backend -f
```

---

## Nginx Configuration

**Create Nginx site:**
```bash
sudo nano /etc/nginx/sites-available/rawaqa-api
```

```nginx
upstream rawaqa_backend {
    least_conn;
    server 127.0.0.1:5000;
    # Add more instances if using PM2 cluster
    # server 127.0.0.1:5001;
}

server {
    listen 80;
    server_name api.rawaqa.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.rawaqa.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/api.rawaqa.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.rawaqa.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Logging
    access_log /var/log/nginx/rawaqa-api-access.log;
    error_log /var/log/nginx/rawaqa-api-error.log;

    # Proxy settings
    location / {
        proxy_pass http://rawaqa_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Buffer settings
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
        proxy_busy_buffers_size 8k;
    }

    # Health check endpoint (no auth required)
    location /health {
        proxy_pass http://rawaqa_backend;
        access_log off;
    }

    # Rate limiting for auth endpoints
    location /api/auth {
        limit_req zone=auth burst=5 nodelay;
        proxy_pass http://rawaqa_backend;
    }
}
```

**Enable site and reload Nginx:**
```bash
sudo ln -s /etc/nginx/sites-available/rawaqa-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

**Setup SSL with Let's Encrypt:**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.rawaqa.com
```

---

## Background Workers

Workers are automatically started with the main application if `ENABLE_WORKERS=true`.

### Monitor Workers
```bash
# Check PM2 logs
pm2 logs rawaqa-backend | grep -E 'worker|outbox|reconciliation'

# Check systemd logs
sudo journalctl -u rawaqa-backend | grep -E 'worker|outbox|reconciliation'
```

### Verify Worker Operation
```bash
# Check outbox events
mongosh "mongodb://rawaqa_admin:<password>@localhost:27017/rawaqa?authSource=admin"

use rawaqa
db.outboxevents.find({ processed: false }).count()
db.outboxevents.find({ processed: true }).limit(10).sort({ processedAt: -1 })

# Check inventory sync
db.products.find({ 'inventory.lastSyncedAt': { $exists: true } }).count()
```

---

## Monitoring & Logging

### Application Logs

**Locations:**
- Application logs: `backend/logs/combined-*.log`
- Error logs: `backend/logs/error-*.log`
- PM2 logs: `~/.pm2/logs/`
- Nginx logs: `/var/log/nginx/`

**View logs:**
```bash
# Application logs (last 100 lines)
tail -n 100 backend/logs/combined-$(date +%Y-%m-%d).log

# Error logs
tail -f backend/logs/error-$(date +%Y-%m-%d).log

# PM2 logs
pm2 logs rawaqa-backend --lines 100
```

### Health Monitoring

**Setup health check cron:**
```bash
# Add to crontab
crontab -e

# Check every 5 minutes
*/5 * * * * curl -f https://api.rawaqa.com/health || echo "Health check failed" | mail -s "RAWAQA API Down" admin@rawaqa.com
```

### Sentry Integration (Error Tracking)

Already configured if `SENTRY_DSN` is set in environment.

---

## Security Checklist

### ✅ Before Production

- [ ] Change all default passwords
- [ ] Generate strong JWT secrets (min 64 characters)
- [ ] Enable HTTPS only (`COOKIE_SECURE=true`)
- [ ] Set `TRUST_PROXY=true` if behind reverse proxy
- [ ] Configure firewall (allow only 22, 80, 443)
- [ ] Enable MongoDB authentication
- [ ] Restrict MongoDB to localhost only
- [ ] Set restrictive CORS origins
- [ ] Enable rate limiting
- [ ] Configure Helmet CSP
- [ ] Setup SSL certificates
- [ ] Enable log rotation
- [ ] Setup automated backups
- [ ] Configure monitoring alerts
- [ ] Review and test all error responses (no stack traces in production)
- [ ] Test authentication flows
- [ ] Test idempotency keys
- [ ] Verify atomic transactions work correctly

### Firewall Configuration

```bash
# UFW (Ubuntu)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### MongoDB Security

```bash
# Edit MongoDB config
sudo nano /etc/mongod.conf

# Enable authentication
security:
  authorization: enabled

# Bind to localhost only
net:
  bindIp: 127.0.0.1
  port: 27017

# Restart MongoDB
sudo systemctl restart mongod
```

---

## Backup & Recovery

### Database Backup

**Daily backup script:**
```bash
#!/bin/bash
# /usr/local/bin/backup-rawaqa-db.sh

BACKUP_DIR="/var/backups/rawaqa"
DATE=$(date +%Y-%m-%d-%H%M%S)
MONGODB_URI="mongodb://rawaqa_admin:<password>@localhost:27017/rawaqa?authSource=admin"

# Create backup
mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR/dump-$DATE"

# Compress
tar -czf "$BACKUP_DIR/rawaqa-$DATE.tar.gz" -C "$BACKUP_DIR" "dump-$DATE"

# Remove uncompressed dump
rm -rf "$BACKUP_DIR/dump-$DATE"

# Keep only last 7 days
find "$BACKUP_DIR" -name "rawaqa-*.tar.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/rawaqa-$DATE.tar.gz"
```

**Schedule backup:**
```bash
sudo chmod +x /usr/local/bin/backup-rawaqa-db.sh

# Add to crontab (daily at 2 AM)
0 2 * * * /usr/local/bin/backup-rawaqa-db.sh >> /var/log/rawaqa-backup.log 2>&1
```

### Restore Database

```bash
tar -xzf rawaqa-2026-09-03.tar.gz
mongorestore --uri="mongodb://rawaqa_admin:<password>@localhost:27017/rawaqa?authSource=admin" dump-2026-09-03/rawaqa
```

---

## Troubleshooting

### Application Won't Start

```bash
# Check logs
pm2 logs rawaqa-backend --err

# Check environment
pm2 env rawaqa-backend

# Verify MongoDB connection
mongosh "mongodb://rawaqa_admin:<password>@localhost:27017/rawaqa?authSource=admin"

# Check port availability
sudo netstat -tulpn | grep 5000
```

### High Memory Usage

```bash
# Check memory
pm2 status
free -h

# Restart application
pm2 restart rawaqa-backend
```

### Database Connection Issues

```bash
# Check MongoDB status
sudo systemctl status mongod

# Check MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log

# Test connection
mongosh "mongodb://rawaqa_admin:<password>@localhost:27017/rawaqa?authSource=admin"
```

### Workers Not Processing Events

```bash
# Check worker status in logs
pm2 logs rawaqa-backend | grep worker

# Check outbox events
mongosh rawaqa
db.outboxevents.find({ processed: false, lockedBy: null }).count()

# Manually release stuck events
db.outboxevents.updateMany(
  { processed: false, lockedUntil: { $lt: new Date() } },
  { $unset: { lockedBy: 1, lockedUntil: 1 } }
)
```

---

## Performance Optimization

### Database Indexes

Ensure all indexes are created:
```bash
node dist/scripts/create-indexes.js
```

### PM2 Cluster Mode

Use multiple instances for better performance:
```javascript
// ecosystem.config.js
instances: 'max', // or specific number like 4
exec_mode: 'cluster'
```

### Nginx Caching

Add caching for static/public endpoints:
```nginx
location ~* ^/api/(products|categories) {
    proxy_pass http://rawaqa_backend;
    proxy_cache rawaqa_cache;
    proxy_cache_valid 200 5m;
    add_header X-Cache-Status $upstream_cache_status;
}
```

---

## Maintenance

### Update Application

```bash
# Pull latest code
git pull origin main

# Install dependencies
npm ci --production

# Build
npm run build

# Restart with zero downtime
pm2 reload rawaqa-backend
```

### Database Maintenance

```bash
# Compact database (monthly)
mongosh rawaqa --eval "db.runCommand({ compact: 'products' })"
mongosh rawaqa --eval "db.runCommand({ compact: 'orders' })"

# Rebuild indexes
mongosh rawaqa --eval "db.products.reIndex()"
```

---

**Deployment Checklist Complete! 🚀**

For issues, contact: support@rawaqa.com

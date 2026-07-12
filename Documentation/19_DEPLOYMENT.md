# 19 — Deployment

## Infrastructure Overview

```
Cloudflare DNS
      ↓
Ubuntu 22.04 VPS (DigitalOcean / Hetzner / AWS EC2)
      ↓
Nginx (reverse proxy + SSL termination)
      ↓
PM2 (process manager)
  ├── Node.js API (port 4000)
  └── Next.js Frontend (port 3000)
      ↓
PostgreSQL 15 (local, port 5432)
      ↓
Cloudflare R2 (via HTTPS API)
      ↓
n8n (self-hosted, port 5678 — internal only)
```

---

## Server Setup (Ubuntu 22.04)

```bash
# System update
sudo apt update && sudo apt upgrade -y

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# pnpm
npm install -g pnpm

# PM2
npm install -g pm2

# PostgreSQL 15
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Nginx
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Certbot (SSL)
sudo apt install -y certbot python3-certbot-nginx
```

---

## PostgreSQL Setup

```bash
sudo -u postgres psql

CREATE USER questiongen WITH PASSWORD 'strongpassword';
CREATE DATABASE questiongen_db OWNER questiongen;
GRANT ALL PRIVILEGES ON DATABASE questiongen_db TO questiongen;
\q
```

---

## Environment Variables

### Backend `.env`

```env
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://questiongen:strongpassword@localhost:5432/questiongen_db

JWT_SECRET=<32+ char random string>
JWT_REFRESH_SECRET=<different 32+ char random string>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=<r2_key_id>
R2_SECRET_ACCESS_KEY=<r2_secret>
R2_BUCKET_NAME=questiongen
R2_PUBLIC_URL=https://assets.yourdomain.com

N8N_WEBHOOK_URL=https://n8n.yourdomain.com/webhook/<id>
N8N_SECRET_HEADER=<shared secret for webhook auth>

FRONTEND_URL=https://yourdomain.com
```

### Frontend `.env.local`

```env
NEXT_PUBLIC_API_URL=https://yourdomain.com/api/v1
```

---

## Nginx Configuration

```nginx
# /etc/nginx/sites-available/questiongen

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        client_max_body_size 10M;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/questiongen /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d yourdomain.com
```

---

## PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'questiongen-api',
      script: 'dist/app.js',
      cwd: '/var/www/questiongen/Backend',
      instances: 2,
      exec_mode: 'cluster',
      env: { NODE_ENV: 'production' },
    },
    {
      name: 'questiongen-frontend',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/var/www/questiongen/Frontend',
      env: { NODE_ENV: 'production', PORT: 3000 },
    },
  ],
}
```

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## Deployment Script

```bash
#!/bin/bash
# deploy.sh

set -e

cd /var/www/questiongen

echo "Pulling latest code..."
git pull origin main

echo "Installing dependencies..."
cd Backend && pnpm install --frozen-lockfile
cd ../Frontend && pnpm install --frozen-lockfile

echo "Running migrations..."
cd ../Backend && npx prisma migrate deploy

echo "Building..."
cd ../Backend && pnpm build
cd ../Frontend && pnpm build

echo "Restarting services..."
pm2 reload all

echo "Done."
```

---

## Database Backups

```bash
# /etc/cron.d/questiongen-backup
0 2 * * * postgres pg_dump questiongen_db | gzip > /backups/questiongen_$(date +\%Y\%m\%d).sql.gz

# Keep 30 days
0 3 * * * find /backups -name "*.sql.gz" -mtime +30 -delete
```

---

## SSL Renewal

Certbot auto-renews via systemd timer. Verify with:
```bash
sudo certbot renew --dry-run
```

---

## n8n Setup

n8n runs on the same server, internal port only:

```bash
# /etc/nginx/sites-available/n8n (internal, no public access)
# Only accessible from localhost or VPN

npm install -g n8n
N8N_PORT=5678 n8n start &
```

n8n is configured via its web UI at `http://localhost:5678` (accessed via SSH tunnel during setup).

---

## Health Check

```
GET /api/v1/health
Response: { status: "ok", db: "connected", timestamp: "..." }
```

Add to PM2 monitoring and uptime alerting (UptimeRobot or similar).

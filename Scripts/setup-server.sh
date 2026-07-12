#!/usr/bin/env bash
# One-time server setup script (run as root on a fresh Ubuntu 22.04 server)
set -euo pipefail

echo "=== Question Factory Server Setup ==="

# System packages
apt-get update && apt-get upgrade -y
apt-get install -y curl git nginx certbot python3-certbot-nginx ufw

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
npm install -g pm2

# PostgreSQL 15
apt-get install -y postgresql-15
systemctl enable postgresql
systemctl start postgresql

# Create DB user and database
sudo -u postgres psql <<SQL
CREATE USER questiongen WITH PASSWORD '${DB_PASSWORD:?DB_PASSWORD not set}';
CREATE DATABASE questiongen_db OWNER questiongen;
GRANT ALL PRIVILEGES ON DATABASE questiongen_db TO questiongen;
SQL

# App user and directories
useradd -m -s /bin/bash deploy || true
mkdir -p /var/log/questiongen /var/backups/questiongen
chown deploy:deploy /var/log/questiongen /var/backups/questiongen

# Firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# Nginx config
cp /home/deploy/questiongen/Deployment/nginx.conf /etc/nginx/sites-available/questiongen
ln -sf /etc/nginx/sites-available/questiongen /etc/nginx/sites-enabled/questiongen
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# PM2 startup
pm2 startup systemd -u deploy --hp /home/deploy
systemctl enable pm2-deploy

# Daily backup cron (2 AM)
echo "0 2 * * * deploy /home/deploy/questiongen/Scripts/backup.sh >> /var/log/questiongen/backup.log 2>&1" \
  > /etc/cron.d/questiongen-backup
chmod 644 /etc/cron.d/questiongen-backup

echo "=== Setup complete. Next: clone repo, configure .env, run deploy.sh ==="

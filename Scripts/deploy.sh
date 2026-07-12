#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/deploy/questiongen"
BRANCH="${1:-main}"
LOG="/var/log/questiongen/deploy.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"; }

log "=== Deploy started (branch: $BRANCH) ==="

# Pull latest
cd "$APP_DIR"
git fetch origin
git checkout "$BRANCH"
git pull origin "$BRANCH"
log "Git pull done"

# Backend
log "Building backend..."
cd "$APP_DIR/Backend"
npm ci --omit=dev
npx prisma migrate deploy
npm run build
log "Backend built"

# Frontend
log "Building frontend..."
cd "$APP_DIR/Frontend"
npm ci --omit=dev
npm run build
log "Frontend built"

# Reload PM2
cd "$APP_DIR"
pm2 reload Deployment/ecosystem.config.js --update-env
log "PM2 reloaded"

log "=== Deploy complete ==="

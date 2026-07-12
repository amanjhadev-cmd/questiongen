#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="/var/backups/questiongen"
DB_NAME="${POSTGRES_DB:-questiongen_db}"
DB_USER="${POSTGRES_USER:-questiongen}"
RETENTION_DAYS=14
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
FILE="$BACKUP_DIR/db_${TIMESTAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$FILE"
echo "Backup written: $FILE ($(du -sh "$FILE" | cut -f1))"

# Prune old backups
find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete
echo "Pruned backups older than ${RETENTION_DAYS} days"

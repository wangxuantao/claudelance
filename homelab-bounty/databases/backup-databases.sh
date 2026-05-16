#!/usr/bin/env bash
# Database backup for HomeLab Stack
# Usage: ./backup-databases.sh [--upload]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../.env"
[ -f "$ENV_FILE" ] && source "$ENV_FILE"

BACKUP_DIR="${BACKUP_DIR:-${SCRIPT_DIR}/../backups}"
PGHOST="${PGHOST:-postgres}"
PGUSER="${POSTGRES_ROOT_USER:-postgres}"
PGPASSWORD="${POSTGRES_ROOT_PASSWORD}"
REDIS_PASS="${REDIS_PASSWORD:-}"
UPLOAD="${1:-}"

export PGPASSWORD
mkdir -p "$BACKUP_DIR"

DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="$BACKUP_DIR/databases-$DATE.tar.gz"
TMPDIR=$(mktemp -d)

echo "=== HomeLab Stack: Database Backup ==="

# PostgreSQL
echo "Backing up PostgreSQL..."
pg_dumpall -h "$PGHOST" -U "$PGUSER" -f "$TMPDIR/postgres-all.sql" 2>/dev/null || echo "  Warning: pg_dumpall failed"

# Redis
if [ -n "$REDIS_PASS" ]; then
  echo "Triggering Redis BGSAVE..."
  redis-cli -h redis -a "$REDIS_PASS" BGSAVE 2>/dev/null || echo "  Warning: Redis BGSAVE failed"
  cp /data/dump.rdb "$TMPDIR/redis-dump.rdb" 2>/dev/null || true
fi

# Compress
tar czf "$BACKUP_FILE" -C "$TMPDIR" .
rm -rf "$TMPDIR"
echo "Backup: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"

# Cleanup old backups (keep 7 days)
find "$BACKUP_DIR" -name "databases-*.tar.gz" -mtime +7 -delete 2>/dev/null || true

# Optional MinIO upload
if [ "$UPLOAD" = "--upload" ] && command -v mc &>/dev/null; then
  mc cp "$BACKUP_FILE" "minio/homelab-backups/" 2>/dev/null && echo "Uploaded to MinIO" || echo "  Upload failed"
fi

echo "Done."

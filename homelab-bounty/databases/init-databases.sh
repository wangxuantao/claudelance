#!/usr/bin/env bash
# Idempotent database initialization for HomeLab Stack
# Run: ./init-databases.sh [--force]
set -euo pipefail

FORCE="${1:-}"

# Source env vars
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../.env"
[ -f "$ENV_FILE" ] && source "$ENV_FILE"

PGHOST="${PGHOST:-postgres}"
PGUSER="${POSTGRES_ROOT_USER:-postgres}"
PGPASSWORD="${POSTGRES_ROOT_PASSWORD}"

export PGPASSWORD

create_db() {
  local db="$1" pass="$2"
  echo -n "  $db ... "
  if psql -h "$PGHOST" -U "$PGUSER" -tAc "SELECT 1 FROM pg_database WHERE datname='$db'" 2>/dev/null | grep -q 1; then
    echo "exists"
    return 0
  fi
  psql -h "$PGHOST" -U "$PGUSER" -c "CREATE DATABASE \"$db\"" >/dev/null 2>&1
  psql -h "$PGHOST" -U "$PGUSER" -c "CREATE USER \"$db\" WITH PASSWORD '$pass'" >/dev/null 2>&1
  psql -h "$PGHOST" -U "$PGUSER" -c "GRANT ALL PRIVILEGES ON DATABASE \"$db\" TO \"$db\"" >/dev/null 2>&1
  psql -h "$PGHOST" -U "$PGUSER" -d "$db" -c "GRANT ALL ON SCHEMA public TO \"$db\"" >/dev/null 2>&1
  echo "created"
}

echo "=== HomeLab Stack: Database Initialization ==="
echo "Host: $PGHOST"

create_db "nextcloud" "${NEXTCLOUD_DB_PASSWORD:-changeme}"
create_db "gitea"     "${GITEA_DB_PASSWORD:-changeme}"
create_db "outline"   "${OUTLINE_DB_PASSWORD:-changeme}"
create_db "authentik" "${AUTHENTIK_DB_PASSWORD:-changeme}"
create_db "grafana"   "${GRAFANA_DB_PASSWORD:-changeme}"
create_db "vaultwarden" "${VAULTWARDEN_DB_PASSWORD:-changeme}"
create_db "bookstack" "${BOOKSTACK_DB_PASSWORD:-changeme}"

echo "Done."

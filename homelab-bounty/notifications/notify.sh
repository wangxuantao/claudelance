#!/usr/bin/env bash
set -euo pipefail
TOPIC="${1:-homelab}"
TITLE="${2:-Notification}"
MESSAGE="${3:-}"
NTFY_URL="https://ntfy.${DOMAIN:-localhost}"
curl -sf -H "Title: $TITLE" -H "Tags: tada" -d "$MESSAGE" "$NTFY_URL/$TOPIC" && echo "Sent via ntfy" || echo "ntfy failed"

#!/bin/sh
set -e

INTERVAL_SECONDS="${BACKUP_INTERVAL_SECONDS:-86400}"
RCLONE_REMOTE="${RCLONE_REMOTE:-gdrive:solar-tracking/backups}"

echo "[backup] interval: ${INTERVAL_SECONDS}s"
echo "[backup] remote: $RCLONE_REMOTE"

run_backup() {
  echo "[backup] $(date -u +%Y-%m-%dT%H:%M:%SZ) starting dump..."
  pnpm run db:dump
  if command -v rclone >/dev/null 2>&1; then
    rclone copy /app/backups/ "$RCLONE_REMOTE"
    echo "[backup] uploaded to $RCLONE_REMOTE"
  else
    echo "[backup] rclone not found — local dump only"
  fi
}

run_backup

while true; do
  echo "[backup] sleeping ${INTERVAL_SECONDS}s until next run"
  sleep "$INTERVAL_SECONDS"
  run_backup
done

#!/bin/sh
set -e

BACKUP_DIR="${BACKUP_DIR:-/app/backups}"
LOCAL_DAYS="${BACKUP_RETENTION_DAYS_LOCAL:-7}"
REMOTE_DAYS="${BACKUP_RETENTION_DAYS_REMOTE:-30}"
BUCKET="${CUBBIT_BUCKET:-solar-tracking-app}"
PREFIX="${CUBBIT_BACKUP_PREFIX:-backups}"
RCLONE_REMOTE="${RCLONE_REMOTE:-cubbit:${BUCKET}/${PREFIX}}"

echo "[backup-prune] local retention: ${LOCAL_DAYS}d in ${BACKUP_DIR}"

find "$BACKUP_DIR" -name 'solar_tracking_*.sql.gz' -mtime "+${LOCAL_DAYS}" -delete 2>/dev/null || true
find "$BACKUP_DIR" -name 'solar_tracking_*.sql' -size 0 -delete 2>/dev/null || true

if ! command -v rclone >/dev/null 2>&1; then
  echo "[backup-prune] rclone not found — skip remote prune"
  exit 0
fi

echo "[backup-prune] remote retention: ${REMOTE_DAYS}d on ${RCLONE_REMOTE}"
rclone delete "$RCLONE_REMOTE" \
  --include 'solar_tracking_*.sql.gz' \
  --min-age "${REMOTE_DAYS}d" || echo "[backup-prune] WARN remote prune failed"

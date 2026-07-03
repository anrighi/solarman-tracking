#!/bin/sh
set -e

echo "[backup] schedule: ${BACKUP_SCHEDULE_HOUR:-3}:00 ${BACKUP_SCHEDULE_TZ:-Europe/Rome}"
echo "[backup] remote: $(BUCKET="${CUBBIT_BUCKET:-solar-tracking-app}"; PREFIX="${CUBBIT_BACKUP_PREFIX:-backups}"; echo "${RCLONE_REMOTE:-cubbit:${BUCKET}/${PREFIX}}")"

run_backup() {
  echo "[backup] $(date -u +%Y-%m-%dT%H:%M:%SZ) starting dump..."
  pnpm tsx --env-file=.env scripts/backup-run.ts scheduled
  sh scripts/backup-prune.sh
}

run_backup

while true; do
  SLEEP_SECONDS="$(pnpm tsx --env-file=.env scripts/backup-sleep-seconds.ts)"
  echo "[backup] sleeping ${SLEEP_SECONDS}s until next scheduled run"
  sleep "$SLEEP_SECONDS"
  run_backup
done

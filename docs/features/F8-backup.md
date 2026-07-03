# F8 — DB persistence and Cubbit DS3 backup

| Field | Value |
|-------|-------|
| Status | done |
| Phase | 0 + 1 |
| Files | `scripts/db-dump.ts`, `scripts/db-restore.ts`, `scripts/backup-loop.sh`, `scripts/backup-prune.sh`, `src/features/backup/`, `docker-compose.yml`, `docs/BACKUP.md` |
| Tests | `pnpm run db:restore:test`, manual Settings UI verification |

## Acceptance criteria

- Named volume `mysql_data` documented
- `pnpm run db:dump` creates gzipped SQL + `app_config.json`
- `pnpm run db:restore` restores from dump
- Daily backup at 03:00 Europe/Rome with 7d local / 30d Cubbit retention
- `backup_runs` table tracks backup history and health
- Missing-backup check with optional Telegram alert
- Settings page `/settings/backup` lists backups, triggers manual backup, restores with confirmation
- `pnpm run db:restore:test` verifies round-trip restore

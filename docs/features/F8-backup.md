# F8 — DB persistence and Google Drive backup

| Field | Value |
|-------|-------|
| Status | done |
| Phase | 0 + 1 |
| Files | `scripts/db-dump.ts`, `scripts/db-restore.ts`, `docker-compose.yml`, `docs/BACKUP.md` |
| Tests | manual verification |

## Acceptance criteria

- Named volume `mysql_data` documented
- `pnpm run db:dump` creates gzipped SQL + `app_config.json`
- `pnpm run db:restore` restores from dump
- Optional Docker `backup` profile with rclone → Google Drive

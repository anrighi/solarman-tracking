# Database backup and Google Drive sync

## Persistence model

MySQL data is stored in the Docker named volume `mysql_data`. Data survives container restarts and image rebuilds.

**Destructive command:** `docker compose down -v` removes the volume and all data.

## Local backup

```bash
pnpm run db:dump
```

Creates in `backups/`:

- `solar_tracking_YYYYMMDD_HHmm.sql.gz` — full MySQL dump
- `app_config.json` — exported application config from DB

## Restore

```bash
pnpm run db:restore backups/solar_tracking_20260703_1200.sql.gz
```

## Google Drive via rclone

### 1. Install rclone

```bash
brew install rclone   # macOS
```

### 2. Configure Google Drive remote

```bash
rclone config
# Name: gdrive
# Storage: drive
# Follow OAuth flow
```

### 3. Manual upload

```bash
pnpm run db:dump
rclone copy backups/ gdrive:solar-tracking/backups/
```

### 4. Scheduled backup (Docker profile)

```bash
docker compose --profile backup up -d
```

The `backup` service runs on a schedule (default: daily at 03:00), dumps the DB, and syncs `backups/` to the configured rclone remote.

Environment variables (in `.env`):

| Variable | Default | Description |
|----------|---------|-------------|
| `RCLONE_REMOTE` | `gdrive:solar-tracking/backups` | rclone remote path |
| `BACKUP_CRON` | `0 3 * * *` | cron schedule inside container |

### 5. Restore from Google Drive

```bash
rclone copy gdrive:solar-tracking/backups/ ./backups-restore/
pnpm run db:restore ./backups-restore/solar_tracking_YYYYMMDD_HHmm.sql.gz
```

## What to back up

| Asset | Method |
|-------|--------|
| MySQL data | `db:dump` |
| App config | included in `app_config.json` export |
| Env secrets | **not** in backups — keep `.env` safe separately |

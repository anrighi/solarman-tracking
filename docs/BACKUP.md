# Database backup and Cubbit DS3 sync

## Backup policy

| Item | Value |
|------|-------|
| Schedule | Daily at **03:00 Europe/Rome** |
| Type | Full MySQL dump + `app_config.json` |
| Local retention | **7 days** (`backup_data` volume) |
| Remote retention | **30 days** on Cubbit (`solar-tracking-app/backups/`) |
| Missing-backup threshold | **26 hours** (configurable in Settings) |
| RPO | 24 hours |
| RTO | ~15–30 minutes |
| Not backed up | `.env` secrets |

Pruning runs after each scheduled backup. Failed zero-byte `.sql` files are removed. `app_config.json` is always overwritten with the latest export.

## Persistence model

MySQL data is stored in the Docker named volume `mysql_data`. Data survives container restarts and image rebuilds.

**Destructive command:** `docker compose down -v` removes the volume and all data.

## Settings UI

Open **Impostazioni → Backup → Gestisci backup** (`/settings/backup`):

- Health status (OK / missing / last run failed)
- Backup history from `backup_runs` table
- **Esegui backup ora** — manual backup
- **Ripristina** — destructive restore with confirmation (`RIPRISTINA`)

Tune missing-backup threshold and Telegram alerts under **Impostazioni → Backup**.

## Local backup (CLI)

```bash
pnpm run db:dump
pnpm run backup:run
```

Creates in `backups/`:

- `solar_tracking_YYYYMMDD_HHmm.sql.gz`
- `app_config.json`

## Restore (CLI)

```bash
pnpm run db:restore backups/solar_tracking_20260703_1200.sql.gz
```

Stop the sync worker before restoring:

```bash
docker compose stop worker
pnpm run db:restore backups/solar_tracking_20260703_1200.sql.gz
docker compose start worker
```

## Restore verification test

```bash
docker compose stop worker
pnpm run db:restore:test
docker compose start worker
```

Inserts a sentinel row, restores from a fresh dump, and verifies counts match.

## Cubbit DS3 via rclone

[Cubbit DS3](https://www.cubbit.io/ds3-cloud) is S3-compatible. See [Cubbit rclone docs](https://docs.cubbit.io/integrations/rclone).

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CUBBIT_ACCESS_KEY_ID` | — | API access key |
| `CUBBIT_SECRET_ACCESS_KEY` | — | API secret key |
| `CUBBIT_ENDPOINT` | `s3.cubbit.eu` | S3 endpoint |
| `CUBBIT_REGION` | `eu-west-1` | S3 region |
| `CUBBIT_BUCKET` | `solar-tracking-app` | Target bucket |
| `CUBBIT_BACKUP_PREFIX` | `backups` | Folder prefix |
| `BACKUP_SCHEDULE_TZ` | `Europe/Rome` | Schedule timezone |
| `BACKUP_SCHEDULE_HOUR` | `3` | Daily backup hour |
| `BACKUP_RETENTION_DAYS_LOCAL` | `7` | Local dump retention |
| `BACKUP_RETENTION_DAYS_REMOTE` | `30` | Cubbit dump retention |

App config (Settings):

| Key | Default | Description |
|-----|---------|-------------|
| `backup.maxAgeHours` | `26` | Missing-backup threshold |
| `backup.alertOnMissing` | `true` | Telegram alert when backup is overdue |

### Scheduled backup (Docker)

```bash
docker compose --profile backup up -d
```

### Restore from Cubbit (CLI)

```bash
rclone copy cubbit:solar-tracking-app/backups/ ./backups-restore/ \
  --include 'solar_tracking_*.sql.gz'
pnpm run db:restore ./backups-restore/solar_tracking_YYYYMMDD_HHmm.sql.gz
```

## What to back up

| Asset | Method |
|-------|--------|
| MySQL data | `db:dump` / backup service |
| App config | included in `app_config.json` export |
| Env secrets | **not** in backups — keep `.env` safe separately |

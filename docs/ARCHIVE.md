# Energy sample archive on Cubbit DS3

Structured day partitions complement [SQL dumps](BACKUP.md). Dumps cover full disaster recovery; the archive covers timeframe history and local DB hydrate without re-calling Solarman.

## Layout

```text
archive/station/{stationId}/yyyy/mm/dd.json.gz
archive/station/{stationId}/manifest.json
```

Each day file is gzipped JSON Lines of minute samples (same fields as `energy_samples_minute`, no DB ids).

## Settings UI

Open **Impostazioni → Archivio** (`/settings/archive`):

- Month calendar of local vs S3 day state
- **Carica su S3** / **Esporta mese** — MySQL → S3
- **Ripristina da S3** / **Ripristina mese** — S3 → MySQL upsert

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `CUBBIT_ACCESS_KEY_ID` | — | Shared with backup |
| `CUBBIT_SECRET_ACCESS_KEY` | — | Shared with backup |
| `CUBBIT_ENDPOINT` | `s3.cubbit.eu` | S3 endpoint |
| `CUBBIT_REGION` | `eu-west-1` | Region |
| `CUBBIT_BUCKET` | `solar-tracking-app` | Bucket |
| `CUBBIT_ARCHIVE_PREFIX` | `archive` | Prefix (separate from `backups`) |

App config (Settings):

| Key | Default | Description |
|-----|---------|-------------|
| `archive.enabled` | `false` | Enable archive actions |
| `archive.hotRetentionDays` | `90` | Suggested local hot window |

## Relation to F8 backup

| Asset | Path | Purpose |
|-------|------|---------|
| MySQL dump + config | `backups/` | Full restore |
| Day partitions | `archive/` | History sync / hydrate |

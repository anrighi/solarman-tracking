# First-time setup

## 1. Clone and install

```bash
git clone https://github.com/anrighi/solarman-tracking.git
cd solarman-tracking
pnpm install
```

## 2. Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with:

- MySQL credentials (defaults work with Docker Compose)
- Solarman API credentials (`SOLARMAN_APP_ID`, `SOLARMAN_APP_SECRET`, `SOLARMAN_EMAIL`, `SOLARMAN_PASSWORD`, `SOLARMAN_STATION_ID`)
- Telegram bot token and chat ID (optional, for battery alerts)

## 3. Start infrastructure

```bash
docker compose up -d
```

This starts `mysql`, `app`, and `worker`. Wait for MySQL health check to pass.

## 4. Initial data load

```bash
pnpm run sync:backfill:full
```

This runs checkpoint-driven backfill from today backward until consecutive empty days are found. Resumable if interrupted.

For a manual window:

```bash
pnpm run sync:backfill 30 0   # last 30 days
```

## 5. Configure the app

Open http://127.0.0.1:3000/settings and adjust:

- Sync interval (default 5 minutes, matching Solarman granularity)
- Battery SOC thresholds for Telegram alerts
- Dashboard default time range

Settings are stored in the `app_config` DB table.

## 6. Verify

```bash
pnpm run test
pnpm run build
```

Open http://127.0.0.1:3000 — dashboard should show production, consumption, grid flow, and battery data.

After first live sync, verify grid fields are populated:

```sql
SELECT production_w, consumption_w, grid_import_w, grid_export_w
FROM energy_samples_minute ORDER BY recorded_at DESC LIMIT 5;
```

If grid columns are null, check `energy_samples_raw` (source `realtime`) — the plant may not expose grid CT data.

## 7. Backup (recommended)

See [`docs/BACKUP.md`](BACKUP.md) for Cubbit DS3 setup via rclone.

```bash
pnpm run db:dump
```

## Local dev without Docker app container

```bash
docker compose up -d mysql
pnpm run dev
```

Use `MYSQL_HOST=127.0.0.1` in `.env.local`.

# Solar Tracking

Local platform for photovoltaic plant monitoring: Solarman data sync, energy dashboard, battery alerts via Telegram, and (planned) consumption classification with local AI.

**UI language:** Italian. **Documentation:** English.

Progress tracking: [`docs/FEATURES.md`](docs/FEATURES.md) | First-time setup: [`docs/INIT.md`](docs/INIT.md)

## Requirements

- Node.js 22+
- pnpm
- Docker + Docker Compose

## Quick start

```bash
cp .env.local.example .env.local
docker compose up -d
pnpm install
pnpm run sync:backfill:full   # initial historical backfill
pnpm run dev                  # http://127.0.0.1:3000
```

See [`docs/INIT.md`](docs/INIT.md) for the full setup guide.

## Environment files

| File | Purpose |
|------|---------|
| `.env.example` | General template (reference) |
| `.env.local.example` | Local dev → copy to `.env.local` |
| `.env.docker` | Used by Docker Compose (committed) |
| `.env` / `.env.local` | Real credentials — **never commit** |

Secrets (Solarman, Telegram, MySQL) stay in env files. Tunables (sync interval, battery thresholds, etc.) are managed in the in-app **Settings** panel and stored in the `app_config` DB table.

## Commands

```bash
pnpm run dev                  # dev server
pnpm run build                # production build
pnpm run test                 # tests (mocked externals)

pnpm run sync:once            # single sync (today + realtime)
pnpm run sync:backfill        # manual window backfill [days] [offset]
pnpm run sync:backfill:full   # checkpoint-driven full backfill
pnpm run sync:worker          # continuous sync loop (interval from app_config)

pnpm run db:dump              # MySQL dump + app_config JSON export
pnpm run db:restore           # restore from backup
```

## Docker services

```bash
docker compose up -d                    # app, worker, mysql
docker compose --profile full up -d     # + llm, telegram-bot
docker compose --profile backup up -d   # + scheduled backup to Cubbit DS3
```

MySQL data persists in the `mysql_data` named volume. **Warning:** `docker compose down -v` deletes all data.

## Architecture

- **Frontend/API:** TanStack Start + React (TypeScript)
- **DB:** MySQL 8 (minute samples, checkpoints, app config)
- **Sync:** background worker polling Solarman (5-min granularity)
- **Config:** `app_config` table + Settings UI (exported in backups)
- **Backup:** local dumps + optional rclone → Cubbit DS3
- **Access:** localhost only (`127.0.0.1`)

## For agents

1. Read `docs/FEATURES.md` → **Active phase** section
2. Follow `AGENTS.md` and `.cursor/rules/`
3. Update feature file + handoff log when completing work
4. See `.cursor/rules/commit-convention.mdc` for commit rules

## License

[MIT](LICENSE)

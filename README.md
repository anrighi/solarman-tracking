# Solar Tracking

Self-hosted monitoring for [Solarman](https://www.solarmanpv.com/) photovoltaic plants. Sync 5-minute energy samples to MySQL, explore production, consumption, and battery history in a local dashboard, and receive Telegram battery alerts — without relying on a third-party SaaS.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](docker-compose.yml)
[![Node](https://img.shields.io/badge/Node-22+-339933?logo=node.js&logoColor=white)](package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](tsconfig.json)

| | |
|---|---|
| **UI** | Italian |
| **Docs** | English |
| **Access** | Localhost only (`127.0.0.1`) |
| **License** | [MIT](LICENSE) |

**Roadmap:** [GitHub Issues](https://github.com/anrighi/solarman-tracking/issues?q=is%3Aissue+label%3Afeature) · [docs/FEATURES.md](docs/FEATURES.md) · **Setup:** [docs/INIT.md](docs/INIT.md) · **Backup:** [docs/BACKUP.md](docs/BACKUP.md)

## Who is this for?

- Home or small commercial PV owners using **Solarman** (API credentials + station ID)
- Self-hosters who want **local data ownership** (MySQL on your machine or NAS)
- Users who prefer a **dedicated energy dashboard** over generic home automation
- Italian-speaking households (UI and Telegram messages are in Italian)

## Features

| Feature | Status |
|---------|--------|
| Solarman sync (5-min samples, realtime + history) | Done |
| Checkpoint-driven full backfill | Done |
| Energy dashboard (day / week / month, KPIs + charts) | Done |
| Battery history and SOC tracking | Done |
| Telegram battery threshold alerts | Done |
| Settings panel (`app_config` in DB) | Done |
| MySQL backup + optional Cubbit DS3 upload | Done |
| Telegram daily energy recap | Planned |
| Consumption classification (local LLM) | Planned |
| Weather history and forecast | Planned |
| Custom reports | Planned |
| Public GitHub Pages demo (mock data) | Planned ([F14](docs/features/F14-github-pages-demo.md)) |

## Why self-host?

| | Official Solarman app | Solar Tracking |
|---|---|---|
| Data location | Vendor cloud | Your MySQL |
| Custom alerts | Limited | Configurable thresholds + Telegram |
| Historical export | App-dependent | SQL dumps + `app_config` JSON |
| Network exposure | Internet | `127.0.0.1` only |
| UI language | Varies | Italian |

## Requirements

- Node.js 22+, pnpm
- Docker + Docker Compose
- Solarman API credentials (`SOLARMAN_APP_ID`, `SOLARMAN_APP_SECRET`, `SOLARMAN_EMAIL`, `SOLARMAN_PASSWORD`, `SOLARMAN_STATION_ID`)
- Telegram bot token + chat ID (optional, for alerts)

## Quick start

```bash
git clone https://github.com/anrighi/solarman-tracking.git
cd solarman-tracking
cp .env.local.example .env.local   # add Solarman credentials
docker compose up -d
pnpm install
pnpm run sync:backfill:full        # initial historical backfill
pnpm run dev                       # http://127.0.0.1:3000
```

See [docs/INIT.md](docs/INIT.md) for the full setup guide.

## Screenshots

> Add dashboard screenshots to `docs/images/` and reference them here to improve discoverability.
>
> Suggested files: `dashboard.png`, `battery.png`, `settings.png`

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

pnpm run compare:totals       # validate minute rollups vs Solarman daily API
pnpm run db:dedupe-samples    # normalize 5-min buckets and remove duplicates

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

## Contributing

Issues and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## For agents

1. Pick an open [feature issue](https://github.com/anrighi/solarman-tracking/issues?q=is%3Aopen+is%3Aissue+label%3Afeature) — see `.cursor/rules/github-workflow.mdc`
2. Branch `phase-<n>/<id>-<slug>` from `main`; PR with `Closes #N`
3. Read `docs/FEATURES.md` for phase context and ADR
4. Follow `AGENTS.md` and `.cursor/rules/`
5. Update feature file, `scripts/github-tasks.manifest.json`, and handoff log when completing work
6. See `.cursor/rules/commit-convention.mdc` for commit rules

## License

[MIT](LICENSE)

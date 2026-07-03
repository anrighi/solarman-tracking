# Solar Tracking — Feature registry

> Last updated: 2026-07-03 | Active phase: 2 | Agent: Cursor

## Global status

| Phase | Name | Status | Completion |
|-------|------|--------|------------|
| 0 | Bootstrap | done | 100% |
| 1 | Solarman ingestion | done | 100% |
| 2 | Dashboard | in_progress | 80% |
| 3 | Telegram + AI | in_progress | 15% |
| 4 | Weather + Forecast | pending | 0% |
| 5 | Custom reports | pending | 0% |
| 0+ | CI & static analysis | pending | 0% |

## Active phase — what to do now

- **Current goal:** F1 aggregates + live Solarman validation
- **Prerequisites verified:** MySQL schema, Solarman client, sync jobs, Recharts dashboard, station grid fields
- **Remaining tasks:**
  - [x] F11 Config panel (`app_config` + Settings UI)
  - [x] F7 Checkpoint backfill (`sync:backfill:full`)
  - [x] F9 Historical battery tracking
  - [x] F10 Telegram battery alerts
  - [x] F8 DB backup + Google Drive
  - [x] F2 station grid/battery-split minute mapping + English DB columns
  - [ ] F1 Day/week/month/year aggregates
  - [ ] Configure real Solarman credentials in `.env`
  - [ ] Validate live sync with real plant
- **Open blockers:** None

## Feature index

| ID | Feature | Phase | Status | Detail |
|----|---------|-------|--------|--------|
| F0 | Bootstrap, Docker, env | 0 | done | [F0-bootstrap.md](features/F0-bootstrap.md) |
| F1 | Day/week/month/year totals | 2 | not_started | [F1-aggregates.md](features/F1-aggregates.md) |
| F2 | Minute series | 1+2 | done | [F2-minute-series.md](features/F2-minute-series.md) |
| F3 | Consumption classification (Telegram + AI) | 3 | not_started | [F3-classification.md](features/F3-classification.md) |
| F4 | Historical energy vs weather | 4 | not_started | [F4-weather-history.md](features/F4-weather-history.md) |
| F5 | Weather-based forecast | 4 | not_started | [F5-forecast.md](features/F5-forecast.md) |
| F6 | Telegram daily recap | 3 | not_started | [F6-telegram-recap.md](features/F6-telegram-recap.md) |
| F7 | Checkpoint backfill | 1 | done | [F7-backfill-checkpoints.md](features/F7-backfill-checkpoints.md) |
| F8 | DB backup + Google Drive | 0+1 | done | [F8-backup.md](features/F8-backup.md) |
| F9 | Battery dashboard (historical) | 2 | done | [F9-battery-dashboard.md](features/F9-battery-dashboard.md) |
| F10 | Telegram battery alerts | 3 | done | [F10-battery-alerts.md](features/F10-battery-alerts.md) |
| F11 | Config control panel | 0+2 | done | [F11-config-panel.md](features/F11-config-panel.md) |
| F12 | Customizable reports | 5 | not_started | [F12-reports.md](features/F12-reports.md) |
| F13 | Static analysis + GitHub CI | 0+ | not_started | [F13-ci-quality.md](features/F13-ci-quality.md) |

## Architecture decisions (light ADR)

| Date | Decision | Rationale | Rejected alternative |
|------|----------|-----------|---------------------|
| 2026-06-01 | TanStack Start (RC) | Modern full-stack reactive platform | Next.js (complexity) |
| 2026-06-01 | pnpm | Speed, monorepo support | npm / yarn |
| 2026-07-02 | mysql2 raw SQL | Simplicity for phase 1 | Drizzle (deferred) |
| 2026-07-02 | Recharts | Quick time-series charts in React | Chart.js |
| 2026-07-03 | Shared schema.sql | Single DDL for Docker init and runtime migrate | Inline duplicated DDL |
| 2026-07-03 | app_config in DB | Source of truth for tunables; JSON export for backup | File-only config |
| 2026-07-03 | Worker 5-min interval | Matches Solarman 5-min data granularity | 1-min polling |
| 2026-07-03 | MIT license | Permissive, simple | — |
| 2026-07-03 | Italian UI / English docs | User preference | — |
| 2026-07-03 | English DB/code identifiers, Italian UI only | Consistent dev naming; UI labels stay Italian | Italian column names in schema |
| 2026-07-03 | Report defs in DB, not app_config | User-created templates vs global tunables | File-based report YAML |
| 2026-07-03 | ESLint + Prettier + GHA ci.yml | Standard TS/React tooling; no secrets in CI | Biome-only; Docker-based CI |

## Handoff log (last 5 entries)

| Date | Agent | Phase | Done | Next step | Blocker |
|------|-------|-------|------|-----------|---------|
| 2026-07-03 | Cursor | docs | F13 CI spec: ESLint, Prettier, typecheck, Vitest, build in GitHub Actions | F1 aggregates + live Solarman validation | None |
| 2026-07-03 | Cursor | 1+2 | F2 extended: station grid import/export, battery charge/discharge, English DB columns, dashboard KPIs | F1 aggregates + live Solarman validation | None |
| 2026-07-03 | Cursor | docs | F12 customizable reports spec (builder UI, time frame, metric blocks) | F1 aggregates + live Solarman validation | None |
| 2026-07-03 | Cursor | 1–3 | F7–F11: config panel, checkpoint backfill, battery dashboard, Telegram alerts, backup | F1 aggregates + live Solarman validation | None |
| 2026-07-03 | Cursor | 1+2 | Phase 1–2 cleanup, logical commits, schema/mapping dedupe | Aggregates (F1) | None |

## Useful commands

```bash
docker compose up -d
pnpm run test
pnpm run ci              # (F13) typecheck + lint + format + test + build
pnpm run sync:once
pnpm run sync:backfill          # last 7 days (default)
pnpm run sync:backfill:full     # checkpoint-driven full backfill
pnpm run sync:worker
pnpm run db:dump
pnpm run dev
```

## Localization

- **App UI + Telegram messages:** Italian
- **README, docs, TODO, rules, commit messages:** English

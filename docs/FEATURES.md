# Solar Tracking — Feature registry

> Last updated: 2026-07-06 | Active phase: 3 | Agent: Cursor

## Global status

| Phase | Name | Status | Completion |
|-------|------|--------|------------|
| 0 | Bootstrap | done | 100% |
| 1 | Solarman ingestion | done | 100% |
| 2 | Dashboard | done | 100% |
| 3 | Telegram + AI | in_progress | 15% |
| 4 | Weather + Forecast | pending | 0% |
| 5 | Custom reports | pending | 0% |
| 0+ | CI & static analysis | pending | 0% |

## Active phase — what to do now

- **Current goal:** Phase 3 — F3 consumption classification + F6 Telegram daily recap
- **Prerequisites verified:** Dashboard KPIs, live Solarman sync, minute backfill, config panel
- **Remaining tasks (phase 3):**
  - [ ] F3 Consumption classification (Telegram + local LLM)
  - [ ] F6 Telegram daily energy recap
- **Deferred from phase 2:**
  - F1 year preset, `energy_totals` table, billing-grade grid import (revisit when billing data available)
- **Open blockers:** None

## Feature index

| ID | Feature | Phase | Status | Detail |
|----|---------|-------|--------|--------|
| F0 | Bootstrap, Docker, env | 0 | done | [F0-bootstrap.md](features/F0-bootstrap.md) |
| F1 | Day/week/month totals (minute rollups) | 2 | done | [F1-aggregates.md](features/F1-aggregates.md) |
| F2 | Minute series | 1+2 | done | [F2-minute-series.md](features/F2-minute-series.md) |
| F3 | Consumption classification (Telegram + AI) | 3 | not_started | [F3-classification.md](features/F3-classification.md) |
| F4 | Historical energy vs weather | 4 | not_started | [F4-weather-history.md](features/F4-weather-history.md) |
| F5 | Weather-based forecast | 4 | not_started | [F5-forecast.md](features/F5-forecast.md) |
| F6 | Telegram daily recap | 3 | not_started | [F6-telegram-recap.md](features/F6-telegram-recap.md) |
| F7 | Checkpoint backfill | 1 | done | [F7-backfill-checkpoints.md](features/F7-backfill-checkpoints.md) |
| F8 | DB backup + Cubbit DS3 | 0+1 | done | [F8-backup.md](features/F8-backup.md) |
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
| 2026-07-06 | F1 minute rollups for dashboard KPIs | `compare:totals` validated ~5% on production/export; sufficient for monitoring | Daily API + `energy_totals` table |
| 2026-07-06 | 5-min sample bucket normalization | Prevents realtime + history duplicate rows in same interval | Millisecond-precision unique key only |
| 2026-07-06 | Grid import billing accuracy deferred | Low value until billing statements; minute `buyValue` mismatch at small values | Block phase 2 on daily API |

## Handoff log (last 5 entries)

| Date | Agent | Phase | Done | Next step | Blocker |
|------|-------|-------|------|-----------|---------|
| 2026-07-06 | Cursor | 2→3 | Phase 2 closed: F1 minute rollups, live sync validated, dedupe rule | F3 classification or F6 Telegram recap | None |
| 2026-07-06 | Cursor | 1+2 | 5-min bucket normalization; `db:dedupe-samples` (134 rows) | Phase 2 sign-off | None |
| 2026-07-06 | Cursor | 2 | `compare:totals` CLI vs Solarman daily API | F1 source decision | None |
| 2026-07-03 | Cursor | 2 | Dashboard period nav: day/week/month presets | Phase 2 wrap-up | None |
| 2026-07-03 | Cursor | 0+1 | F8 backup policy, `/settings/backup` | Phase 2 wrap-up | None |

## Useful commands

```bash
docker compose up -d
pnpm run test
pnpm run ci              # (F13) typecheck + lint + format + test + build
pnpm run sync:once
pnpm run sync:backfill          # last 7 days (default)
pnpm run sync:backfill:full     # checkpoint-driven full backfill
pnpm run sync:worker
pnpm run compare:totals
pnpm run db:dedupe-samples
pnpm run db:dump
pnpm run db:restore:test
pnpm run dev
```

## Localization

- **App UI + Telegram messages:** Italian
- **README, docs, TODO, rules, commit messages:** English

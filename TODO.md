# TODO — Solar Tracking

Actionable backlog linked to feature IDs. See [`docs/FEATURES.md`](docs/FEATURES.md) for status.

## In progress (phase 3)

- [ ] F3 — Consumption classification via Telegram + local AI
- [ ] F6 — Daily/on-demand Telegram energy recap

## Deferred

- [ ] F1 — Year period preset + `energy_totals` / daily API (when billing data available; grid import accuracy)
- [ ] F13 — Static analysis + GitHub CI

## Upcoming (phase 4)

- [ ] F4 — Historical energy vs weather comparison
- [ ] F5 — Weather-based production forecast

## Completed

- [x] Phase 2 — Dashboard (F1 minute rollups, F9 battery, F11 config, live Solarman validation)
- [x] F7 — Checkpoint-driven recursive backfill
- [x] F8 — DB backup + Cubbit DS3
- [x] F10 — Telegram battery status alerts
- [x] 5-min sample bucket normalization + `db:dedupe-samples`
- [x] `compare:totals` validation CLI

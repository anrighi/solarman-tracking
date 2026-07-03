# F2 — Minute series (production/consumption/battery/grid)

| Field | Value |
|-------|-------|
| Status | done |
| Phase | 1 + 2 |
| Files | `src/lib/solarman/client.ts`, `src/lib/solarman/normalize.ts`, `src/server/jobs/sync-solarman.ts`, `src/features/energy/components/energy-chart.tsx`, `scripts/sync-worker.ts` |
| Tests | `src/lib/solarman/client.test.ts`, `src/lib/solarman/normalize.test.ts` |

## Acceptance criteria

- Raw and normalized data in DB
- Cron worker active with config-driven interval (default 5 min)
- Demo mode when Solarman credentials absent
- Station grid import/export and battery charge/discharge mapped from Solarman station API
- English DB column names; Italian labels only in UI

## DB columns (`energy_samples_minute`)

| Column | Solarman source | Notes |
|--------|-----------------|-------|
| `production_w` | `generationPower` | PV production |
| `consumption_w` | `usePower` | Total load |
| `battery_soc` | `batterySoc` | State of charge |
| `battery_power_w` | `batteryPower` | Net battery power |
| `grid_import_w` | `purchasePower`, fallback `wirePower` | Grid draw (always >= 0) |
| `grid_export_w` | `gridPower`, fallback `wirePower` | Grid export (always >= 0) |
| `battery_charge_w` | `chargePower` | Charging power |
| `battery_discharge_w` | `dischargePower` | Discharging power |
| `irradiance` | `irradiateIntensity` | Station irradiance |

## Sign normalization

Handled in `normalizeStationPowerFields()`:

1. `purchasePower` → `grid_import_w` (absolute value)
2. `gridPower` → `grid_export_w` (absolute value)
3. If import still null, negative `wirePower` → import
4. If export still null, positive `wirePower` → export
5. `chargePower` / `dischargePower` stored as positive watts

Grid fields may be null if the plant has no grid CT configured — check `energy_samples_raw` after first live sync.

## Migration

Existing databases: `docker/mysql/migrations/001_station_grid_fields.sql` renames `produzione_w`/`consumo_w` and adds new columns. Applied automatically by `ensureSchema()`.

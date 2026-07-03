# F12 — Customizable reports

| Field | Value |
|-------|-------|
| Status | not_started |
| Phase | 5 (post-dashboard) |
| Files | `src/features/reports/`, `src/routes/reports.tsx`, `src/server/db/report-repository.ts` |
| Tests | `src/features/reports/**/*.test.ts` |

## Goal

Let the user build, save, and re-run energy reports from a dedicated UI. Each report is a named template: chosen metrics, time window, grouping, and optional comparison — without code changes.

## Prerequisites

| Dependency | Why |
|------------|-----|
| F1 aggregates | Day/week/month/year totals for summary tables |
| F2 minute series | High-resolution charts and custom date ranges |
| F9 battery dashboard | Battery metrics and KPI patterns to reuse |
| F11 config panel | Global defaults (timezone, default range) |
| F3 classification (optional) | Consumption breakdown by appliance label |
| F4 weather history (optional) | Overlay irradiance / temperature on production |

## User flows

### Create / edit report

1. Open `/reports` → **Nuovo report**
2. Set **name** and optional description
3. **Time frame**
   - Presets: last 24h, 7d, 30d, month-to-date, year-to-date, custom calendar range
   - Comparison: none, previous period, same period last year (when data exists)
   - Granularity: auto from range (minute → hour → day → week → month)
4. **Data series** — add one or more blocks:
   - Metric picker (see catalog below)
   - Chart type: line, area, bar, table-only
   - Optional Y-axis group (power kW vs energy kWh vs % SOC)
5. **Layout** — reorder blocks, toggle visibility
6. Save → persisted definition; **Run** fetches data and renders

### Run saved report

- One-click run with stored definition
- “Run with overrides” — temporary date range without saving
- Export: CSV per table block; PDF deferred

### Manage reports

- List saved reports with last-run timestamp
- Duplicate, rename, delete
- Pin favorites (shown on dashboard link or home — optional)

## Metric catalog (v1)

| Key | Label (IT) | Source | Unit |
|-----|------------|--------|------|
| `production` | Produzione | `energy_samples_minute.production_w` | W / kWh |
| `consumption` | Consumo | `energy_samples_minute.consumption_w` | W / kWh |
| `battery_soc` | Stato di carica batteria | `energy_samples_minute.battery_soc` | % |
| `battery_power` | Potenza batteria | `energy_samples_minute.battery_power_w` | W |
| `grid_import` | Prelievo rete | `energy_samples_minute.grid_import_w` | W / kWh |
| `grid_export` | Immissione rete | `energy_samples_minute.grid_export_w` | W / kWh |
| `net_import` | Prelievo rete (derivato) | `consumption - production` when positive | W / kWh |
| `self_consumption` | Autoconsumo (derivato) | `min(production, consumption)` | kWh |
| `production_total` | Energia prodotta (aggregato) | F1 `energy_totals` | kWh |
| `consumption_total` | Energia consumata (aggregato) | F1 `energy_totals` | kWh |

Future blocks (phase-gated): weather columns (F4), forecast line (F5), classification pie (F3).

## Data model

```sql
CREATE TABLE report_definitions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  description VARCHAR(512) NULL,
  definition JSON NOT NULL,
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE report_runs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  report_id BIGINT NOT NULL,
  ran_at DATETIME(3) NOT NULL,
  time_frame JSON NOT NULL,
  result_snapshot JSON NULL,
  FOREIGN KEY (report_id) REFERENCES report_definitions(id) ON DELETE CASCADE,
  KEY idx_report_runs_report_ran (report_id, ran_at)
);
```

### `definition` JSON schema (Zod)

```ts
{
  timeFrame: {
    preset: 'last_24h' | 'last_7d' | 'last_30d' | 'mtd' | 'ytd' | 'custom'
    customStart?: string // ISO date
    customEnd?: string
    compareTo?: 'none' | 'previous_period' | 'same_period_last_year'
    granularity?: 'auto' | 'minute' | 'hour' | 'day' | 'week' | 'month'
  }
  blocks: Array<{
    id: string
    metric: ReportMetricKey
    chartType: 'line' | 'area' | 'bar' | 'table'
    label?: string
    visible: boolean
  }>
}
```

Validate with `reportDefinitionSchema` in `src/features/reports/schema.ts` (not `app_config` — reports are user content, not tunables).

## Config keys (`app_config`)

| Key | Default | Purpose |
|-----|---------|---------|
| `reports.defaultGranularity` | `auto` | Default when creating new report |
| `reports.maxBlocks` | `8` | Limit blocks per report |
| `reports.maxCustomRangeDays` | `365` | Cap custom date span |
| `reports.cacheRunMinutes` | `5` | Optional server cache for identical run params |

Expose in Settings under **Report** section (Italian labels).

## Architecture

```
src/features/reports/
  schema.ts              # Zod: definition, metric keys, time presets
  types.ts
  components/
    reports-list.tsx
    report-builder.tsx   # metric picker + time frame + block list
    report-viewer.tsx    # charts + tables (reuse Recharts from energy)
  server/
    get-reports.ts
    save-report.ts
    run-report.ts        # resolves time frame → SQL → normalized series
    export-report-csv.ts
  lib/
    resolve-time-frame.ts
    aggregate-series.ts  # shares logic with F1 where possible
```

- **Route:** `/reports` (list), `/reports/new`, `/reports/$reportId`, `/reports/$reportId/edit`
- **Nav:** link from main header next to Dashboard and Settings
- **Reuse:** `EnergyChart` patterns, `battery-stats` helpers, future F1 aggregate queries

## Acceptance criteria

- [ ] CRUD for saved report definitions (MySQL `report_definitions`)
- [ ] Builder UI: add/remove/reorder metric blocks; preset + custom time frame
- [ ] Run report renders all visible blocks with correct units and Italian labels
- [ ] Comparison period shown as dashed overlay or delta column when enabled
- [ ] CSV export for table blocks
- [ ] `reportDefinitionSchema` validation on save and run
- [ ] Config keys in Settings; limits enforced server-side
- [ ] Tests: time-frame resolution, granularity selection, metric derivation (net_import, self_consumption)

## Non-goals (v1)

- PDF / scheduled email reports
- Multi-station (single `station_id` from env until multi-plant support)
- Public share links
- Drag-and-drop dashboard widgets (reports stay on `/reports`)

## Notes

- Deferred until F1 aggregates and core dashboard work are stable.
- Report definitions are **user data** (DB table), not env secrets.
- Keep aggregation SQL in one place with F1 to avoid drift between dashboard totals and report tables.

# F9 — Historical battery tracking in dashboard

| Field | Value |
|-------|-------|
| Status | done |
| Phase | 2 |
| Files | `src/features/energy/components/energy-chart.tsx`, `src/features/energy/components/energy-dashboard.tsx`, `src/features/energy/server/get-energy-dashboard.ts` |
| Tests | `src/features/energy/battery-stats.test.ts` |

## Acceptance criteria

- `battery_power_w` series on chart (charge/discharge W)
- Period selector: 24h / 7d / 30d (default from config)
- Battery KPIs: SOC min/max/avg, energy charged/discharged
- Grid import/export KPIs and chart lines when data available

## Config keys

- `dashboard.defaultRangeHours` (default 24)

## Notes

Battery energy integration prefers `battery_charge_w` / `battery_discharge_w` when present; falls back to signed `battery_power_w`.

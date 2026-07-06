# F1 — Day/week/month/year totals

| Field | Value |
|-------|-------|
| Status | done |
| Phase | 2 |
| Files | `src/features/energy/battery-stats.ts`, `src/features/energy/server/get-energy-dashboard.ts`, `src/features/energy/components/energy-dashboard.tsx`, `src/features/energy/server/compare-energy-totals.ts` |
| Tests | `src/features/energy/battery-stats.test.ts`, `src/features/energy/compare-energy-totals.test.ts` |

## Acceptance criteria

- [x] Aggregated totals visible in dashboard UI (day / week / month via period selector)
- [x] Computed aggregates from minute samples (`computeEnergyTotals`)

## Implementation

Energy KPIs (produzione, consumo, prelievo rete, immissione rete, autoconsumo) are integrated from `energy_samples_minute` over the selected period. No `energy_totals` table — minute rollups are sufficient for dashboard use.

5-minute bucket normalization (`normalizeToSampleBucket`) prevents duplicate realtime + history rows from inflating totals. See F2.

## Validation (2026-07-06)

`pnpm run compare:totals` run against live plant (7 days). Minute integration vs Solarman daily API (`timeType: 2`):

| Metric | Week delta | Verdict |
|--------|------------|---------|
| Production | ~+5% | Acceptable for dashboard |
| Consumption | ~+7% | Acceptable for dashboard |
| Grid export | ~+5% | Acceptable for dashboard |
| Grid import | noisy at low values | **Deferred** — revisit when billing data arrives |

## Deferred (post–phase 2)

| Item | Reason |
|------|--------|
| Year period preset | Low priority; add when long-range view needed |
| `energy_totals` table + `getHistoryDay` sync | Only needed for billing-grade grid import and Solarman app parity |
| Grid import KPI accuracy | User deferred until billing statements available (~few months) |

Daily API path remains available via `getHistoryDay()` and `compare:totals` when billing work starts.

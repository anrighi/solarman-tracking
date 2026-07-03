# F1 — Day/week/month/year totals

| Field | Value |
|-------|-------|
| Status | not_started |
| Phase | 2 |
| Files | `src/features/energy/server/`, `src/features/energy/components/` |
| Tests | `src/features/energy/...test.ts` |

## Acceptance criteria

- Aggregated totals visible in dashboard UI
- `energy_totals` table or computed aggregates from minute samples

## Notes

Minute data and backfill infrastructure are prerequisites (done).

Day-level energy totals (`buyValue`, `gridValue`, `generationValue`, `useValue`) are available from Solarman `getHistoryDay()` (`/station/v1.0/history`, `timeType: 2`) — planned as the primary F1 data source rather than integrating minute-level power fields.

# F17 — Backfill coverage on Sync settings

| Field | Value |
|-------|-------|
| Status | done |
| Phase | 0+ |
| Files | `src/features/backfill/`, `src/features/settings/components/sync-settings-page.tsx`, `src/routes/settings.sync.tsx` |
| Tests | `src/features/backfill/day-status.test.ts` |

## Acceptance criteria

- Sync settings shows backfill checkpoint (`first_data_at`, `last_synced_at`, `no_data_before`)
- Month calendar classifies each day as **completo** / **parziale** / **assente** via sample-density (`assessDayCoverage`, 80% of expected 5-min samples)
- User can select days and re-import them from Solarman
- User can recover all incomplete days in the visible month
- User can run checkpoint full backfill from the UI
- Coverage uses local `energy_samples_minute` counts (not `backfill_gap`)

## Config keys

- Existing: `backfill.maxConsecutiveEmptyDays` (default 7)

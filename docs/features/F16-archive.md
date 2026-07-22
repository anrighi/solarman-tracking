# F16 — S3 timeframe archive + calendar hydrate

| Field | Value |
|-------|-------|
| Status | done |
| Phase | 0+ |
| Files | `src/features/archive/`, `docker/mysql/migrations/003_archive_runs.sql`, `docs/ARCHIVE.md`, Settings `/settings/archive` |
| Tests | `src/features/archive/*.test.ts`, `pnpm run test` |

## Acceptance criteria

- Daily station partitions on Cubbit: `archive/station/{id}/yyyy/mm/dd.json.gz` (gzipped JSONL)
- Station `manifest.json` with day → rowCount, contentHash, exportedAt
- F8 mysqldump backups remain unchanged under `backups/`
- Settings page `/settings/archive` shows a month calendar of local vs S3 day status
- Actions: export selected/month days MySQL → S3; hydrate selected/month days S3 → MySQL via `upsertEnergySamples` (no Solarman API)
- `archive_runs` tracks export/hydrate runs
- Config keys: `archive.enabled`, `archive.hotRetentionDays` via Settings (Italian UI)

## Config keys

| Key | Default | Description |
|-----|---------|-------------|
| `archive.enabled` | `false` | Enable archive export/hydrate UI actions |
| `archive.hotRetentionDays` | `90` | Suggested local hot window (prune not in this feature) |

## Notes

- Hydrate is preferred recovery when day partitions exist on Cubbit; Solarman backfill remains for never-archived days
- Automatic MySQL prune is explicitly out of scope for F16

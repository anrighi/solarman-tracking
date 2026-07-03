# F7 — Checkpoint-driven recursive backfill

| Field | Value |
|-------|-------|
| Status | done |
| Phase | 1 |
| Files | `src/server/jobs/backfill.ts`, `src/server/db/backfill-repository.ts`, `scripts/backfill-full.ts`, `docker/mysql/schema.sql` |
| Tests | `src/server/jobs/backfill.test.ts` |

## Acceptance criteria

- `backfill_checkpoint` table tracks `first_data_at`, `last_synced_at`, `no_data_before`
- `backfill_gap` table records detected missing ranges
- `pnpm run sync:backfill:full` resumes from checkpoint
- Skips already-covered days; stops after `maxConsecutiveEmptyDays` empty days
- Iterative loop (no recursion)

## Config keys

- `backfill.maxConsecutiveEmptyDays` (default 7)

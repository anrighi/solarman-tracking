# F11 — Config-driven control panel

| Field | Value |
|-------|-------|
| Status | done |
| Phase | 0 + 2 |
| Files | `src/lib/config/`, `src/server/db/config-repository.ts`, `src/routes/settings.tsx`, `src/features/settings/` |
| Tests | `src/lib/config/schema.test.ts` |

## Acceptance criteria

- `app_config` table stores validated JSON config
- Settings UI at `/settings` (Italian)
- All tunables read from `getConfig()` — no hardcoded thresholds/intervals
- `exportConfigJson()` included in backups
- Secrets remain in env files only

## Config schema

```typescript
{
  sync: { intervalMs: 300000, includeRealtime: true },
  backfill: { maxConsecutiveEmptyDays: 7 },
  battery: { socLow: 20, socHigh: 95, alertCooldownHours: 4 },
  telegram: { enabled: false },
  dashboard: { defaultRangeHours: 24 }
}
```

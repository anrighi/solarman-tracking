# F10 — Telegram battery status alerts

| Field | Value |
|-------|-------|
| Status | done |
| Phase | 3 (anticipated) |
| Files | `src/lib/telegram/notifier.ts`, `src/features/alerts/battery-rules.ts`, `src/routes/api/webhooks/battery.ts` |
| Tests | `src/features/alerts/battery-rules.test.ts`, `src/lib/telegram/notifier.test.ts` |

## Acceptance criteria

- Alerts on SOC below/above configurable thresholds
- Cooldown prevents duplicate alerts
- Messages in Italian
- Worker evaluates rules after each sync
- Internal webhook endpoint for manual trigger

## Config keys

- `battery.socLow` (default 20)
- `battery.socHigh` (default 95)
- `battery.alertCooldownHours` (default 4)
- `telegram.enabled` (default false)

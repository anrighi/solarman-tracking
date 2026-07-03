#!/usr/bin/env tsx
// Usage: pnpm sync:backfill [days] [startOffset] [--realtime]
// Examples:
//   pnpm sync:backfill          → last 7 days from today
//   pnpm sync:backfill 1 1      → yesterday only

import { closePool } from '@/server/db/connection'
import { syncSolarmanMinute } from '@/server/jobs/sync-solarman'

const backfillDays = Number(process.argv[2] ?? 7)
const startOffset = Number(process.argv[3] ?? 0)
const includeRealtime = process.argv.includes('--realtime')

async function main() {
  const result = await syncSolarmanMinute({
    backfillDays,
    startOffset,
    includeRealtime,
  })
  console.log(`[sync:backfill] ${result.message} (${result.inserted} righe, mode=${result.mode})`)
  await closePool()
}

main().catch(async (error) => {
  console.error('[sync:backfill] errore:', error)
  await closePool()
  process.exit(1)
})

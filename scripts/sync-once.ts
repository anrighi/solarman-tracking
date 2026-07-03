#!/usr/bin/env tsx

import { closePool } from '@/server/db/connection'
import { syncSolarmanMinute } from '@/server/jobs/sync-solarman'

async function main() {
  const result = await syncSolarmanMinute({ backfillDays: 2 })
  console.log(`[sync:once] ${result.message} (${result.inserted} righe, mode=${result.mode})`)
  await closePool()
}

main().catch(async (error) => {
  console.error('[sync:once] errore:', error)
  await closePool()
  process.exit(1)
})

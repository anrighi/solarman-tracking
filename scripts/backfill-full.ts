#!/usr/bin/env tsx

import { closePool } from '@/server/db/connection'
import { runCheckpointBackfill } from '@/server/jobs/backfill'

async function main() {
  const maxDays = Number(process.argv[2] ?? 365)
  const result = await runCheckpointBackfill({ maxDays })
  console.log(
    `[sync:backfill:full] ${result.message} (${result.inserted} righe, ${result.daysProcessed} giorni, reason=${result.stoppedReason})`,
  )
  await closePool()
}

main().catch(async (error) => {
  console.error('[sync:backfill:full] errore:', error)
  await closePool()
  process.exit(1)
})

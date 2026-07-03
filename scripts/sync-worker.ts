#!/usr/bin/env tsx

import { syncSolarmanMinute } from '@/server/jobs/sync-solarman'

const INTERVAL_MS = Number(process.env.SYNC_INTERVAL_MS ?? 60_000)

async function runLoop() {
  console.log(`[sync:worker] avvio loop ogni ${INTERVAL_MS}ms`)

  while (true) {
    try {
      const result = await syncSolarmanMinute({ backfillDays: 1 })
      console.log(
        `[sync:worker] ${new Date().toISOString()} ${result.message} (${result.inserted})`,
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`[sync:worker] errore: ${message}`)
    }

    await sleep(INTERVAL_MS)
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

runLoop().catch((error) => {
  console.error('[sync:worker] crash:', error)
  process.exit(1)
})

#!/usr/bin/env tsx

import { getConfig } from '@/lib/config/service'
import { runBackupAlerts } from '@/features/backup/run-backup-alerts'
import { runBatteryAlerts } from '@/features/alerts/run-battery-alerts'
import { syncSolarmanMinute } from '@/server/jobs/sync-solarman'

async function runLoop() {
  console.log('[sync:worker] avvio loop')

  while (true) {
    const config = await getConfig()
    const intervalMs = config.sync.intervalMs

    try {
      const result = await syncSolarmanMinute({ backfillDays: 1 })
      console.log(
        `[sync:worker] ${new Date().toISOString()} ${result.message} (${result.inserted})`,
      )

      const alertResult = await runBatteryAlerts()

      if (alertResult.sent > 0) {
        console.log(`[sync:worker] alert inviati: ${alertResult.sent}`)
      }

      if (alertResult.errors.length > 0) {
        console.error(`[sync:worker] errori alert: ${alertResult.errors.join(', ')}`)
      }

      const backupAlertResult = await runBackupAlerts()

      if (backupAlertResult.sent > 0) {
        console.log(`[sync:worker] alert backup inviati: ${backupAlertResult.sent}`)
      }

      if (backupAlertResult.errors.length > 0) {
        console.error(
          `[sync:worker] errori alert backup: ${backupAlertResult.errors.join(', ')}`,
        )
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`[sync:worker] errore: ${message}`)
    }

    await sleep(intervalMs)
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

runLoop().catch((error) => {
  console.error('[sync:worker] crash:', error)
  process.exit(1)
})

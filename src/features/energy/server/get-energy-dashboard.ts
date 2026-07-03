import { createServerFn } from '@tanstack/react-start'

import type { EnergyDashboardData } from '@/features/energy/types'
import { getEnergySamples } from '@/server/db/energy-repository'
import {
  getStationId,
  getSyncSummary,
  isSolarmanConfigured,
  syncSolarmanMinute,
} from '@/server/jobs/sync-solarman'

export const getEnergyDashboard = createServerFn({ method: 'GET' }).handler(
  async (): Promise<EnergyDashboardData> => {
    try {
      const stationId = getStationId()
      const summary = await getSyncSummary()

      if (summary.sampleCount === 0) {
        await syncSolarmanMinute({ backfillDays: 1 })
      }

      const to = new Date()
      const from = new Date(to.getTime() - 24 * 60 * 60 * 1000)

      const [rows, syncStatus] = await Promise.all([
        getEnergySamples({ stationId, from, to }),
        getSyncSummary(),
      ])

      return {
        samples: rows.map((row) => ({
          recordedAt: row.recorded_at.toISOString(),
          produzioneW: row.produzione_w === null ? null : Number(row.produzione_w),
          consumoW: row.consumo_w === null ? null : Number(row.consumo_w),
          batterySoc: row.battery_soc === null ? null : Number(row.battery_soc),
          batteryPowerW:
            row.battery_power_w === null ? null : Number(row.battery_power_w),
        })),
        syncStatus,
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Database non disponibile'

      return {
        samples: [],
        syncStatus: {
          lastRunAt: null,
          lastStatus: 'error',
          lastError: message,
          sampleCount: 0,
          isMock: !isSolarmanConfigured(),
        },
      }
    }
  },
)

export const runEnergySync = createServerFn({ method: 'POST' }).handler(async () => {
  return syncSolarmanMinute({ backfillDays: 2 })
})

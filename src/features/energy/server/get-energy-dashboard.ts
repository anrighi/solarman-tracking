import { createServerFn } from '@tanstack/react-start'

import { mapEnergySampleRow } from '@/features/energy/mappers'
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
      let syncStatus = await getSyncSummary()

      if (syncStatus.sampleCount === 0) {
        await syncSolarmanMinute({ backfillDays: 1 })
        syncStatus = await getSyncSummary()
      }

      const to = new Date()
      const from = new Date(to.getTime() - 24 * 60 * 60 * 1000)
      const rows = await getEnergySamples({ stationId, from, to })

      return {
        samples: rows.map(mapEnergySampleRow),
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

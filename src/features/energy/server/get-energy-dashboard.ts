import { createServerFn } from '@tanstack/react-start'

import {
  computeBatteryStats,
  computeEnergyTotals,
} from '@/features/energy/battery-stats'
import { mapEnergySampleRow } from '@/features/energy/mappers'
import type { EnergyDashboardData } from '@/features/energy/types'
import {
  formatDateOnly,
  type PeriodType,
  resolveTimeRange,
} from '@/features/energy/time-range'
import { getConfig } from '@/lib/config/service'
import { defaultAppConfig } from '@/lib/config/schema'
import { getEnergySamples, getFirstSampleDate } from '@/server/db/energy-repository'
import {
  getStationId,
  getSyncSummary,
  isSolarmanConfigured,
  syncSolarmanMinute,
} from '@/server/jobs/sync-solarman'

export const getEnergyDashboard = createServerFn({ method: 'GET' })
  .validator((data: unknown) => {
    const input = (data ?? {}) as { period?: PeriodType; anchor?: string }
    return {
      period: input.period,
      anchor: input.anchor,
    }
  })
  .handler(async ({ data }): Promise<EnergyDashboardData> => {
    try {
      const stationId = getStationId()
      const config = await getConfig()
      let syncStatus = await getSyncSummary()

      if (syncStatus.sampleCount === 0) {
        await syncSolarmanMinute({ backfillDays: 1 })
        syncStatus = await getSyncSummary()
      }

      const period = data.period ?? defaultPeriod(config.dashboard.defaultRangeHours)
      const timeRange = resolveTimeRange({
        period,
        anchor: data.anchor,
      })
      const [rows, firstSampleDate] = await Promise.all([
        getEnergySamples({
          stationId,
          from: timeRange.from,
          to: timeRange.to,
        }),
        getFirstSampleDate(stationId),
      ])
      const samples = rows.map(mapEnergySampleRow)

      return {
        samples,
        period: timeRange.period,
        anchor: timeRange.anchor,
        firstDataDate: firstSampleDate ? formatDateOnly(firstSampleDate) : null,
        periodFrom: timeRange.from.toISOString(),
        periodTo: timeRange.to.toISOString(),
        isLive: timeRange.isLive,
        batteryStats: computeBatteryStats(samples),
        energyTotals: computeEnergyTotals(samples),
        config: { dashboard: config.dashboard, chart: config.chart },
        syncStatus,
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Database non disponibile'

      return {
        samples: [],
        period: 'day',
        anchor: null,
        firstDataDate: null,
        periodFrom: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        periodTo: new Date().toISOString(),
        isLive: true,
        batteryStats: {
          socMin: null,
          socMax: null,
          socAvg: null,
          energyChargedWh: 0,
          energyDischargedWh: 0,
        },
        energyTotals: {
          producedWh: 0,
          consumedWh: 0,
          importedWh: 0,
          exportedWh: 0,
          selfConsumedWh: 0,
        },
        config: {
          dashboard: defaultAppConfig.dashboard,
          chart: defaultAppConfig.chart,
        },
        syncStatus: {
          lastRunAt: null,
          lastStatus: 'error',
          lastError: message,
          sampleCount: 0,
          isMock: !isSolarmanConfigured(),
        },
      }
    }
  })

function defaultPeriod(defaultRangeHours: number): PeriodType {
  if (defaultRangeHours >= 24 * 30) {
    return 'month'
  }

  if (defaultRangeHours >= 24 * 7) {
    return 'week'
  }

  return 'day'
}

export const runEnergySync = createServerFn({ method: 'POST' }).handler(async () => {
  return syncSolarmanMinute({ backfillDays: 2 })
})

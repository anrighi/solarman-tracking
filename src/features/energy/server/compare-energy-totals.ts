import {
  computeEnergyTotals,
  type EnergyTotals,
} from '@/features/energy/battery-stats'
import { mapEnergySampleRow } from '@/features/energy/mappers'
import { env } from '@/lib/env'
import {
  addDays,
  formatDay,
  kwhToWh,
  mapDailyEnergyItems,
  SolarmanClient,
  startOfUtcDay,
  utcDayBounds,
} from '@/lib/solarman/client'
import type { SolarmanClientConfig } from '@/lib/solarman/types'
import {
  countEnergySamplesByDay,
  getEnergySamples,
  saveRawPayload,
} from '@/server/db/energy-repository'
import {
  getStationId,
  isSolarmanConfigured,
  syncSolarmanMinute,
} from '@/server/jobs/sync-solarman'

export const SAMPLES_PER_FULL_DAY = 288
export const COVERAGE_RATIO = 0.8
export const DELTA_TOLERANCE_PCT = 5
export const DEFAULT_COMPARE_DAYS = 7

export type DayEnergyWh = {
  producedWh: number
  consumedWh: number
  importedWh: number
  exportedWh: number
}

export type DayDeltaPct = {
  produced: number | null
  consumed: number | null
  imported: number | null
  exported: number | null
}

export type DayComparison = {
  date: string
  sampleCount: number
  expectedSamples: number
  minute: DayEnergyWh
  api: DayEnergyWh | null
  deltaPct: DayDeltaPct
}

export type CompareEnergyTotalsResult = {
  days: DayComparison[]
  backfillRan: boolean
  backfillInserted: number
  weekMinute: EnergyTotals
  weekApi: EnergyTotals
}

export function buildDateRange(days: number, now = new Date()) {
  const safeDays = Math.max(1, days)
  const dates: string[] = []

  for (let offset = safeDays - 1; offset >= 0; offset -= 1) {
    dates.push(formatDay(addDays(now, -offset)))
  }

  return dates
}

export function expectedSamplesForDay(dateKey: string, now = new Date()) {
  const todayKey = formatDay(now)

  if (dateKey !== todayKey) {
    return SAMPLES_PER_FULL_DAY
  }

  const start = startOfUtcDay(now)
  const minutesSinceMidnight = (now.getTime() - start.getTime()) / 60_000

  return Math.max(1, Math.ceil(minutesSinceMidnight / 5))
}

export function assessDayCoverage(dateKey: string, sampleCount: number, now = new Date()) {
  const expectedSamples = expectedSamplesForDay(dateKey, now)
  const minExpected = expectedSamples * COVERAGE_RATIO

  return {
    expectedSamples,
    minExpected,
    sufficient: sampleCount >= minExpected,
  }
}

export function computeDeltaPct(minuteWh: number, apiWh: number) {
  if (apiWh === 0) {
    if (minuteWh === 0) {
      return 0
    }

    return null
  }

  return ((minuteWh - apiWh) / apiWh) * 100
}

export function dailyEnergyToWh(daily: {
  producedKwh: number
  consumedKwh: number
  importedKwh: number
  exportedKwh: number
}): DayEnergyWh {
  return {
    producedWh: kwhToWh(daily.producedKwh),
    consumedWh: kwhToWh(daily.consumedKwh),
    importedWh: kwhToWh(daily.importedKwh),
    exportedWh: kwhToWh(daily.exportedKwh),
  }
}

export function sumDayEnergyWh(days: DayEnergyWh[]): DayEnergyWh {
  return days.reduce(
    (totals, day) => ({
      producedWh: totals.producedWh + day.producedWh,
      consumedWh: totals.consumedWh + day.consumedWh,
      importedWh: totals.importedWh + day.importedWh,
      exportedWh: totals.exportedWh + day.exportedWh,
    }),
    { producedWh: 0, consumedWh: 0, importedWh: 0, exportedWh: 0 },
  )
}

export function toEnergyTotals(day: DayEnergyWh): EnergyTotals {
  return {
    producedWh: day.producedWh,
    consumedWh: day.consumedWh,
    importedWh: day.importedWh,
    exportedWh: day.exportedWh,
    selfConsumedWh: Math.max(0, day.producedWh - day.exportedWh),
  }
}

export function exceedsTolerance(result: CompareEnergyTotalsResult) {
  for (const day of result.days) {
    if (!day.api) {
      continue
    }

    const deltas = [
      day.deltaPct.produced,
      day.deltaPct.consumed,
      day.deltaPct.imported,
      day.deltaPct.exported,
    ]

    for (const delta of deltas) {
      if (delta !== null && Math.abs(delta) > DELTA_TOLERANCE_PCT) {
        return true
      }
    }
  }

  return false
}

function createSolarmanClient(stationId: number) {
  const config: SolarmanClientConfig = {
    apiUrl: env.SOLARMAN_API_URL ?? 'https://globalapi.solarmanpv.com',
    appId: env.SOLARMAN_APP_ID!,
    appSecret: env.SOLARMAN_APP_SECRET!,
    email: env.SOLARMAN_EMAIL!,
    password: env.SOLARMAN_PASSWORD!,
    stationId,
  }

  return new SolarmanClient(config)
}

function buildDeltaPct(minute: DayEnergyWh, api: DayEnergyWh): DayDeltaPct {
  return {
    produced: computeDeltaPct(minute.producedWh, api.producedWh),
    consumed: computeDeltaPct(minute.consumedWh, api.consumedWh),
    imported: computeDeltaPct(minute.importedWh, api.importedWh),
    exported: computeDeltaPct(minute.exportedWh, api.exportedWh),
  }
}

export async function compareEnergyTotals(options?: {
  days?: number
  now?: Date
}): Promise<CompareEnergyTotalsResult> {
  if (!isSolarmanConfigured()) {
    throw new Error('Credenziali Solarman mancanti — confronto non disponibile')
  }

  const now = options?.now ?? new Date()
  const days = options?.days ?? DEFAULT_COMPARE_DAYS
  const dateRange = buildDateRange(days, now)
  const stationId = getStationId()
  const rangeStart = utcDayBounds(dateRange[0]!).from
  const rangeEnd = utcDayBounds(dateRange[dateRange.length - 1]!).to

  let backfillRan = false
  let backfillInserted = 0

  const ensureCoverage = async () => {
    const counts = await countEnergySamplesByDay({
      stationId,
      from: rangeStart,
      to: rangeEnd,
    })
    const countByDay = new Map(counts.map((entry) => [entry.day, entry.count]))

    for (const dateKey of dateRange) {
      const sampleCount = countByDay.get(dateKey) ?? 0
      const coverage = assessDayCoverage(dateKey, sampleCount, now)

      if (coverage.sufficient) {
        continue
      }

      const syncResult = await syncSolarmanMinute({
        backfillDays: days,
        includeRealtime: false,
      })
      backfillRan = true
      backfillInserted += syncResult.inserted
      return
    }
  }

  await ensureCoverage()

  const client = createSolarmanClient(stationId)
  const history = await client.getHistoryDay(dateRange[0]!, dateRange[dateRange.length - 1]!)

  await saveRawPayload({
    source: 'history-day',
    stationId,
    fetchedAt: now,
    payload: history,
  })

  const apiByDay = new Map(
    mapDailyEnergyItems(history.stationDataItems ?? []).map((entry) => [
      entry.date,
      dailyEnergyToWh(entry),
    ]),
  )

  const dayComparisons: DayComparison[] = []

  for (const dateKey of dateRange) {
    const { from, to } = utcDayBounds(dateKey)
    const rows = await getEnergySamples({ stationId, from, to })
    const samples = rows.map(mapEnergySampleRow)
    const minuteTotals = computeEnergyTotals(samples)
    const minute: DayEnergyWh = {
      producedWh: minuteTotals.producedWh,
      consumedWh: minuteTotals.consumedWh,
      importedWh: minuteTotals.importedWh,
      exportedWh: minuteTotals.exportedWh,
    }
    const api = apiByDay.get(dateKey) ?? null
    const counts = await countEnergySamplesByDay({ stationId, from, to })
    const sampleCount = counts.find((entry) => entry.day === dateKey)?.count ?? rows.length

    dayComparisons.push({
      date: dateKey,
      sampleCount,
      expectedSamples: expectedSamplesForDay(dateKey, now),
      minute,
      api,
      deltaPct: api ? buildDeltaPct(minute, api) : {
        produced: null,
        consumed: null,
        imported: null,
        exported: null,
      },
    })
  }

  const weekMinuteWh = sumDayEnergyWh(dayComparisons.map((day) => day.minute))
  const weekApiWh = sumDayEnergyWh(
    dayComparisons
      .map((day) => day.api)
      .filter((day): day is DayEnergyWh => day !== null),
  )

  return {
    days: dayComparisons,
    backfillRan,
    backfillInserted,
    weekMinute: toEnergyTotals(weekMinuteWh),
    weekApi: toEnergyTotals(weekApiWh),
  }
}

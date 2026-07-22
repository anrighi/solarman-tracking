import {
  countDayStates,
  dateKeysForMonth,
  dayOffsetFromToday,
  monthUtcBounds,
  resolveBackfillDayStatus,
} from '@/features/backfill/day-status'
import type {
  BackfillCheckpointView,
  BackfillMonthSummary,
  FullBackfillActionResult,
  RecoverBackfillResult,
} from '@/features/backfill/types'
import { formatUtcDayKey } from '@/features/energy/day-coverage'
import { getBackfillCheckpoint } from '@/server/db/backfill-repository'
import { countEnergySamplesByDay } from '@/server/db/energy-repository'
import { runCheckpointBackfill } from '@/server/jobs/backfill'
import { getStationId, syncSolarmanMinute } from '@/server/jobs/sync-solarman'

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/
const MAX_RECOVER_DAYS = 31
const DEFAULT_FULL_BACKFILL_DAYS = 365

function toIsoOrNull(value: Date | null) {
  if (!value) {
    return null
  }

  return value.toISOString()
}

function mapCheckpoint(
  row: Awaited<ReturnType<typeof getBackfillCheckpoint>>,
): BackfillCheckpointView | null {
  if (!row) {
    return null
  }

  return {
    firstDataAt: toIsoOrNull(row.first_data_at),
    lastSyncedAt: toIsoOrNull(row.last_synced_at),
    noDataBefore: toIsoOrNull(row.no_data_before),
  }
}

export async function getBackfillMonthStatus(
  year: number,
  month: number,
  now = new Date(),
): Promise<BackfillMonthSummary> {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error('Anno non valido')
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error('Mese non valido')
  }

  const stationId = getStationId()
  const { from, to } = monthUtcBounds(year, month)
  const [counts, checkpoint] = await Promise.all([
    countEnergySamplesByDay({ stationId, from, to }),
    getBackfillCheckpoint(stationId),
  ])

  const countByDay = new Map(counts.map((row) => [row.day, row.count]))
  const days = dateKeysForMonth(year, month).map((date) =>
    resolveBackfillDayStatus({
      date,
      localCount: countByDay.get(date) ?? 0,
      now,
    }),
  )

  return {
    year,
    month,
    days,
    counts: countDayStates(days),
    checkpoint: mapCheckpoint(checkpoint),
  }
}

function validateDateKeys(dates: string[], now = new Date()) {
  if (!Array.isArray(dates) || dates.length === 0) {
    throw new Error('Nessun giorno selezionato')
  }

  if (dates.length > MAX_RECOVER_DAYS) {
    throw new Error(`Massimo ${MAX_RECOVER_DAYS} giorni per operazione`)
  }

  const todayKey = formatUtcDayKey(now)
  const unique = new Set<string>()

  for (const date of dates) {
    if (typeof date !== 'string' || !DATE_KEY_RE.test(date)) {
      throw new Error(`Data non valida: ${String(date)}`)
    }

    if (date > todayKey) {
      throw new Error(`Impossibile recuperare un giorno futuro: ${date}`)
    }

    unique.add(date)
  }

  return [...unique].sort()
}

export async function recoverBackfillDays(
  dates: string[],
  options?: { year?: number; month?: number },
): Promise<RecoverBackfillResult> {
  const now = new Date()
  const validDates = validateDateKeys(dates, now)
  let inserted = 0

  for (const date of validDates) {
    const startOffset = dayOffsetFromToday(date, now)
    const result = await syncSolarmanMinute({
      backfillDays: 1,
      startOffset,
      includeRealtime: false,
    })
    inserted += result.inserted
  }

  const year = options?.year ?? now.getUTCFullYear()
  const month = options?.month ?? now.getUTCMonth() + 1
  const summary = await getBackfillMonthStatus(year, month, now)

  return {
    recoveredDates: validDates,
    inserted,
    summary,
    message: `Recuperati ${validDates.length} giorni (${inserted} righe elaborate)`,
  }
}

export async function runFullBackfillAction(options?: {
  maxDays?: number
  year?: number
  month?: number
}): Promise<FullBackfillActionResult> {
  const now = new Date()
  const maxDays = options?.maxDays ?? DEFAULT_FULL_BACKFILL_DAYS
  const result = await runCheckpointBackfill({ maxDays })
  const year = options?.year ?? now.getUTCFullYear()
  const month = options?.month ?? now.getUTCMonth() + 1
  const summary = await getBackfillMonthStatus(year, month, now)

  return {
    inserted: result.inserted,
    daysProcessed: result.daysProcessed,
    stoppedReason: result.stoppedReason,
    message: result.message,
    summary,
  }
}

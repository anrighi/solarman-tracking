import {
  assessDayCoverage,
  startOfUtcDay,
} from '@/features/energy/day-coverage'
import type { BackfillDayState, BackfillDayStatus } from '@/features/backfill/types'

export function resolveBackfillDayStatus(input: {
  date: string
  localCount: number
  now?: Date
}): BackfillDayStatus {
  const now = input.now ?? new Date()
  const coverage = assessDayCoverage(input.date, input.localCount, now)

  let state: BackfillDayState

  if (input.localCount <= 0) {
    state = 'missing'
  } else if (coverage.sufficient) {
    state = 'complete'
  } else {
    state = 'partial'
  }

  return {
    date: input.date,
    state,
    localCount: input.localCount,
    expectedSamples: coverage.expectedSamples,
  }
}

export function emptyStateCounts(): Record<BackfillDayState, number> {
  return {
    complete: 0,
    partial: 0,
    missing: 0,
  }
}

export function countDayStates(days: BackfillDayStatus[]) {
  const counts = emptyStateCounts()

  for (const day of days) {
    counts[day.state] += 1
  }

  return counts
}

export function dateKeysForMonth(year: number, month: number) {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const keys: string[] = []

  for (let day = 1; day <= daysInMonth; day += 1) {
    keys.push(
      `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    )
  }

  return keys
}

export function monthUtcBounds(year: number, month: number) {
  const from = new Date(Date.UTC(year, month - 1, 1))
  const to = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999))
  return { from, to }
}

export function dayOffsetFromToday(dateKey: string, now = new Date()) {
  const today = startOfUtcDay(now)
  const day = startOfUtcDay(new Date(`${dateKey}T00:00:00.000Z`))
  return Math.round((today.getTime() - day.getTime()) / 86_400_000)
}

import { assessDayCoverage } from '@/features/energy/server/compare-energy-totals'
import type {
  ArchiveDayState,
  ArchiveDayStatus,
  ArchiveManifest,
  ArchiveManifestDay,
} from '@/features/archive/types'

export function resolveDayState(input: {
  date: string
  localCount: number
  s3Day: ArchiveManifestDay | null
  now?: Date
}): ArchiveDayStatus {
  const now = input.now ?? new Date()
  const coverage = assessDayCoverage(input.date, input.localCount, now)
  const hasLocal = input.localCount > 0
  const hasS3 = input.s3Day !== null
  const localSufficient = coverage.sufficient

  let state: ArchiveDayState

  if (!hasLocal && !hasS3) {
    state = 'missing'
  } else if (hasLocal && !hasS3) {
    state = localSufficient ? 'localOnly' : 'partial'
  } else if (!hasLocal && hasS3) {
    state = 's3Only'
  } else if (hasLocal && hasS3 && input.s3Day) {
    if (!localSufficient) {
      state = 'partial'
    } else if (input.s3Day.rowCount < 0) {
      state = 'synced'
    } else if (input.localCount === input.s3Day.rowCount) {
      state = 'synced'
    } else {
      state = 'mismatch'
    }
  } else {
    state = 'missing'
  }

  return {
    date: input.date,
    state,
    localCount: input.localCount,
    expectedSamples: coverage.expectedSamples,
    s3RowCount: input.s3Day?.rowCount ?? null,
    s3ContentHash: input.s3Day?.contentHash ?? null,
  }
}

export function emptyStateCounts(): Record<ArchiveDayState, number> {
  return {
    missing: 0,
    localOnly: 0,
    s3Only: 0,
    synced: 0,
    mismatch: 0,
    partial: 0,
  }
}

export function countDayStates(days: ArchiveDayStatus[]) {
  const counts = emptyStateCounts()

  for (const day of days) {
    counts[day.state] += 1
  }

  return counts
}

export function manifestDaysForMonth(manifest: ArchiveManifest, dateKeys: string[]) {
  const map = new Map<string, ArchiveManifestDay>()

  for (const dateKey of dateKeys) {
    const entry = manifest.days[dateKey]
    if (entry) {
      map.set(dateKey, entry)
    }
  }

  return map
}

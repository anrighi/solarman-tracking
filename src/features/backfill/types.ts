export type BackfillDayState = 'complete' | 'partial' | 'missing'

export type BackfillDayStatus = {
  date: string
  state: BackfillDayState
  localCount: number
  expectedSamples: number
}

export type BackfillCheckpointView = {
  firstDataAt: string | null
  lastSyncedAt: string | null
  noDataBefore: string | null
}

export type BackfillMonthSummary = {
  year: number
  month: number
  days: BackfillDayStatus[]
  counts: Record<BackfillDayState, number>
  checkpoint: BackfillCheckpointView | null
}

export type RecoverBackfillResult = {
  recoveredDates: string[]
  inserted: number
  summary: BackfillMonthSummary
  message: string
}

export type FullBackfillActionResult = {
  inserted: number
  daysProcessed: number
  stoppedReason: string
  message: string
  summary: BackfillMonthSummary
}

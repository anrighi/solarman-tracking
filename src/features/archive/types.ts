export type ArchiveDayState =
  | 'missing'
  | 'localOnly'
  | 's3Only'
  | 'synced'
  | 'mismatch'
  | 'partial'

export type ArchiveDirection = 'export' | 'hydrate'
export type ArchiveRunStatus = 'success' | 'failed' | 'partial'

export type ArchiveSamplePayload = {
  recordedAt: string
  productionW: number | null
  consumptionW: number | null
  batterySoc: number | null
  batteryPowerW: number | null
  gridImportW: number | null
  gridExportW: number | null
  batteryChargeW: number | null
  batteryDischargeW: number | null
  irradiance: number | null
}

export type ArchiveManifestDay = {
  rowCount: number
  contentHash: string
  exportedAt: string
}

export type ArchiveManifest = {
  stationId: number
  updatedAt: string
  days: Record<string, ArchiveManifestDay>
}

export type ArchiveDayStatus = {
  date: string
  state: ArchiveDayState
  localCount: number
  expectedSamples: number
  s3RowCount: number | null
  s3ContentHash: string | null
}

export type ArchiveRun = {
  id: number
  stationId: number
  direction: ArchiveDirection
  dayFrom: string
  dayTo: string
  daysCount: number
  rowsAffected: number
  status: ArchiveRunStatus
  errorMessage: string | null
  createdAt: Date | string
}

export type ArchiveMonthSummary = {
  stationId: number
  year: number
  month: number
  s3Configured: boolean
  s3Reachable: boolean | null
  s3Error: string | null
  days: ArchiveDayStatus[]
  counts: Record<ArchiveDayState, number>
  latestRun: ArchiveRun | null
}

export type ArchiveDaysResult = {
  daysProcessed: number
  rowsAffected: number
  status: ArchiveRunStatus
  errorMessage?: string
  run: ArchiveRun
}

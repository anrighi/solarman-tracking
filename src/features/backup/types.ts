export type BackupSource = 'scheduled' | 'manual'
export type BackupStatus = 'success' | 'failed' | 'upload_failed'

export type BackupRun = {
  id: number
  filename: string
  sizeBytes: number
  status: BackupStatus
  source: BackupSource
  remoteSynced: boolean
  errorMessage: string | null
  createdAt: Date
}

export type BackupHealthStatus = 'ok' | 'missing' | 'failed'

export type BackupHealth = {
  status: BackupHealthStatus
  lastSuccessAt: string | null
  lastRunAt: string | null
  hoursSinceLastSuccess: number | null
  maxAgeHours: number
  lastSuccessRun: BackupRun | null
}

export type RunBackupResult = {
  run: BackupRun | null
  error?: string
}

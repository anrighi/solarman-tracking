export type SyncStatus = 'idle' | 'running' | 'success' | 'error'

export type EnergySampleRow = {
  id: number
  station_id: number
  recorded_at: Date
  produzione_w: number | null
  consumo_w: number | null
  battery_soc: number | null
  battery_power_w: number | null
}

export type EnergySampleInsert = {
  stationId: number
  recordedAt: Date
  produzioneW: number | null
  consumoW: number | null
  batterySoc: number | null
  batteryPowerW: number | null
}

export type SyncStateRow = {
  job_name: string
  watermark_at: Date | null
  last_run_at: Date | null
  last_status: SyncStatus
  last_error: string | null
}

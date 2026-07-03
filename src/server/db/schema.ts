export type SyncStatus = 'idle' | 'running' | 'success' | 'error'

export type EnergySampleRow = {
  id: number
  station_id: number
  recorded_at: Date
  production_w: number | null
  consumption_w: number | null
  battery_soc: number | null
  battery_power_w: number | null
  grid_import_w: number | null
  grid_export_w: number | null
  battery_charge_w: number | null
  battery_discharge_w: number | null
  irradiance: number | null
}

export type EnergySampleInsert = {
  stationId: number
  recordedAt: Date
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

export type SyncStateRow = {
  job_name: string
  watermark_at: Date | null
  last_run_at: Date | null
  last_status: SyncStatus
  last_error: string | null
}

import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'

import { withConnection } from '@/server/db/connection'
import type {
  EnergySampleInsert,
  EnergySampleRow,
  SyncStateRow,
  SyncStatus,
} from '@/server/db/schema'

type SampleRowPacket = EnergySampleRow & RowDataPacket
type SyncStatePacket = SyncStateRow & RowDataPacket

const SAMPLE_COLUMNS = `
  station_id, recorded_at, production_w, consumption_w, battery_soc, battery_power_w,
  grid_import_w, grid_export_w, battery_charge_w, battery_discharge_w, irradiance
` as const

export async function upsertEnergySamples(samples: EnergySampleInsert[]) {
  if (samples.length === 0) {
    return 0
  }

  return withConnection(async (connection) => {
    const values = samples.map((sample) => [
      sample.stationId,
      sample.recordedAt,
      sample.productionW,
      sample.consumptionW,
      sample.batterySoc,
      sample.batteryPowerW,
      sample.gridImportW,
      sample.gridExportW,
      sample.batteryChargeW,
      sample.batteryDischargeW,
      sample.irradiance,
    ])

    const [result] = await connection.query<ResultSetHeader>(
      `INSERT INTO energy_samples_minute (${SAMPLE_COLUMNS})
       VALUES ?
       ON DUPLICATE KEY UPDATE
        production_w = VALUES(production_w),
        consumption_w = VALUES(consumption_w),
        battery_soc = VALUES(battery_soc),
        battery_power_w = VALUES(battery_power_w),
        grid_import_w = VALUES(grid_import_w),
        grid_export_w = VALUES(grid_export_w),
        battery_charge_w = VALUES(battery_charge_w),
        battery_discharge_w = VALUES(battery_discharge_w),
        irradiance = VALUES(irradiance)`,
      [values],
    )

    return result.affectedRows
  })
}

export async function saveRawPayload(input: {
  source: string
  stationId: number
  fetchedAt: Date
  payload: unknown
}) {
  await withConnection(async (connection) => {
    await connection.query(
      `INSERT INTO energy_samples_raw (source, station_id, fetched_at, payload)
       VALUES (?, ?, ?, ?)`,
      [
        input.source,
        input.stationId,
        input.fetchedAt,
        JSON.stringify(input.payload),
      ],
    )
  })
}

export async function getEnergySamples(input: {
  stationId: number
  from: Date
  to: Date
}) {
  return withConnection(async (connection) => {
    const [rows] = await connection.query<SampleRowPacket[]>(
      `SELECT id, ${SAMPLE_COLUMNS}
       FROM energy_samples_minute
       WHERE station_id = ? AND recorded_at >= ? AND recorded_at <= ?
       ORDER BY recorded_at ASC`,
      [input.stationId, input.from, input.to],
    )

    return rows
  })
}

export async function getFirstSampleDate(stationId: number) {
  return withConnection(async (connection) => {
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT MIN(recorded_at) AS first_at
       FROM energy_samples_minute
       WHERE station_id = ?`,
      [stationId],
    )

    const value = rows[0]?.first_at
    return value ? new Date(value) : null
  })
}

export async function countEnergySamples(stationId: number) {
  return withConnection(async (connection) => {
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM energy_samples_minute WHERE station_id = ?`,
      [stationId],
    )

    return Number(rows[0]?.total ?? 0)
  })
}

export async function getSyncState(jobName: string) {
  return withConnection(async (connection) => {
    const [rows] = await connection.query<SyncStatePacket[]>(
      `SELECT job_name, watermark_at, last_run_at, last_status, last_error
       FROM sync_state
       WHERE job_name = ?`,
      [jobName],
    )

    return rows[0] ?? null
  })
}

export async function updateSyncState(input: {
  jobName: string
  watermarkAt?: Date | null
  lastRunAt: Date
  lastStatus: SyncStatus
  lastError?: string | null
}) {
  await withConnection(async (connection) => {
    await connection.query(
      `INSERT INTO sync_state (job_name, watermark_at, last_run_at, last_status, last_error)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        watermark_at = COALESCE(VALUES(watermark_at), watermark_at),
        last_run_at = VALUES(last_run_at),
        last_status = VALUES(last_status),
        last_error = VALUES(last_error)`,
      [
        input.jobName,
        input.watermarkAt ?? null,
        input.lastRunAt,
        input.lastStatus,
        input.lastError ?? null,
      ],
    )
  })
}

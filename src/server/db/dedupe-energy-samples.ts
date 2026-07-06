import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'

import { isOnSampleBucketBoundary, normalizeToSampleBucket } from '@/lib/solarman/sample-timestamp'
import { withConnection } from '@/server/db/connection'
import type { EnergySampleRow } from '@/server/db/schema'

type SampleRowPacket = EnergySampleRow & RowDataPacket

export type DedupeEnergySamplesResult = {
  groupsProcessed: number
  duplicatesRemoved: number
  timestampsNormalized: number
}

function bucketKey(stationId: number, recordedAt: Date) {
  return `${stationId}:${normalizeToSampleBucket(recordedAt).getTime()}`
}

function pickCanonicalRow(rows: SampleRowPacket[]) {
  const onBoundary = rows.find((row) => isOnSampleBucketBoundary(row.recorded_at))

  if (onBoundary) {
    return onBoundary
  }

  return rows.reduce((best, row) => (row.id < best.id ? row : best))
}

export async function dedupeEnergySamples(stationId?: number): Promise<DedupeEnergySamplesResult> {
  return withConnection(async (connection) => {
    const [rows] = await connection.query<SampleRowPacket[]>(
      `SELECT id, station_id, recorded_at, production_w, consumption_w, battery_soc, battery_power_w,
              grid_import_w, grid_export_w, battery_charge_w, battery_discharge_w, irradiance
       FROM energy_samples_minute
       ${stationId ? 'WHERE station_id = ?' : ''}
       ORDER BY station_id ASC, recorded_at ASC, id ASC`,
      stationId ? [stationId] : [],
    )

    const groups = new Map<string, SampleRowPacket[]>()

    for (const row of rows) {
      const key = bucketKey(row.station_id, row.recorded_at)
      const group = groups.get(key) ?? []
      group.push(row)
      groups.set(key, group)
    }

    let duplicatesRemoved = 0
    let timestampsNormalized = 0

    for (const group of groups.values()) {
      const canonical = pickCanonicalRow(group)
      const bucketAt = normalizeToSampleBucket(canonical.recorded_at)
      const deleteIds = group.filter((row) => row.id !== canonical.id).map((row) => row.id)

      if (deleteIds.length > 0) {
        await connection.query<ResultSetHeader>(
          `DELETE FROM energy_samples_minute WHERE id IN (?)`,
          [deleteIds],
        )
        duplicatesRemoved += deleteIds.length
      }

      if (canonical.recorded_at.getTime() !== bucketAt.getTime()) {
        await connection.query(
          `UPDATE energy_samples_minute SET recorded_at = ? WHERE id = ?`,
          [bucketAt, canonical.id],
        )
        timestampsNormalized += 1
      }
    }

    return {
      groupsProcessed: groups.size,
      duplicatesRemoved,
      timestampsNormalized,
    }
  })
}

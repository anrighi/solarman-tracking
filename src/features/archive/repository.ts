import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'

import type {
  ArchiveDirection,
  ArchiveRun,
  ArchiveRunStatus,
} from '@/features/archive/types'
import { withConnection } from '@/server/db/connection'

type ArchiveRunRow = RowDataPacket & {
  id: number
  station_id: number
  direction: ArchiveDirection
  day_from: string
  day_to: string
  days_count: number
  rows_affected: number
  status: ArchiveRunStatus
  error_message: string | null
  created_at: Date
}

function mapRow(row: ArchiveRunRow): ArchiveRun {
  return {
    id: row.id,
    stationId: row.station_id,
    direction: row.direction,
    dayFrom: row.day_from,
    dayTo: row.day_to,
    daysCount: Number(row.days_count),
    rowsAffected: Number(row.rows_affected),
    status: row.status,
    errorMessage: row.error_message,
    createdAt: row.created_at,
  }
}

export async function insertArchiveRun(input: {
  stationId: number
  direction: ArchiveDirection
  dayFrom: string
  dayTo: string
  daysCount: number
  rowsAffected: number
  status: ArchiveRunStatus
  errorMessage?: string | null
}) {
  return withConnection(async (connection) => {
    const [result] = await connection.query<ResultSetHeader>(
      `INSERT INTO archive_runs
        (station_id, direction, day_from, day_to, days_count, rows_affected, status, error_message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.stationId,
        input.direction,
        input.dayFrom,
        input.dayTo,
        input.daysCount,
        input.rowsAffected,
        input.status,
        input.errorMessage ?? null,
      ],
    )

    const id = Number(result.insertId)
    const [rows] = await connection.query<ArchiveRunRow[]>(
      `SELECT id, station_id, direction, day_from, day_to, days_count, rows_affected,
              status, error_message, created_at
       FROM archive_runs WHERE id = ?`,
      [id],
    )

    return mapRow(rows[0])
  })
}

export async function listArchiveRuns(stationId: number, limit = 20) {
  return withConnection(async (connection) => {
    const [rows] = await connection.query<ArchiveRunRow[]>(
      `SELECT id, station_id, direction, day_from, day_to, days_count, rows_affected,
              status, error_message, created_at
       FROM archive_runs
       WHERE station_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [stationId, limit],
    )

    return rows.map(mapRow)
  })
}

export async function getLatestArchiveRun(stationId: number) {
  return withConnection(async (connection) => {
    const [rows] = await connection.query<ArchiveRunRow[]>(
      `SELECT id, station_id, direction, day_from, day_to, days_count, rows_affected,
              status, error_message, created_at
       FROM archive_runs
       WHERE station_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [stationId],
    )

    if (!rows[0]) {
      return null
    }

    return mapRow(rows[0])
  })
}

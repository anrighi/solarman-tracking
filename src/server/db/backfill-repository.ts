import type { RowDataPacket } from 'mysql2/promise'

import { withConnection } from '@/server/db/connection'

export type BackfillCheckpointRow = {
  station_id: number
  first_data_at: Date | null
  last_synced_at: Date | null
  no_data_before: Date | null
}

export type BackfillGapStatus = 'open' | 'filled' | 'ignored'

type CheckpointPacket = BackfillCheckpointRow & RowDataPacket

export async function getBackfillCheckpoint(stationId: number) {
  return withConnection(async (connection) => {
    const [rows] = await connection.query<CheckpointPacket[]>(
      `SELECT station_id, first_data_at, last_synced_at, no_data_before
       FROM backfill_checkpoint
       WHERE station_id = ?`,
      [stationId],
    )

    return rows[0] ?? null
  })
}

export async function upsertBackfillCheckpoint(input: {
  stationId: number
  firstDataAt?: Date | null
  lastSyncedAt?: Date | null
  noDataBefore?: Date | null
}) {
  await withConnection(async (connection) => {
    await connection.query(
      `INSERT INTO backfill_checkpoint
        (station_id, first_data_at, last_synced_at, no_data_before)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
        first_data_at = COALESCE(VALUES(first_data_at), first_data_at),
        last_synced_at = COALESCE(VALUES(last_synced_at), last_synced_at),
        no_data_before = COALESCE(VALUES(no_data_before), no_data_before)`,
      [
        input.stationId,
        input.firstDataAt ?? null,
        input.lastSyncedAt ?? null,
        input.noDataBefore ?? null,
      ],
    )
  })
}

export async function recordBackfillGap(input: {
  stationId: number
  gapStart: Date
  gapEnd: Date
  status?: BackfillGapStatus
}) {
  await withConnection(async (connection) => {
    await connection.query(
      `INSERT INTO backfill_gap (station_id, gap_start, gap_end, status)
       VALUES (?, ?, ?, ?)`,
      [
        input.stationId,
        input.gapStart,
        input.gapEnd,
        input.status ?? 'open',
      ],
    )
  })
}

export async function getOpenBackfillGaps(stationId: number) {
  return withConnection(async (connection) => {
    const [rows] = await connection.query<
      (RowDataPacket & {
        id: number
        gap_start: Date
        gap_end: Date
      })[]
    >(
      `SELECT id, gap_start, gap_end
       FROM backfill_gap
       WHERE station_id = ? AND status = 'open'
       ORDER BY gap_start ASC`,
      [stationId],
    )

    return rows
  })
}

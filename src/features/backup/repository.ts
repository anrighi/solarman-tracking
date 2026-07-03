import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise'

import type { BackupRun, BackupSource, BackupStatus } from '@/features/backup/types'
import { withConnection } from '@/server/db/connection'

type BackupRunRow = RowDataPacket & {
  id: number
  filename: string
  size_bytes: number
  status: BackupStatus
  source: BackupSource
  remote_synced: 0 | 1
  error_message: string | null
  created_at: Date
}

function mapRow(row: BackupRunRow): BackupRun {
  return {
    id: row.id,
    filename: row.filename,
    sizeBytes: Number(row.size_bytes),
    status: row.status,
    source: row.source,
    remoteSynced: row.remote_synced === 1,
    errorMessage: row.error_message,
    createdAt: row.created_at,
  }
}

export async function insertBackupRun(input: {
  filename: string
  sizeBytes: number
  status: BackupStatus
  source: BackupSource
  remoteSynced: boolean
  errorMessage?: string | null
}) {
  return withConnection(async (connection) => {
    const [result] = await connection.query<ResultSetHeader>(
      `INSERT INTO backup_runs
        (filename, size_bytes, status, source, remote_synced, error_message)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        input.filename,
        input.sizeBytes,
        input.status,
        input.source,
        input.remoteSynced ? 1 : 0,
        input.errorMessage ?? null,
      ],
    )

    const id = Number(result.insertId)
    const [rows] = await connection.query<BackupRunRow[]>(
      `SELECT id, filename, size_bytes, status, source, remote_synced, error_message, created_at
       FROM backup_runs WHERE id = ?`,
      [id],
    )

    return mapRow(rows[0])
  })
}

export async function listBackupRuns(limit = 20) {
  return withConnection(async (connection) => {
    const [rows] = await connection.query<BackupRunRow[]>(
      `SELECT id, filename, size_bytes, status, source, remote_synced, error_message, created_at
       FROM backup_runs
       ORDER BY created_at DESC
       LIMIT ?`,
      [limit],
    )

    return rows.map(mapRow)
  })
}

export async function getBackupRunById(id: number) {
  return withConnection(async (connection) => {
    const [rows] = await connection.query<BackupRunRow[]>(
      `SELECT id, filename, size_bytes, status, source, remote_synced, error_message, created_at
       FROM backup_runs WHERE id = ?`,
      [id],
    )

    if (!rows[0]) {
      return null
    }

    return mapRow(rows[0])
  })
}

export async function getLatestSuccessfulBackupRun() {
  return withConnection(async (connection) => {
    const [rows] = await connection.query<BackupRunRow[]>(
      `SELECT id, filename, size_bytes, status, source, remote_synced, error_message, created_at
       FROM backup_runs
       WHERE status = 'success'
       ORDER BY created_at DESC
       LIMIT 1`,
    )

    if (!rows[0]) {
      return null
    }

    return mapRow(rows[0])
  })
}

export async function getLatestBackupRun() {
  return withConnection(async (connection) => {
    const [rows] = await connection.query<BackupRunRow[]>(
      `SELECT id, filename, size_bytes, status, source, remote_synced, error_message, created_at
       FROM backup_runs
       ORDER BY created_at DESC
       LIMIT 1`,
    )

    if (!rows[0]) {
      return null
    }

    return mapRow(rows[0])
  })
}

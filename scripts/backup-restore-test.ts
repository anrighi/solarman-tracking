#!/usr/bin/env tsx

import type { RowDataPacket } from 'mysql2/promise'

import { dumpDatabase, restoreDatabase } from '@/features/backup/service'
import { closePool, withConnection } from '@/server/db/connection'

type Baseline = {
  sampleCount: number
  configCount: number
  maxRecordedAt: string | null
}

const SENTINEL_DATE = '2099-01-01 00:00:00.000'

async function readBaseline(): Promise<Baseline> {
  return withConnection(async (connection) => {
    const [sampleRows] = await connection.query<
      (RowDataPacket & { total: number; maxAt: Date | null })[]
    >(
      `SELECT COUNT(*) AS total, MAX(recorded_at) AS maxAt FROM energy_samples_minute`,
    )
    const [configRows] = await connection.query<(RowDataPacket & { total: number })[]>(
      `SELECT COUNT(*) AS total FROM app_config`,
    )

    const sample = sampleRows[0]
    const config = configRows[0]

    return {
      sampleCount: Number(sample?.total ?? 0),
      configCount: Number(config?.total ?? 0),
      maxRecordedAt: sample?.maxAt ? new Date(sample.maxAt).toISOString() : null,
    }
  })
}

async function insertSentinel(stationId: number) {
  await withConnection(async (connection) => {
    await connection.query(
      `INSERT INTO energy_samples_minute
        (station_id, recorded_at, production_w, consumption_w)
       VALUES (?, ?, -1, -1)`,
      [stationId, SENTINEL_DATE],
    )
  })
}

async function countSentinel() {
  return withConnection(async (connection) => {
    const [rows] = await connection.query<(RowDataPacket & { total: number })[]>(
      `SELECT COUNT(*) AS total FROM energy_samples_minute WHERE recorded_at = ?`,
      [SENTINEL_DATE],
    )

    return Number(rows[0]?.total ?? 0)
  })
}

async function getAnyStationId() {
  return withConnection(async (connection) => {
    const [rows] = await connection.query<(RowDataPacket & { station_id: number })[]>(
      `SELECT station_id FROM energy_samples_minute ORDER BY recorded_at DESC LIMIT 1`,
    )

    if (rows[0]?.station_id) {
      return Number(rows[0].station_id)
    }

    return 1
  })
}

function assertEqual(label: string, actual: unknown, expected: unknown) {
  if (actual !== expected) {
    throw new Error(`${label}: atteso ${String(expected)}, ottenuto ${String(actual)}`)
  }
}

async function main() {
  console.log('[restore-test] baseline...')
  const baseline = await readBaseline()
  const stationId = await getAnyStationId()

  console.log('[restore-test] dump...')
  const dump = await dumpDatabase()

  console.log('[restore-test] sentinel insert...')
  await insertSentinel(stationId)

  const sentinelBefore = await countSentinel()
  assertEqual('sentinel prima del restore', sentinelBefore, 1)

  console.log('[restore-test] restore...')
  await restoreDatabase(dump.filePath)

  const sentinelAfter = await countSentinel()
  assertEqual('sentinel dopo il restore', sentinelAfter, 0)

  const after = await readBaseline()
  assertEqual('sample count', after.sampleCount, baseline.sampleCount)
  assertEqual('config count', after.configCount, baseline.configCount)
  assertEqual('max recorded_at', after.maxRecordedAt, baseline.maxRecordedAt)

  console.log('[restore-test] OK')
  await closePool()
}

main().catch(async (error) => {
  console.error('[restore-test] errore:', error)
  await closePool()
  process.exit(1)
})

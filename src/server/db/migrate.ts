import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { Pool } from 'mysql2/promise'

import { getPool } from '@/server/db/connection'

let schemaReady: Promise<void> | null = null

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..',
)

export function ensureSchema() {
  if (!schemaReady) {
    schemaReady = applySchema().catch((error) => {
      schemaReady = null
      throw error
    })
  }

  return schemaReady
}

async function applySchema() {
  const pool = getPool()
  await runSqlFile(pool, path.join(projectRoot, 'docker/mysql/schema.sql'))
  await runMigrations(pool)
}

async function runMigrations(pool: Pool) {
  const migrationsDir = path.join(projectRoot, 'docker/mysql/migrations')
  let files: string[] = []

  try {
    files = (await readdir(migrationsDir))
      .filter((file) => file.endsWith('.sql'))
      .sort()
  } catch {
    return
  }

  for (const file of files) {
    await runSqlFile(pool, path.join(migrationsDir, file))
  }
}

async function runSqlFile(pool: Pool, filePath: string) {
  const sql = await readFile(filePath, 'utf8')
  const statements = sql
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0)

  const connection = await pool.getConnection()

  try {
    for (const statement of statements) {
      await connection.query(statement)
    }
  } finally {
    connection.release()
  }
}

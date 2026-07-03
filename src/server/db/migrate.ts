import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { getPool } from '@/server/db/connection'

let schemaReady: Promise<void> | null = null

export function ensureSchema() {
  if (!schemaReady) {
    schemaReady = applySchema()
  }

  return schemaReady
}

async function applySchema() {
  const pool = getPool()
  const schemaPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../../docker/mysql/schema.sql',
  )
  const sql = await readFile(schemaPath, 'utf8')
  const statements = sql
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0)

  for (const statement of statements) {
    await pool.query(statement)
  }
}

import mysql from 'mysql2/promise'

import { env } from '@/lib/env'

import { ensureSchema } from '@/server/db/migrate'

let pool: mysql.Pool | null = null

export function getPool() {
  if (pool) {
    return pool
  }

  pool = mysql.createPool({
    host: env.MYSQL_HOST,
    port: Number(env.MYSQL_PORT),
    user: env.MYSQL_USER,
    password: env.MYSQL_PASSWORD,
    database: env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    timezone: 'Z',
  })

  return pool
}

export async function withConnection<T>(
  fn: (connection: mysql.PoolConnection) => Promise<T>,
) {
  await ensureSchema()

  const connection = await getPool().getConnection()

  try {
    return await fn(connection)
  } finally {
    connection.release()
  }
}

export async function closePool() {
  if (pool) {
    await pool.end()
    pool = null
  }
}

import type { RowDataPacket } from 'mysql2/promise'

import type { AppConfig } from '@/lib/config/schema'
import { withConnection } from '@/server/db/connection'

type ConfigRow = RowDataPacket & {
  config: AppConfig | string
}

export async function readAppConfigRaw(): Promise<AppConfig | null> {
  return withConnection(async (connection) => {
    const [rows] = await connection.query<ConfigRow[]>(
      `SELECT config FROM app_config WHERE id = 1`,
    )

    const row = rows[0]

    if (!row) {
      return null
    }

    if (typeof row.config === 'string') {
      return JSON.parse(row.config) as AppConfig
    }

    return row.config
  })
}

export async function upsertAppConfig(config: AppConfig) {
  await withConnection(async (connection) => {
    await connection.query(
      `INSERT INTO app_config (id, config) VALUES (1, ?)
       ON DUPLICATE KEY UPDATE config = VALUES(config)`,
      [JSON.stringify(config)],
    )
  })
}

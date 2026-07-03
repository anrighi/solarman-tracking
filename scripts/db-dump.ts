#!/usr/bin/env tsx

import { dumpDatabase } from '@/features/backup/service'
import { closePool } from '@/server/db/connection'

async function main() {
  const dump = await dumpDatabase()
  console.log(`[db:dump] creato ${dump.filePath}`)
  console.log(`[db:dump] config esportata in backups/app_config.json`)
  await closePool()
}

main().catch(async (error) => {
  console.error('[db:dump] errore:', error)
  await closePool()
  process.exit(1)
})

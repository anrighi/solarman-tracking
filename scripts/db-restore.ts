#!/usr/bin/env tsx

import { restoreDatabase } from '@/features/backup/service'
import { closePool } from '@/server/db/connection'

async function main() {
  const inputPath = process.argv[2]

  if (!inputPath) {
    console.error('Usage: pnpm run db:restore <path-to-backup.sql.gz>')
    process.exit(1)
  }

  await restoreDatabase(inputPath)
  console.log(`[db:restore] ripristino completato da ${inputPath}`)
  await closePool()
}

main().catch(async (error) => {
  console.error('[db:restore] errore:', error)
  await closePool()
  process.exit(1)
})

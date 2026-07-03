#!/usr/bin/env tsx

import { runBackup } from '@/features/backup/service'
import { closePool } from '@/server/db/connection'

async function main() {
  const source = process.argv[2] === 'manual' ? 'manual' : 'scheduled'
  const result = await runBackup(source)

  if (result.error) {
    console.error(`[backup-run] errore: ${result.error}`)
    await closePool()
    return
  }

  if (result.run) {
    console.log(`[backup-run] completato: ${result.run.filename}`)
  }

  await closePool()
}

main().catch(async (error) => {
  console.error('[backup-run] crash:', error)
  await closePool()
  process.exit(1)
})

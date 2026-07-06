#!/usr/bin/env tsx

import { closePool } from '@/server/db/connection'
import { dedupeEnergySamples } from '@/server/db/dedupe-energy-samples'
import { getStationId } from '@/server/jobs/sync-solarman'

const allStations = process.argv.includes('--all')

async function main() {
  const stationId = allStations ? undefined : getStationId()
  const result = await dedupeEnergySamples(stationId)

  console.log(
    `[db:dedupe-samples] ${result.duplicatesRemoved} duplicati rimossi, ` +
      `${result.timestampsNormalized} timestamp normalizzati ` +
      `(${result.groupsProcessed} bucket unici)`,
  )

  await closePool()
}

main().catch(async (error) => {
  console.error('[db:dedupe-samples] errore:', error)
  await closePool()
  process.exit(1)
})

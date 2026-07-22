import {
  decodeDayGzip,
  emptyManifest,
  encodeDayGzip,
  parseManifest,
  payloadToInserts,
  samplesToPayload,
} from '@/features/archive/codec'
import { resolveDayState, countDayStates, manifestDaysForMonth } from '@/features/archive/day-status'
import {
  dayObjectKey,
  listDateKeysInMonth,
  manifestObjectKey,
  monthPrefix,
  parseDayKeyFromObjectKey,
} from '@/features/archive/paths'
import {
  getLatestArchiveRun,
  insertArchiveRun,
  listArchiveRuns,
} from '@/features/archive/repository'
import {
  checkArchiveS3Reachable,
  getObjectBuffer,
  getObjectText,
  isArchiveS3Configured,
  listObjectKeys,
  putObject,
} from '@/features/archive/s3-client'
import type {
  ArchiveDaysResult,
  ArchiveManifest,
  ArchiveMonthSummary,
  ArchiveRunStatus,
} from '@/features/archive/types'
import { mapEnergySampleRow } from '@/features/energy/mappers'
import { getConfig } from '@/lib/config/service'
import { utcDayBounds } from '@/lib/solarman/client'
import {
  countEnergySamplesByDay,
  getEnergySamples,
  upsertEnergySamples,
} from '@/server/db/energy-repository'
import type { EnergySampleInsert } from '@/server/db/schema'

const MAX_CONCURRENCY = 4

export async function loadManifest(stationId: number): Promise<ArchiveManifest> {
  const text = await getObjectText(manifestObjectKey(stationId))
  if (!text) {
    return emptyManifest(stationId)
  }

  return parseManifest(text, stationId)
}

export async function saveManifest(manifest: ArchiveManifest) {
  const next: ArchiveManifest = {
    ...manifest,
    updatedAt: new Date().toISOString(),
  }

  await putObject({
    key: manifestObjectKey(manifest.stationId),
    body: Buffer.from(JSON.stringify(next, null, 2), 'utf8'),
    contentType: 'application/json',
  })

  return next
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T) => Promise<R>,
) {
  const results: R[] = []
  let index = 0

  async function worker() {
    while (index < items.length) {
      const current = index
      index += 1
      results[current] = await mapper(items[current])
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  await Promise.all(workers)
  return results
}

function sortDateKeys(days: string[]) {
  return [...new Set(days)].sort()
}

async function ensureArchiveEnabled() {
  const config = await getConfig()
  if (!config.archive.enabled) {
    throw new Error('Archivio S3 disabilitato nelle impostazioni')
  }

  if (!isArchiveS3Configured()) {
    throw new Error('Credenziali Cubbit S3 non configurate')
  }
}

export async function getMonthArchiveStatus(input: {
  stationId: number
  year: number
  month: number
}): Promise<ArchiveMonthSummary> {
  const dateKeys = listDateKeysInMonth(input.year, input.month)
  const monthStart = dateKeys[0]
  const monthEnd = dateKeys[dateKeys.length - 1]
  const { from } = utcDayBounds(monthStart)
  const { to } = utcDayBounds(monthEnd)

  const localCounts = await countEnergySamplesByDay({
    stationId: input.stationId,
    from,
    to,
  })
  const localByDay = new Map(localCounts.map((row) => [row.day, row.count]))

  const s3Check = await checkArchiveS3Reachable()
  let manifest = emptyManifest(input.stationId)
  let s3Error = s3Check.error

  const listedWithoutMeta = new Set<string>()

  if (s3Check.configured && s3Check.reachable) {
    try {
      manifest = await loadManifest(input.stationId)
      const known = manifestDaysForMonth(manifest, dateKeys)
      const keys = await listObjectKeys(monthPrefix(input.stationId, input.year, input.month))

      for (const key of keys) {
        const dateKey = parseDayKeyFromObjectKey(key)
        if (!dateKey || known.has(dateKey) || manifest.days[dateKey]) {
          continue
        }

        listedWithoutMeta.add(dateKey)
      }
    } catch (error) {
      s3Error = error instanceof Error ? error.message : 'Errore lettura manifest'
    }
  }

  const days = dateKeys.map((date) => {
    const manifestDay = manifest.days[date] ?? null
    const s3Day =
      manifestDay ??
      (listedWithoutMeta.has(date)
        ? { rowCount: -1, contentHash: '', exportedAt: '' }
        : null)

    return resolveDayState({
      date,
      localCount: localByDay.get(date) ?? 0,
      s3Day,
    })
  })

  let latestRun = null

  try {
    latestRun = await getLatestArchiveRun(input.stationId)
  } catch {
    latestRun = null
  }

  return {
    stationId: input.stationId,
    year: input.year,
    month: input.month,
    s3Configured: s3Check.configured,
    s3Reachable: s3Check.reachable,
    s3Error,
    days,
    counts: countDayStates(days),
    latestRun,
  }
}

async function loadDaySamplesFromDb(stationId: number, dateKey: string) {
  const { from, to } = utcDayBounds(dateKey)
  const rows = await getEnergySamples({ stationId, from, to })

  return rows.map((row) => {
    const mapped = mapEnergySampleRow(row)
    return {
      stationId,
      recordedAt: new Date(mapped.recordedAt),
      productionW: mapped.productionW,
      consumptionW: mapped.consumptionW,
      batterySoc: mapped.batterySoc,
      batteryPowerW: mapped.batteryPowerW,
      gridImportW: mapped.gridImportW,
      gridExportW: mapped.gridExportW,
      batteryChargeW: mapped.batteryChargeW,
      batteryDischargeW: mapped.batteryDischargeW,
      irradiance: mapped.irradiance,
    } satisfies EnergySampleInsert
  })
}

export async function exportDaysToArchive(input: {
  stationId: number
  days: string[]
}): Promise<ArchiveDaysResult> {
  await ensureArchiveEnabled()

  const days = sortDateKeys(input.days)
  if (days.length === 0) {
    throw new Error('Nessun giorno selezionato')
  }

  const manifest = await loadManifest(input.stationId)
  let rowsAffected = 0
  let daysProcessed = 0
  const errors: string[] = []

  await mapWithConcurrency(days, MAX_CONCURRENCY, async (dateKey) => {
    try {
      const samples = await loadDaySamplesFromDb(input.stationId, dateKey)
      if (samples.length === 0) {
        errors.push(`${dateKey}: nessun campione locale`)
        return
      }

      const payload = samplesToPayload(samples)
      const encoded = encodeDayGzip(payload)

      await putObject({
        key: dayObjectKey(input.stationId, dateKey),
        body: encoded.buffer,
        contentType: 'application/json',
        contentEncoding: 'gzip',
      })

      manifest.days[dateKey] = {
        rowCount: encoded.rowCount,
        contentHash: encoded.contentHash,
        exportedAt: new Date().toISOString(),
      }
      rowsAffected += encoded.rowCount
      daysProcessed += 1
    } catch (error) {
      const message = error instanceof Error ? error.message : 'errore export'
      errors.push(`${dateKey}: ${message}`)
    }
  })

  if (daysProcessed > 0) {
    await saveManifest(manifest)
  }

  const status: ArchiveRunStatus =
    daysProcessed === 0 ? 'failed' : errors.length > 0 ? 'partial' : 'success'

  const run = await insertArchiveRun({
    stationId: input.stationId,
    direction: 'export',
    dayFrom: days[0],
    dayTo: days[days.length - 1],
    daysCount: daysProcessed,
    rowsAffected,
    status,
    errorMessage: errors.length > 0 ? errors.join('; ') : null,
  })

  return {
    daysProcessed,
    rowsAffected,
    status,
    errorMessage: errors.length > 0 ? errors.join('; ') : undefined,
    run,
  }
}

export async function hydrateDaysFromArchive(input: {
  stationId: number
  days: string[]
}): Promise<ArchiveDaysResult> {
  await ensureArchiveEnabled()

  const days = sortDateKeys(input.days)
  if (days.length === 0) {
    throw new Error('Nessun giorno selezionato')
  }

  let rowsAffected = 0
  let daysProcessed = 0
  const errors: string[] = []

  await mapWithConcurrency(days, MAX_CONCURRENCY, async (dateKey) => {
    try {
      const buffer = await getObjectBuffer(dayObjectKey(input.stationId, dateKey))
      if (!buffer) {
        errors.push(`${dateKey}: oggetto S3 assente`)
        return
      }

      const payload = decodeDayGzip(buffer)
      const inserts = payloadToInserts(input.stationId, payload)
      if (inserts.length === 0) {
        errors.push(`${dateKey}: file vuoto`)
        return
      }

      const affected = await upsertEnergySamples(inserts)
      rowsAffected += affected
      daysProcessed += 1
    } catch (error) {
      const message = error instanceof Error ? error.message : 'errore hydrate'
      errors.push(`${dateKey}: ${message}`)
    }
  })

  const status: ArchiveRunStatus =
    daysProcessed === 0 ? 'failed' : errors.length > 0 ? 'partial' : 'success'

  const run = await insertArchiveRun({
    stationId: input.stationId,
    direction: 'hydrate',
    dayFrom: days[0],
    dayTo: days[days.length - 1],
    daysCount: daysProcessed,
    rowsAffected,
    status,
    errorMessage: errors.length > 0 ? errors.join('; ') : null,
  })

  return {
    daysProcessed,
    rowsAffected,
    status,
    errorMessage: errors.length > 0 ? errors.join('; ') : undefined,
    run,
  }
}

export async function getArchivedSamples(input: {
  stationId: number
  from: string
  to: string
}) {
  const days: string[] = []
  const cursor = new Date(`${input.from}T00:00:00.000Z`)
  const end = new Date(`${input.to}T00:00:00.000Z`)

  while (cursor <= end) {
    days.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  const batches = await mapWithConcurrency(days, MAX_CONCURRENCY, async (dateKey) => {
    const buffer = await getObjectBuffer(dayObjectKey(input.stationId, dateKey))
    if (!buffer) {
      return [] as EnergySampleInsert[]
    }

    return payloadToInserts(input.stationId, decodeDayGzip(buffer))
  })

  return batches.flat().sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime())
}

export async function listRecentArchiveRuns(stationId: number) {
  return listArchiveRuns(stationId, 20)
}

import { getConfig } from '@/lib/config/service'
import {
  addDays,
  formatDay,
  mapHistoryItemsToSamples,
  SolarmanClient,
} from '@/lib/solarman/client'
import type { SolarmanClientConfig } from '@/lib/solarman/types'
import { env } from '@/lib/env'
import {
  getBackfillCheckpoint,
  recordBackfillGap,
  upsertBackfillCheckpoint,
} from '@/server/db/backfill-repository'
import {
  saveRawPayload,
  upsertEnergySamples,
} from '@/server/db/energy-repository'
import { getStationId, isSolarmanConfigured } from '@/server/jobs/sync-solarman'

export type BackfillResult = {
  inserted: number
  daysProcessed: number
  stoppedReason: 'empty_streak' | 'no_credentials' | 'completed_batch'
  message: string
}

function createSolarmanClient(stationId: number) {
  const config: SolarmanClientConfig = {
    apiUrl: env.SOLARMAN_API_URL ?? 'https://globalapi.solarmanpv.com',
    appId: env.SOLARMAN_APP_ID!,
    appSecret: env.SOLARMAN_APP_SECRET!,
    email: env.SOLARMAN_EMAIL!,
    password: env.SOLARMAN_PASSWORD!,
    stationId,
  }

  return new SolarmanClient(config)
}

export function isDayCovered(
  day: Date,
  checkpoint: {
    first_data_at: Date | null
    last_synced_at: Date | null
    no_data_before: Date | null
  } | null,
) {
  if (!checkpoint) {
    return false
  }

  const dayStart = startOfUtcDay(day)

  if (checkpoint.no_data_before && dayStart < startOfUtcDay(checkpoint.no_data_before)) {
    return true
  }

  if (!checkpoint.first_data_at || !checkpoint.last_synced_at) {
    return false
  }

  const first = startOfUtcDay(checkpoint.first_data_at)
  const last = startOfUtcDay(checkpoint.last_synced_at)

  return dayStart >= first && dayStart <= last
}

export async function runCheckpointBackfill(options?: {
  maxDays?: number
}): Promise<BackfillResult> {
  if (!isSolarmanConfigured()) {
    return {
      inserted: 0,
      daysProcessed: 0,
      stoppedReason: 'no_credentials',
      message: 'Credenziali Solarman mancanti — backfill non disponibile',
    }
  }

  const stationId = getStationId()
  const config = await getConfig()
  const client = createSolarmanClient(stationId)
  const checkpoint = await getBackfillCheckpoint(stationId)
  let localCheckpoint = checkpoint
    ? {
        first_data_at: checkpoint.first_data_at,
        last_synced_at: checkpoint.last_synced_at,
        no_data_before: checkpoint.no_data_before,
      }
    : null
  const maxDays = options?.maxDays ?? 365
  const now = new Date()

  let inserted = 0
  let daysProcessed = 0
  let emptyStreak = 0
  let offset = 0

  while (offset < maxDays) {
    const day = addDays(now, -offset)
    const dayStart = startOfUtcDay(day)

    if (isDayCovered(day, localCheckpoint)) {
      offset += 1
      continue
    }

    const dayStr = formatDay(day)
    const history = await client.getHistoryFrame(dayStr)

    await saveRawPayload({
      source: 'history-frame',
      stationId,
      fetchedAt: now,
      payload: history,
    })

    const samples = mapHistoryItemsToSamples({
      stationId,
      items: history.stationDataItems ?? [],
    })

    daysProcessed += 1

    if (samples.length === 0) {
      emptyStreak += 1

      if (emptyStreak >= config.backfill.maxConsecutiveEmptyDays) {
        await upsertBackfillCheckpoint({
          stationId,
          noDataBefore: dayStart,
        })

        return {
          inserted,
          daysProcessed,
          stoppedReason: 'empty_streak',
          message: `Backfill fermato: ${emptyStreak} giorni vuoti consecutivi`,
        }
      }

      offset += 1
      continue
    }

    emptyStreak = 0
    inserted += await upsertEnergySamples(samples)

    const sampleDates = samples.map((sample) => sample.recordedAt)
    const earliest = new Date(Math.min(...sampleDates.map((date) => date.getTime())))
    const latest = new Date(Math.max(...sampleDates.map((date) => date.getTime())))

    const currentFirst = localCheckpoint?.first_data_at ?? null
    const newFirst =
      !currentFirst || earliest < currentFirst ? earliest : currentFirst

    await upsertBackfillCheckpoint({
      stationId,
      firstDataAt: newFirst,
      lastSyncedAt: latest,
    })

    localCheckpoint = {
      first_data_at: newFirst,
      last_synced_at: latest,
      no_data_before: localCheckpoint?.no_data_before ?? null,
    }

    offset += 1
  }

  return {
    inserted,
    daysProcessed,
    stoppedReason: 'completed_batch',
    message: `Backfill batch completato (${daysProcessed} giorni, ${inserted} righe)`,
  }
}

export async function detectAndRecordGaps(stationId: number) {
  const checkpoint = await getBackfillCheckpoint(stationId)

  if (!checkpoint?.first_data_at || !checkpoint.last_synced_at) {
    return
  }

  const gapStart = addDays(checkpoint.last_synced_at, 1)
  const gapEnd = new Date()

  if (gapStart >= gapEnd) {
    return
  }

  await recordBackfillGap({
    stationId,
    gapStart,
    gapEnd,
    status: 'open',
  })
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

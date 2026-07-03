import { env } from '@/lib/env'
import { getConfig } from '@/lib/config/service'
import {
  SolarmanClient,
  addDays,
  formatDay,
  mapHistoryItemsToSamples,
  mapRealtimeToSample,
} from '@/lib/solarman/client'
import type { SolarmanClientConfig } from '@/lib/solarman/types'
import {
  countEnergySamples,
  getSyncState,
  saveRawPayload,
  updateSyncState,
  upsertEnergySamples,
} from '@/server/db/energy-repository'

const JOB_NAME = 'solarman-minute-sync'

type SyncResult = {
  inserted: number
  mode: 'live' | 'mock'
  message: string
}

function hasSolarmanCredentials() {
  return Boolean(
    env.SOLARMAN_APP_ID &&
      env.SOLARMAN_APP_SECRET &&
      env.SOLARMAN_EMAIL &&
      env.SOLARMAN_PASSWORD,
  )
}

export function isSolarmanConfigured() {
  return Boolean(hasSolarmanCredentials() && env.SOLARMAN_STATION_ID)
}

export function getStationId() {
  if (isSolarmanConfigured()) {
    return Number(env.SOLARMAN_STATION_ID)
  }

  return 1
}

function createSolarmanClient(stationId?: number) {
  if (!hasSolarmanCredentials()) {
    throw new Error('Credenziali Solarman mancanti')
  }

  const config: SolarmanClientConfig = {
    apiUrl: env.SOLARMAN_API_URL ?? 'https://globalapi.solarmanpv.com',
    appId: env.SOLARMAN_APP_ID!,
    appSecret: env.SOLARMAN_APP_SECRET!,
    email: env.SOLARMAN_EMAIL!,
    password: env.SOLARMAN_PASSWORD!,
    stationId: stationId ?? Number(env.SOLARMAN_STATION_ID ?? 0),
  }

  return new SolarmanClient(config)
}

export async function syncSolarmanMinute(options?: {
  backfillDays?: number
  startOffset?: number
  includeRealtime?: boolean
}): Promise<SyncResult> {
  const stationId = getStationId()
  const now = new Date()

  await updateSyncState({
    jobName: JOB_NAME,
    lastRunAt: now,
    lastStatus: 'running',
    lastError: null,
  })

  try {
    if (!hasSolarmanCredentials()) {
      const inserted = await seedMockSamples(stationId)
      await updateSyncState({
        jobName: JOB_NAME,
        watermarkAt: now,
        lastRunAt: now,
        lastStatus: 'success',
        lastError: null,
      })

      return {
        inserted,
        mode: 'mock' as const,
        message: 'Dati demo generati (configura Solarman in .env per dati reali)',
      }
    }

    const client = createSolarmanClient()
    let inserted = 0
    const appConfig = await getConfig()
    const includeRealtime = options?.includeRealtime ?? appConfig.sync.includeRealtime

    if (includeRealtime) {
      const realtime = await client.getRealtimeData()
      await saveRawPayload({
        source: 'realtime',
        stationId,
        fetchedAt: now,
        payload: realtime,
      })

      const realtimeSample = mapRealtimeToSample({
        stationId,
        payload: realtime,
        fallbackAt: now,
      })

      if (realtimeSample) {
        inserted += await upsertEnergySamples([realtimeSample])
      }
    }

    const backfillDays = options?.backfillDays ?? 1
    const startOffset = options?.startOffset ?? 0

    for (let offset = startOffset; offset < startOffset + backfillDays; offset += 1) {
      const day = formatDay(addDays(now, -offset))
      const history = await client.getHistoryFrame(day)

      await saveRawPayload({
        source: 'history-frame',
        stationId,
        fetchedAt: now,
        payload: history,
      })

      const historySamples = mapHistoryItemsToSamples({
        stationId,
        items: history.stationDataItems ?? [],
      })

      if (historySamples.length > 0) {
        inserted += await upsertEnergySamples(historySamples)
      }
    }

    await updateSyncState({
      jobName: JOB_NAME,
      watermarkAt: now,
      lastRunAt: now,
      lastStatus: 'success',
      lastError: null,
    })

    return {
      inserted,
      mode: 'live' as const,
      message: `Sync completata (${inserted} righe elaborate)`,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Errore sync sconosciuto'

    await updateSyncState({
      jobName: JOB_NAME,
      lastRunAt: now,
      lastStatus: 'error',
      lastError: message,
    })

    throw error
  }
}

export async function getSyncSummary() {
  const stationId = getStationId()
  const syncState = await getSyncState(JOB_NAME)
  const sampleCount = await countEnergySamples(stationId)

  return {
    lastRunAt: syncState?.last_run_at?.toISOString() ?? null,
    lastStatus: syncState?.last_status ?? 'idle',
    lastError: syncState?.last_error ?? null,
    sampleCount,
    isMock: !isSolarmanConfigured(),
  }
}

async function seedMockSamples(stationId: number) {
  const existing = await countEnergySamples(stationId)

  if (existing > 0) {
    const now = new Date()
    const sample = buildMockSample(stationId, now)
    return upsertEnergySamples([sample])
  }

  const samples = []
  const now = new Date()

  for (let minutesAgo = 24 * 60; minutesAgo >= 0; minutesAgo -= 5) {
    const recordedAt = new Date(now.getTime() - minutesAgo * 60_000)
    samples.push(buildMockSample(stationId, recordedAt))
  }

  return upsertEnergySamples(samples)
}

function buildMockSample(stationId: number, recordedAt: Date) {
  const hour = recordedAt.getUTCHours() + recordedAt.getUTCMinutes() / 60
  const daylight = Math.max(0, Math.sin(((hour - 6) / 12) * Math.PI))
  const productionW = Math.round(daylight * 4200 + Math.random() * 200)
  const consumptionW = Math.round(900 + Math.random() * 600)
  const batterySoc = Math.round(35 + daylight * 45 + Math.random() * 5)
  const surplus = productionW - consumptionW

  let gridImportW = 0
  let gridExportW = 0
  let batteryChargeW = 0
  let batteryDischargeW = 0

  if (surplus > 0) {
    batteryChargeW = Math.round(surplus * 0.6)
    gridExportW = Math.max(0, surplus - batteryChargeW)
  }

  if (surplus < 0) {
    const deficit = Math.abs(surplus)
    batteryDischargeW = Math.round(deficit * 0.5)
    gridImportW = Math.max(0, deficit - batteryDischargeW)
  }

  const batteryPowerW = batteryChargeW > 0 ? batteryChargeW : -batteryDischargeW

  return {
    stationId,
    recordedAt,
    productionW,
    consumptionW,
    batterySoc,
    batteryPowerW,
    gridImportW: gridImportW > 0 ? gridImportW : null,
    gridExportW: gridExportW > 0 ? gridExportW : null,
    batteryChargeW: batteryChargeW > 0 ? batteryChargeW : null,
    batteryDischargeW: batteryDischargeW > 0 ? batteryDischargeW : null,
    irradiance: daylight > 0 ? Math.round(daylight * 900 + Math.random() * 50) : null,
  }
}

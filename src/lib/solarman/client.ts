import { createHash } from 'node:crypto'

import { normalizeStationPowerFields } from '@/lib/solarman/normalize'
import { normalizeToSampleBucket } from '@/lib/solarman/sample-timestamp'
import type {
  SolarmanClientConfig,
  SolarmanDailyEnergy,
  SolarmanHistoryItem,
  SolarmanHistoryResponse,
  SolarmanRealtimeResponse,
  SolarmanTokenResponse,
} from '@/lib/solarman/types'
import type { EnergySampleInsert } from '@/server/db/schema'

const TOKEN_REFRESH_MARGIN_MS = 5 * 60 * 1000

type CachedToken = {
  accessToken: string
  expiresAt: number
}

export class SolarmanClient {
  private tokenCache: CachedToken | null = null

  constructor(private readonly config: SolarmanClientConfig) {}

  async getRealtimeData() {
    return this.post<SolarmanRealtimeResponse>(
      '/station/v1.0/realTime',
      { stationId: this.config.stationId },
    )
  }

  async getHistoryFrame(day: string) {
    return this.post<SolarmanHistoryResponse>('/station/v1.0/history', {
      stationId: this.config.stationId,
      timeType: 1,
      startTime: day,
    })
  }

  async getHistoryDay(startDay: string, endDay: string) {
    return this.post<SolarmanHistoryResponse>('/station/v1.0/history', {
      stationId: this.config.stationId,
      timeType: 2,
      startTime: startDay,
      endTime: endDay,
    })
  }

  private async post<T>(path: string, body: Record<string, unknown>) {
    const token = await this.getAccessToken()
    const url = new URL(path, this.config.apiUrl)
    url.searchParams.set('appId', this.config.appId)
    url.searchParams.set('language', 'en')

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`Solarman API ${path} ha risposto ${response.status}`)
    }

    const payload = (await response.json()) as T & { success?: boolean; msg?: string | null }

    if (!payload.success) {
      throw new Error(payload.msg ?? `Solarman API ${path} non riuscita`)
    }

    return payload
  }

  private async getAccessToken() {
    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt) {
      return this.tokenCache.accessToken
    }

    const url = new URL('/account/v1.0/token', this.config.apiUrl)
    url.searchParams.set('appId', this.config.appId)
    url.searchParams.set('language', 'en')

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appSecret: this.config.appSecret,
        email: this.config.email,
        password: hashPassword(this.config.password),
      }),
    })

    if (!response.ok) {
      throw new Error(`Autenticazione Solarman fallita (${response.status})`)
    }

    const payload = (await response.json()) as SolarmanTokenResponse

    if (!payload.success || !payload.access_token) {
      throw new Error(payload.msg ?? 'Token Solarman non disponibile')
    }

    const expiresInMs = Number(payload.expires_in ?? 3_600) * 1000

    this.tokenCache = {
      accessToken: payload.access_token,
      expiresAt: Date.now() + expiresInMs - TOKEN_REFRESH_MARGIN_MS,
    }

    return payload.access_token
  }
}

export function hashPassword(password: string) {
  if (/^[a-f0-9]{64}$/i.test(password)) {
    return password
  }

  return createHash('sha256').update(password).digest('hex')
}

export function mapRealtimeToSample(input: {
  stationId: number
  payload: SolarmanRealtimeResponse
  fallbackAt?: Date
}): EnergySampleInsert | null {
  const recordedAt = resolveTimestamp(input.payload.lastUpdateTime, input.fallbackAt)

  if (!recordedAt) {
    return null
  }

  const stationFields = normalizeStationPowerFields(input.payload)

  return {
    stationId: input.stationId,
    recordedAt: normalizeToSampleBucket(recordedAt),
    productionW: input.payload.generationPower ?? null,
    consumptionW: input.payload.usePower ?? null,
    batterySoc: input.payload.batterySoc ?? null,
    batteryPowerW: input.payload.batteryPower ?? null,
    ...stationFields,
  }
}

export function mapHistoryItemsToSamples(input: {
  stationId: number
  items: SolarmanHistoryItem[]
}): EnergySampleInsert[] {
  return input.items
    .map((item) => {
      const recordedAt = resolveHistoryTimestamp(item)

      if (!recordedAt) {
        return null
      }

      const stationFields = normalizeStationPowerFields(item)

      return {
        stationId: input.stationId,
        recordedAt: normalizeToSampleBucket(recordedAt),
        productionW: item.generationPower ?? null,
        consumptionW: item.usePower ?? null,
        batterySoc: item.batterySoc ?? null,
        batteryPowerW: item.batteryPower ?? null,
        ...stationFields,
      }
    })
    .filter((sample): sample is EnergySampleInsert => sample !== null)
}

function resolveTimestamp(
  lastUpdateTime: number | null | undefined,
  fallbackAt?: Date,
) {
  if (lastUpdateTime) {
    const millis = lastUpdateTime > 1_000_000_000_000 ? lastUpdateTime : lastUpdateTime * 1000
    return new Date(millis)
  }

  return fallbackAt ?? null
}

function resolveHistoryTimestamp(item: SolarmanHistoryItem) {
  if (item.dateTime !== null && item.dateTime !== undefined) {
    if (typeof item.dateTime === 'number') {
      return resolveTimestamp(item.dateTime)
    }

    const parsed = new Date(item.dateTime)

    if (!Number.isNaN(parsed.getTime())) {
      return parsed
    }
  }

  if (!item.year || !item.month || !item.day) {
    return null
  }

  return new Date(Date.UTC(item.year, item.month - 1, item.day, 12, 0, 0))
}

export function kwhToWh(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return 0
  }

  return value * 1000
}

export function formatDayKey(year: number, month: number, day: number) {
  const monthStr = String(month).padStart(2, '0')
  const dayStr = String(day).padStart(2, '0')
  return `${year}-${monthStr}-${dayStr}`
}

export function mapDailyEnergyItem(item: SolarmanHistoryItem): SolarmanDailyEnergy | null {
  if (!item.year || !item.month || !item.day) {
    return null
  }

  return {
    date: formatDayKey(item.year, item.month, item.day),
    producedKwh: item.generationValue ?? 0,
    consumedKwh: item.useValue ?? 0,
    importedKwh: item.buyValue ?? 0,
    exportedKwh: item.gridValue ?? 0,
  }
}

export function mapDailyEnergyItems(items: SolarmanHistoryItem[]) {
  return items
    .map(mapDailyEnergyItem)
    .filter((entry): entry is SolarmanDailyEnergy => entry !== null)
}

export function formatDay(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

export function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

export function utcDayBounds(dateKey: string) {
  const day = startOfUtcDay(new Date(`${dateKey}T00:00:00.000Z`))
  const end = new Date(day.getTime() + 24 * 60 * 60 * 1000 - 1)
  return { from: day, to: end }
}

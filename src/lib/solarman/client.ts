import { createHash } from 'node:crypto'

import type {
  SolarmanClientConfig,
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

  return {
    stationId: input.stationId,
    recordedAt,
    produzioneW: input.payload.generationPower ?? null,
    consumoW: input.payload.usePower ?? null,
    batterySoc: input.payload.batterySoc ?? null,
    batteryPowerW: input.payload.batteryPower ?? null,
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

      return {
        stationId: input.stationId,
        recordedAt,
        produzioneW: item.generationPower ?? null,
        consumoW: item.usePower ?? null,
        batterySoc: item.batterySoc ?? null,
        batteryPowerW: item.batteryPower ?? null,
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

export function formatDay(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

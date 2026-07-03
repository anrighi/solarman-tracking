import { describe, expect, it } from 'vitest'

import {
  hashPassword,
  mapHistoryItemsToSamples,
  mapRealtimeToSample,
} from '@/lib/solarman/client'

describe('hashPassword', () => {
  it('mantiene password già hashate', () => {
    const hashed = 'a'.repeat(64)
    expect(hashPassword(hashed)).toBe(hashed)
  })

  it('applica sha256 alle password in chiaro', () => {
    expect(hashPassword('test')).toBe(
      '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    )
  })
})

describe('mapRealtimeToSample', () => {
  it('mappa i campi realtime', () => {
    const sample = mapRealtimeToSample({
      stationId: 42,
      payload: {
        success: true,
        generationPower: 1200,
        usePower: 800,
        batterySoc: 55,
        batteryPower: 400,
        lastUpdateTime: 1_700_000_000,
      },
    })

    expect(sample).toMatchObject({
      stationId: 42,
      produzioneW: 1200,
      consumoW: 800,
      batterySoc: 55,
      batteryPowerW: 400,
    })
    expect(sample?.recordedAt).toBeInstanceOf(Date)
  })
})

describe('mapHistoryItemsToSamples', () => {
  it('usa dateTime quando presente', () => {
    const [sample] = mapHistoryItemsToSamples({
      stationId: 7,
      items: [
        {
          dateTime: '2024-06-01T10:15:00.000Z',
          generationPower: 500,
          usePower: 300,
          batterySoc: 40,
          batteryPower: 200,
        },
      ],
    })

    expect(sample?.produzioneW).toBe(500)
    expect(sample?.recordedAt.toISOString()).toBe('2024-06-01T10:15:00.000Z')
  })

  it('usa dateTime numerico come unix seconds', () => {
    const [sample] = mapHistoryItemsToSamples({
      stationId: 7,
      items: [
        {
          dateTime: 1782856800,
          generationPower: 500,
          usePower: 300,
          batterySoc: 40,
          batteryPower: 200,
        },
      ],
    })

    expect(sample?.recordedAt.toISOString()).toBe('2026-06-30T22:00:00.000Z')
  })

  it('ignora righe senza timestamp', () => {
    const samples = mapHistoryItemsToSamples({
      stationId: 7,
      items: [{ generationPower: 100 }],
    })

    expect(samples).toHaveLength(0)
  })
})

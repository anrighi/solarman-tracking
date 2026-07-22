import { describe, expect, it } from 'vitest'

import {
  contentHashForPayload,
  decodeDayGzip,
  encodeDayGzip,
  emptyManifest,
  parseManifest,
  payloadToInserts,
  samplesToPayload,
} from '@/features/archive/codec'
import { countDayStates, resolveDayState } from '@/features/archive/day-status'
import {
  dayObjectKey,
  listDateKeysInMonth,
  manifestObjectKey,
  parseDayKeyFromObjectKey,
} from '@/features/archive/paths'
import type { EnergySampleInsert } from '@/server/db/schema'

describe('archive paths', () => {
  it('builds day and manifest keys', () => {
    expect(dayObjectKey(42, '2026-07-22')).toBe(
      'archive/station/42/2026/07/22.json.gz',
    )
    expect(manifestObjectKey(42)).toBe('archive/station/42/manifest.json')
  })

  it('parses day key from object key', () => {
    expect(parseDayKeyFromObjectKey('archive/station/1/2026/03/05.json.gz')).toBe(
      '2026-03-05',
    )
    expect(parseDayKeyFromObjectKey('archive/station/1/manifest.json')).toBeNull()
  })

  it('lists date keys for a month', () => {
    const keys = listDateKeysInMonth(2026, 2)
    expect(keys[0]).toBe('2026-02-01')
    expect(keys[keys.length - 1]).toBe('2026-02-28')
    expect(keys).toHaveLength(28)
  })
})

describe('archive codec', () => {
  const sample: EnergySampleInsert = {
    stationId: 1,
    recordedAt: new Date('2026-07-22T10:00:00.000Z'),
    productionW: 100,
    consumptionW: 50,
    batterySoc: 80,
    batteryPowerW: -20,
    gridImportW: 0,
    gridExportW: 30,
    batteryChargeW: 0,
    batteryDischargeW: 20,
    irradiance: 400,
  }

  it('round-trips gzip jsonl', () => {
    const payload = samplesToPayload([sample])
    const encoded = encodeDayGzip(payload)
    const decoded = decodeDayGzip(encoded.buffer)

    expect(decoded).toEqual(payload)
    expect(encoded.rowCount).toBe(1)
    expect(encoded.contentHash).toBe(contentHashForPayload(payload))
  })

  it('maps payload back to inserts', () => {
    const inserts = payloadToInserts(9, samplesToPayload([sample]))
    expect(inserts[0]?.stationId).toBe(9)
    expect(inserts[0]?.recordedAt.toISOString()).toBe(sample.recordedAt.toISOString())
  })

  it('parses manifest with defaults', () => {
    const manifest = parseManifest('{}', 7)
    expect(manifest.stationId).toBe(7)
    expect(manifest.days).toEqual({})
    expect(emptyManifest(7).stationId).toBe(7)
  })
})

describe('archive day status', () => {
  const now = new Date('2026-07-22T12:00:00.000Z')

  it('marks missing, localOnly, s3Only, synced, mismatch', () => {
    expect(
      resolveDayState({ date: '2026-07-20', localCount: 0, s3Day: null, now }).state,
    ).toBe('missing')

    expect(
      resolveDayState({ date: '2026-07-20', localCount: 288, s3Day: null, now }).state,
    ).toBe('localOnly')

    expect(
      resolveDayState({
        date: '2026-07-20',
        localCount: 0,
        s3Day: { rowCount: 288, contentHash: 'a', exportedAt: now.toISOString() },
        now,
      }).state,
    ).toBe('s3Only')

    expect(
      resolveDayState({
        date: '2026-07-20',
        localCount: 288,
        s3Day: { rowCount: 288, contentHash: 'a', exportedAt: now.toISOString() },
        now,
      }).state,
    ).toBe('synced')

    expect(
      resolveDayState({
        date: '2026-07-20',
        localCount: 288,
        s3Day: { rowCount: 200, contentHash: 'a', exportedAt: now.toISOString() },
        now,
      }).state,
    ).toBe('mismatch')
  })

  it('marks partial when local coverage is low', () => {
    expect(
      resolveDayState({ date: '2026-07-20', localCount: 10, s3Day: null, now }).state,
    ).toBe('partial')
  })

  it('counts states', () => {
    const counts = countDayStates([
      resolveDayState({ date: '2026-07-20', localCount: 0, s3Day: null, now }),
      resolveDayState({ date: '2026-07-21', localCount: 288, s3Day: null, now }),
    ])
    expect(counts.missing).toBe(1)
    expect(counts.localOnly).toBe(1)
  })
})

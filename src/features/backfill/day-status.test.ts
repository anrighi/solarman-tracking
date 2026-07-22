import { describe, expect, it } from 'vitest'

import {
  countDayStates,
  dateKeysForMonth,
  dayOffsetFromToday,
  resolveBackfillDayStatus,
} from '@/features/backfill/day-status'

describe('resolveBackfillDayStatus', () => {
  const now = new Date('2026-07-22T15:00:00.000Z')

  it('marca assente senza campioni', () => {
    const status = resolveBackfillDayStatus({
      date: '2026-07-20',
      localCount: 0,
      now,
    })

    expect(status.state).toBe('missing')
    expect(status.expectedSamples).toBe(288)
  })

  it('marca parziale sotto la soglia', () => {
    const status = resolveBackfillDayStatus({
      date: '2026-07-20',
      localCount: 100,
      now,
    })

    expect(status.state).toBe('partial')
  })

  it('marca completo sopra la soglia', () => {
    const status = resolveBackfillDayStatus({
      date: '2026-07-20',
      localCount: 240,
      now,
    })

    expect(status.state).toBe('complete')
  })

  it('usa campioni attesi ridotti per oggi', () => {
    const status = resolveBackfillDayStatus({
      date: '2026-07-22',
      localCount: 50,
      now,
    })

    expect(status.expectedSamples).toBe(180)
    expect(status.state).toBe('partial')
  })
})

describe('countDayStates', () => {
  it('conta gli stati del mese', () => {
    const counts = countDayStates([
      {
        date: '2026-07-01',
        state: 'complete',
        localCount: 288,
        expectedSamples: 288,
      },
      {
        date: '2026-07-02',
        state: 'partial',
        localCount: 10,
        expectedSamples: 288,
      },
      {
        date: '2026-07-03',
        state: 'missing',
        localCount: 0,
        expectedSamples: 288,
      },
    ])

    expect(counts).toEqual({ complete: 1, partial: 1, missing: 1 })
  })
})

describe('dateKeysForMonth', () => {
  it('genera tutte le chiavi del mese', () => {
    const keys = dateKeysForMonth(2026, 2)
    expect(keys).toHaveLength(28)
    expect(keys[0]).toBe('2026-02-01')
    expect(keys[27]).toBe('2026-02-28')
  })
})

describe('dayOffsetFromToday', () => {
  it('calcola l offset in giorni UTC', () => {
    const now = new Date('2026-07-22T12:00:00.000Z')
    expect(dayOffsetFromToday('2026-07-22', now)).toBe(0)
    expect(dayOffsetFromToday('2026-07-20', now)).toBe(2)
  })
})

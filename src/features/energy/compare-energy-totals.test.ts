import { describe, expect, it } from 'vitest'

import {
  assessDayCoverage,
  buildDateRange,
  computeDeltaPct,
  dailyEnergyToWh,
  exceedsTolerance,
  expectedSamplesForDay,
  type CompareEnergyTotalsResult,
} from '@/features/energy/server/compare-energy-totals'

describe('buildDateRange', () => {
  it('restituisce gli ultimi N giorni in ordine cronologico', () => {
    const now = new Date('2026-07-06T15:00:00.000Z')
    expect(buildDateRange(3, now)).toEqual(['2026-07-04', '2026-07-05', '2026-07-06'])
  })
})

describe('expectedSamplesForDay', () => {
  it('usa 288 campioni per i giorni completi', () => {
    const now = new Date('2026-07-06T15:00:00.000Z')
    expect(expectedSamplesForDay('2026-07-05', now)).toBe(288)
  })

  it('scala i campioni attesi per il giorno corrente', () => {
    const now = new Date('2026-07-06T01:10:00.000Z')
    expect(expectedSamplesForDay('2026-07-06', now)).toBe(14)
  })
})

describe('assessDayCoverage', () => {
  it('considera sufficiente la copertura sopra l 80%', () => {
    const now = new Date('2026-07-06T15:00:00.000Z')
    const coverage = assessDayCoverage('2026-07-05', 240, now)

    expect(coverage.expectedSamples).toBe(288)
    expect(coverage.sufficient).toBe(true)
  })

  it('richiede backfill sotto la soglia', () => {
    const now = new Date('2026-07-06T15:00:00.000Z')
    const coverage = assessDayCoverage('2026-07-05', 100, now)

    expect(coverage.sufficient).toBe(false)
  })
})

describe('computeDeltaPct', () => {
  it('calcola la differenza percentuale', () => {
    expect(computeDeltaPct(1050, 1000)).toBeCloseTo(5)
    expect(computeDeltaPct(0, 0)).toBe(0)
    expect(computeDeltaPct(100, 0)).toBeNull()
  })
})

describe('dailyEnergyToWh', () => {
  it('converte i totali giornalieri in Wh', () => {
    expect(
      dailyEnergyToWh({
        producedKwh: 12.3,
        consumedKwh: 8.1,
        importedKwh: 1.2,
        exportedKwh: 4.5,
      }),
    ).toEqual({
      producedWh: 12300,
      consumedWh: 8100,
      importedWh: 1200,
      exportedWh: 4500,
    })
  })
})

describe('exceedsTolerance', () => {
  it('rileva delta oltre la tolleranza', () => {
    const result: CompareEnergyTotalsResult = {
      days: [
        {
          date: '2026-07-05',
          sampleCount: 288,
          expectedSamples: 288,
          minute: {
            producedWh: 11000,
            consumedWh: 8000,
            importedWh: 1000,
            exportedWh: 2000,
          },
          api: {
            producedWh: 10000,
            consumedWh: 8000,
            importedWh: 1000,
            exportedWh: 2000,
          },
          deltaPct: {
            produced: 10,
            consumed: 0,
            imported: 0,
            exported: 0,
          },
        },
      ],
      backfillRan: false,
      backfillInserted: 0,
      weekMinute: {
        producedWh: 11000,
        consumedWh: 8000,
        importedWh: 1000,
        exportedWh: 2000,
        selfConsumedWh: 9000,
      },
      weekApi: {
        producedWh: 10000,
        consumedWh: 8000,
        importedWh: 1000,
        exportedWh: 2000,
        selfConsumedWh: 8000,
      },
    }

    expect(exceedsTolerance(result)).toBe(true)
  })

  it('ignora i giorni senza dati API', () => {
    const result: CompareEnergyTotalsResult = {
      days: [
        {
          date: '2026-07-05',
          sampleCount: 288,
          expectedSamples: 288,
          minute: {
            producedWh: 11000,
            consumedWh: 8000,
            importedWh: 1000,
            exportedWh: 2000,
          },
          api: null,
          deltaPct: {
            produced: null,
            consumed: null,
            imported: null,
            exported: null,
          },
        },
      ],
      backfillRan: false,
      backfillInserted: 0,
      weekMinute: {
        producedWh: 11000,
        consumedWh: 8000,
        importedWh: 1000,
        exportedWh: 2000,
        selfConsumedWh: 9000,
      },
      weekApi: {
        producedWh: 0,
        consumedWh: 0,
        importedWh: 0,
        exportedWh: 0,
        selfConsumedWh: 0,
      },
    }

    expect(exceedsTolerance(result)).toBe(false)
  })
})

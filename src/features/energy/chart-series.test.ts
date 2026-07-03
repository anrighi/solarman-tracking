import { describe, expect, it } from 'vitest'

import {
  normalizeChartData,
  normalizeSeries,
  resolveSmoothWindow,
  smoothSeries,
} from '@/features/energy/chart-series'

describe('normalizeSeries', () => {
  it('maps values to 0-100 within the visible range', () => {
    expect(normalizeSeries([0, 50, 100])).toEqual([0, 50, 100])
    expect(normalizeSeries([10, 20, 30])).toEqual([0, 50, 100])
  })

  it('returns midpoint when all values are equal', () => {
    expect(normalizeSeries([42, 42, null])).toEqual([50, 50, null])
  })
})

describe('smoothSeries', () => {
  it('applies a moving average', () => {
    expect(smoothSeries([0, 0, 100, 100], 3)).toEqual([0, 33.333333333333336, 66.66666666666667, 100])
  })

  it('leaves values unchanged when window is 1', () => {
    expect(smoothSeries([1, 2, 3], 1)).toEqual([1, 2, 3])
  })
})

describe('resolveSmoothWindow', () => {
  it('uses wider windows for longer ranges', () => {
    expect(resolveSmoothWindow(8)).toBe(1)
    expect(resolveSmoothWindow(24)).toBe(3)
    expect(resolveSmoothWindow(120)).toBe(5)
  })
})

describe('normalizeChartData', () => {
  it('normalizes each series independently', () => {
    const result = normalizeChartData(
      [
        {
          time: '08:00',
          production: 0,
          consumption: 100,
          soc: 20,
          batteryPower: -50,
          gridImport: 0,
          gridExport: 0,
        },
        {
          time: '09:00',
          production: 100,
          consumption: 200,
          soc: 80,
          batteryPower: 50,
          gridImport: 10,
          gridExport: 20,
        },
      ],
      1,
    )

    expect(result[0]?.production).toBe(0)
    expect(result[1]?.production).toBe(100)
    expect(result[0]?.consumption).toBe(0)
    expect(result[1]?.consumption).toBe(100)
    expect(result[0]?.soc).toBe(0)
    expect(result[1]?.soc).toBe(100)
  })
})

import { describe, expect, it } from 'vitest'

import { computeBatteryStats } from '@/features/energy/battery-stats'
import type { EnergySample } from '@/features/energy/types'

const emptyGridFields = {
  gridImportW: null,
  gridExportW: null,
  batteryChargeW: null,
  batteryDischargeW: null,
  irradiance: null,
} as const

describe('computeBatteryStats', () => {
  const samples: EnergySample[] = [
    {
      recordedAt: '2026-07-03T10:00:00Z',
      productionW: 1000,
      consumptionW: 500,
      batterySoc: 40,
      batteryPowerW: 500,
      ...emptyGridFields,
    },
    {
      recordedAt: '2026-07-03T10:05:00Z',
      productionW: 800,
      consumptionW: 600,
      batterySoc: 60,
      batteryPowerW: -200,
      ...emptyGridFields,
    },
  ]

  it('computes SOC min/max/avg', () => {
    const stats = computeBatteryStats(samples)
    expect(stats.socMin).toBe(40)
    expect(stats.socMax).toBe(60)
    expect(stats.socAvg).toBe(50)
  })

  it('integrates battery power into energy', () => {
    const stats = computeBatteryStats(samples)
    expect(stats.energyChargedWh).toBeCloseTo(41.67, 1)
    expect(stats.energyDischargedWh).toBeCloseTo(16.67, 1)
  })

  it('prefers explicit charge and discharge fields', () => {
    const stats = computeBatteryStats([
      {
        recordedAt: '2026-07-03T10:00:00Z',
        productionW: 0,
        consumptionW: 500,
        batterySoc: 50,
        batteryPowerW: 300,
        gridImportW: 200,
        gridExportW: null,
        batteryChargeW: null,
        batteryDischargeW: 300,
        irradiance: null,
      },
    ])

    expect(stats.energyChargedWh).toBe(0)
    expect(stats.energyDischargedWh).toBe(25)
  })
})

import { describe, expect, it } from 'vitest'

import { normalizeStationPowerFields } from '@/lib/solarman/normalize'

describe('normalizeStationPowerFields', () => {
  it('normalizes negative purchasePower as grid import', () => {
    const result = normalizeStationPowerFields({
      purchasePower: -678,
      gridPower: null,
      wirePower: -678,
    })

    expect(result.gridImportW).toBe(678)
    expect(result.gridExportW).toBeNull()
  })

  it('uses wirePower for export when gridPower is absent', () => {
    const result = normalizeStationPowerFields({
      purchasePower: null,
      gridPower: null,
      wirePower: 450,
    })

    expect(result.gridImportW).toBeNull()
    expect(result.gridExportW).toBe(450)
  })

  it('prefers purchasePower over wirePower for import', () => {
    const result = normalizeStationPowerFields({
      purchasePower: 300,
      wirePower: 450,
    })

    expect(result.gridImportW).toBe(300)
    expect(result.gridExportW).toBe(450)
  })

  it('normalizes battery charge and discharge to positive watts', () => {
    const result = normalizeStationPowerFields({
      chargePower: -400,
      dischargePower: 598,
    })

    expect(result.batteryChargeW).toBe(400)
    expect(result.batteryDischargeW).toBe(598)
  })

  it('passes through irradiance', () => {
    const result = normalizeStationPowerFields({
      irradiateIntensity: 236.18,
    })

    expect(result.irradiance).toBe(236.18)
  })
})

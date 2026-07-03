import type { EnergySample } from '@/features/energy/types'

export type BatteryStats = {
  socMin: number | null
  socMax: number | null
  socAvg: number | null
  energyChargedWh: number
  energyDischargedWh: number
}

const SAMPLE_INTERVAL_MINUTES = 5

export function computeBatteryStats(samples: EnergySample[]): BatteryStats {
  const socValues = samples
    .map((sample) => sample.batterySoc)
    .filter((value): value is number => value !== null)

  let energyChargedWh = 0
  let energyDischargedWh = 0

  for (const sample of samples) {
    const chargeW = sample.batteryChargeW
    const dischargeW = sample.batteryDischargeW

    if (chargeW !== null || dischargeW !== null) {
      if (chargeW !== null) {
        energyChargedWh += (chargeW * SAMPLE_INTERVAL_MINUTES) / 60
      }

      if (dischargeW !== null) {
        energyDischargedWh += (dischargeW * SAMPLE_INTERVAL_MINUTES) / 60
      }

      continue
    }

    if (sample.batteryPowerW === null) {
      continue
    }

    const energyWh = (Math.abs(sample.batteryPowerW) * SAMPLE_INTERVAL_MINUTES) / 60

    if (sample.batteryPowerW > 0) {
      energyChargedWh += energyWh
    }

    if (sample.batteryPowerW < 0) {
      energyDischargedWh += energyWh
    }
  }

  if (socValues.length === 0) {
    return {
      socMin: null,
      socMax: null,
      socAvg: null,
      energyChargedWh,
      energyDischargedWh,
    }
  }

  const socMin = Math.min(...socValues)
  const socMax = Math.max(...socValues)
  const socAvg = socValues.reduce((sum, value) => sum + value, 0) / socValues.length

  return {
    socMin,
    socMax,
    socAvg,
    energyChargedWh,
    energyDischargedWh,
  }
}

export type EnergyTotals = {
  producedWh: number
  consumedWh: number
  importedWh: number
  exportedWh: number
  selfConsumedWh: number
}

const DEFAULT_INTERVAL_MINUTES = 5
const MAX_GAP_MINUTES = 15

export function computeEnergyTotals(samples: EnergySample[]): EnergyTotals {
  let producedWh = 0
  let consumedWh = 0
  let importedWh = 0
  let exportedWh = 0

  for (let index = 0; index < samples.length; index += 1) {
    const sample = samples[index]
    const next = samples[index + 1]
    const hours = intervalHours(sample, next)

    producedWh += positive(sample.productionW) * hours
    consumedWh += positive(sample.consumptionW) * hours
    importedWh += positive(sample.gridImportW) * hours
    exportedWh += positive(sample.gridExportW) * hours
  }

  return {
    producedWh,
    consumedWh,
    importedWh,
    exportedWh,
    selfConsumedWh: Math.max(0, producedWh - exportedWh),
  }
}

function intervalHours(sample: EnergySample, next: EnergySample | undefined) {
  if (!next) {
    return DEFAULT_INTERVAL_MINUTES / 60
  }

  const deltaMinutes =
    (new Date(next.recordedAt).getTime() - new Date(sample.recordedAt).getTime()) / 60_000
  const bounded = Math.min(Math.max(deltaMinutes, 0), MAX_GAP_MINUTES)

  return bounded / 60
}

function positive(value: number | null) {
  if (value === null || value < 0) {
    return 0
  }

  return value
}

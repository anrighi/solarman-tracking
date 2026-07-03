import type { EnergySample } from '@/features/energy/types'
import type { EnergySampleRow } from '@/server/db/schema'

function toNullableNumber(value: number | null) {
  if (value === null) {
    return null
  }

  return Number(value)
}

export function mapEnergySampleRow(row: EnergySampleRow): EnergySample {
  return {
    recordedAt: row.recorded_at.toISOString(),
    produzioneW: toNullableNumber(row.produzione_w),
    consumoW: toNullableNumber(row.consumo_w),
    batterySoc: toNullableNumber(row.battery_soc),
    batteryPowerW: toNullableNumber(row.battery_power_w),
  }
}

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
    productionW: toNullableNumber(row.production_w),
    consumptionW: toNullableNumber(row.consumption_w),
    batterySoc: toNullableNumber(row.battery_soc),
    batteryPowerW: toNullableNumber(row.battery_power_w),
    gridImportW: toNullableNumber(row.grid_import_w),
    gridExportW: toNullableNumber(row.grid_export_w),
    batteryChargeW: toNullableNumber(row.battery_charge_w),
    batteryDischargeW: toNullableNumber(row.battery_discharge_w),
    irradiance: toNullableNumber(row.irradiance),
  }
}

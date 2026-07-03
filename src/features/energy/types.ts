import type { SyncStatus } from '@/server/db/schema'
import type { AppConfig } from '@/lib/config/schema'
import type { BatteryStats, EnergyTotals } from '@/features/energy/battery-stats'
import type { PeriodType } from '@/features/energy/time-range'

export type EnergySample = {
  recordedAt: string
  productionW: number | null
  consumptionW: number | null
  batterySoc: number | null
  batteryPowerW: number | null
  gridImportW: number | null
  gridExportW: number | null
  batteryChargeW: number | null
  batteryDischargeW: number | null
  irradiance: number | null
}

export type EnergyDashboardData = {
  samples: EnergySample[]
  period: PeriodType
  anchor: string | null
  firstDataDate: string | null
  periodFrom: string
  periodTo: string
  isLive: boolean
  batteryStats: BatteryStats
  energyTotals: EnergyTotals
  syncStatus: {
    lastRunAt: string | null
    lastStatus: SyncStatus
    lastError: string | null
    sampleCount: number
    isMock: boolean
  }
  config: Pick<AppConfig, 'dashboard' | 'chart'>
}

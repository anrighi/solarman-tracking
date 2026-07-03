import type { SyncStatus } from '@/server/db/schema'

export type EnergySample = {
  recordedAt: string
  produzioneW: number | null
  consumoW: number | null
  batterySoc: number | null
  batteryPowerW: number | null
}

export type EnergyDashboardData = {
  samples: EnergySample[]
  syncStatus: {
    lastRunAt: string | null
    lastStatus: SyncStatus
    lastError: string | null
    sampleCount: number
    isMock: boolean
  }
}

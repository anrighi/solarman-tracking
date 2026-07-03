import { describe, expect, it } from 'vitest'

import { defaultAppConfig } from '@/lib/config/schema'
import { evaluateBatteryAlerts } from '@/features/alerts/battery-rules'

describe('evaluateBatteryAlerts', () => {
  const sample = {
    batterySoc: 15,
    recordedAt: new Date('2026-07-03T12:00:00Z'),
  }

  it('triggers low SOC alert', () => {
    const alerts = evaluateBatteryAlerts(sample, defaultAppConfig)
    expect(alerts.some((alert) => alert.type === 'soc_low')).toBe(true)
  })

  it('triggers high SOC alert', () => {
    const alerts = evaluateBatteryAlerts(
      { ...sample, batterySoc: 98 },
      defaultAppConfig,
    )
    expect(alerts.some((alert) => alert.type === 'soc_high')).toBe(true)
  })

  it('returns empty when SOC is null', () => {
    const alerts = evaluateBatteryAlerts(
      { ...sample, batterySoc: null },
      defaultAppConfig,
    )
    expect(alerts).toHaveLength(0)
  })

  it('returns empty when SOC is within range', () => {
    const alerts = evaluateBatteryAlerts(
      { ...sample, batterySoc: 50 },
      defaultAppConfig,
    )
    expect(alerts).toHaveLength(0)
  })
})

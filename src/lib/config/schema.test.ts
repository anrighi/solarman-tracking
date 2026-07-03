import { describe, expect, it } from 'vitest'

import { appConfigSchema, defaultAppConfig } from '@/lib/config/schema'

describe('appConfigSchema', () => {
  it('applies defaults', () => {
    expect(defaultAppConfig.sync.intervalMs).toBe(300_000)
    expect(defaultAppConfig.battery.socLow).toBe(20)
    expect(defaultAppConfig.dashboard.defaultRangeHours).toBe(24)
    expect(defaultAppConfig.chart.smooth).toBe(true)
    expect(defaultAppConfig.chart.visibleSeries).toEqual([
      'production',
      'consumption',
      'soc',
    ])
    expect(defaultAppConfig.backup.maxAgeHours).toBe(26)
    expect(defaultAppConfig.backup.alertOnMissing).toBe(true)
  })

  it('rejects invalid interval', () => {
    const result = appConfigSchema.safeParse({
      sync: { intervalMs: 1000 },
    })

    expect(result.success).toBe(false)
  })

  it('merges partial input', () => {
    const result = appConfigSchema.parse({
      battery: { socLow: 15 },
    })

    expect(result.battery.socLow).toBe(15)
    expect(result.battery.socHigh).toBe(95)
  })
})

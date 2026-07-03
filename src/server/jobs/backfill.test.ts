import { describe, expect, it } from 'vitest'

import { isDayCovered } from '@/server/jobs/backfill'

describe('isDayCovered', () => {
  const checkpoint = {
    first_data_at: new Date('2026-06-01T00:00:00Z'),
    last_synced_at: new Date('2026-06-10T00:00:00Z'),
    no_data_before: new Date('2026-05-20T00:00:00Z'),
  }

  it('returns true for days before no_data_before', () => {
    const day = new Date('2026-05-15T00:00:00Z')
    expect(isDayCovered(day, checkpoint)).toBe(true)
  })

  it('returns true for days within synced range', () => {
    const day = new Date('2026-06-05T00:00:00Z')
    expect(isDayCovered(day, checkpoint)).toBe(true)
  })

  it('returns false for uncovered days', () => {
    const day = new Date('2026-06-15T00:00:00Z')
    expect(isDayCovered(day, checkpoint)).toBe(false)
  })

  it('returns false when checkpoint is null', () => {
    const day = new Date('2026-06-05T00:00:00Z')
    expect(isDayCovered(day, null)).toBe(false)
  })
})

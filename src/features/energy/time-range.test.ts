import { describe, expect, it } from 'vitest'

import {
  canGoNext,
  formatDateOnly,
  parseDateOnly,
  resolveTimeRange,
  shiftEndDate,
} from '@/features/energy/time-range'

describe('resolveTimeRange', () => {
  it('resolves "today" from midnight to now', () => {
    const range = resolveTimeRange({ days: 1 })
    const now = new Date()
    expect(range.isLive).toBe(true)
    expect(range.endDate).toBeNull()
    expect(formatDateOnly(range.from)).toBe(formatDateOnly(now))
    expect(range.from.getHours()).toBe(0)
    expect(range.from.getMinutes()).toBe(0)
    expect(range.to.getTime()).toBeLessThanOrEqual(now.getTime())
  })

  it('resolves a historical single day on midnight boundaries', () => {
    const range = resolveTimeRange({ days: 1, endDate: '2026-06-01' })
    expect(range.isLive).toBe(false)
    expect(formatDateOnly(range.from)).toBe('2026-06-01')
    expect(formatDateOnly(range.to)).toBe('2026-06-02')
    expect(range.from.getHours()).toBe(0)
    expect(range.to.getHours()).toBe(0)
  })

  it('resolves a historical 7-day window', () => {
    const range = resolveTimeRange({ days: 7, endDate: '2026-06-10' })
    expect(formatDateOnly(range.from)).toBe('2026-06-04')
    expect(formatDateOnly(range.to)).toBe('2026-06-11')
  })
})

describe('shiftEndDate', () => {
  it('shifts backward by one day for a daily window', () => {
    expect(shiftEndDate('2026-06-10', 1, 'prev')).toBe('2026-06-09')
  })

  it('shifts backward by seven days for a weekly window', () => {
    expect(shiftEndDate('2026-06-10', 7, 'prev')).toBe('2026-06-03')
  })

  it('returns undefined when moving forward past today', () => {
    const today = formatDateOnly(new Date())
    expect(shiftEndDate(today, 1, 'next')).toBeUndefined()
  })
})

describe('canGoNext', () => {
  it('returns false when live', () => {
    expect(canGoNext(undefined, 1)).toBe(false)
  })

  it('returns false for today', () => {
    const today = formatDateOnly(new Date())
    expect(canGoNext(today, 1)).toBe(false)
  })

  it('returns true for past dates', () => {
    expect(canGoNext('2026-01-01', 1)).toBe(true)
  })
})

describe('parseDateOnly', () => {
  it('parses YYYY-MM-DD as local midnight', () => {
    const date = parseDateOnly('2026-07-03')
    expect(date.getFullYear()).toBe(2026)
    expect(date.getMonth()).toBe(6)
    expect(date.getDate()).toBe(3)
    expect(date.getHours()).toBe(0)
  })
})

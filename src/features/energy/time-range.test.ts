import { describe, expect, it } from 'vitest'

import {
  canGoNext,
  canGoPrev,
  formatDateOnly,
  parseDateOnly,
  resolveTimeRange,
  shiftPeriod,
} from '@/features/energy/time-range'

describe('resolveTimeRange', () => {
  it('resolves "today" from midnight to now', () => {
    const range = resolveTimeRange({ period: 'day' })
    const now = new Date()
    expect(range.isLive).toBe(true)
    expect(range.anchor).toBeNull()
    expect(formatDateOnly(range.from)).toBe(formatDateOnly(now))
    expect(range.from.getHours()).toBe(0)
    expect(range.from.getMinutes()).toBe(0)
    expect(range.to.getTime()).toBeLessThanOrEqual(now.getTime())
  })

  it('resolves a historical single day on midnight boundaries', () => {
    const range = resolveTimeRange({ period: 'day', anchor: '2026-06-01' })
    expect(range.isLive).toBe(false)
    expect(formatDateOnly(range.from)).toBe('2026-06-01')
    expect(formatDateOnly(range.to)).toBe('2026-06-02')
    expect(range.from.getHours()).toBe(0)
    expect(range.to.getHours()).toBe(0)
  })

  it('snaps a week to Monday–Sunday regardless of the anchor weekday', () => {
    const range = resolveTimeRange({ period: 'week', anchor: '2026-06-10' })
    expect(formatDateOnly(range.from)).toBe('2026-06-08')
    expect(formatDateOnly(range.to)).toBe('2026-06-15')
    expect(range.from.getDay()).toBe(1)
  })

  it('keeps a Monday anchor as the start of its own week', () => {
    const range = resolveTimeRange({ period: 'week', anchor: '2026-06-08' })
    expect(formatDateOnly(range.from)).toBe('2026-06-08')
    expect(formatDateOnly(range.to)).toBe('2026-06-15')
  })

  it('resolves a month from the first to the first of next month', () => {
    const range = resolveTimeRange({ period: 'month', anchor: '2026-02-14' })
    expect(formatDateOnly(range.from)).toBe('2026-02-01')
    expect(formatDateOnly(range.to)).toBe('2026-03-01')
  })
})

describe('shiftPeriod', () => {
  it('shifts backward by one day for a daily period', () => {
    expect(shiftPeriod('2026-06-10', 'day', 'prev')).toBe('2026-06-09')
  })

  it('shifts backward by seven days for a weekly period', () => {
    expect(shiftPeriod('2026-06-10', 'week', 'prev')).toBe('2026-06-03')
  })

  it('shifts backward by one month for a monthly period', () => {
    expect(shiftPeriod('2026-03-31', 'month', 'prev')).toBe('2026-02-01')
  })

  it('returns undefined when moving forward into the current period', () => {
    const today = formatDateOnly(new Date())
    expect(shiftPeriod(today, 'day', 'next')).toBeUndefined()
  })

  it('returns undefined when moving backward before minDate', () => {
    expect(shiftPeriod('2026-06-10', 'day', 'prev', '2026-06-10')).toBeUndefined()
  })
})

describe('canGoNext', () => {
  it('returns false when live', () => {
    expect(canGoNext(undefined, 'day')).toBe(false)
  })

  it('returns false for today', () => {
    const today = formatDateOnly(new Date())
    expect(canGoNext(today, 'day')).toBe(false)
  })

  it('returns true for past dates', () => {
    expect(canGoNext('2026-01-01', 'day')).toBe(true)
  })
})

describe('canGoPrev', () => {
  it('returns true when no minDate is set', () => {
    expect(canGoPrev('2026-06-10', 'day')).toBe(true)
  })

  it('returns false when the previous day would start before minDate', () => {
    expect(canGoPrev('2026-06-10', 'day', '2026-06-10')).toBe(false)
  })

  it('returns true when the previous day is still on or after minDate', () => {
    expect(canGoPrev('2026-06-11', 'day', '2026-06-10')).toBe(true)
  })

  it('returns false for a week whose previous period starts before minDate', () => {
    expect(canGoPrev('2026-06-10', 'week', '2026-06-08')).toBe(false)
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

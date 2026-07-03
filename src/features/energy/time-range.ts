export type PeriodType = 'day' | 'week' | 'month'

export type TimeRangeInput = {
  period: PeriodType
  anchor?: string
}

export type ResolvedTimeRange = {
  from: Date
  to: Date
  period: PeriodType
  anchor: string | null
  isLive: boolean
}

export function parseDateOnly(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function formatDateOnly(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

function mondayOf(date: Date) {
  const weekday = date.getDay()
  const offset = (weekday + 6) % 7
  return addDays(startOfLocalDay(date), -offset)
}

function periodBounds(period: PeriodType, anchorDay: Date) {
  if (period === 'day') {
    const start = startOfLocalDay(anchorDay)
    return { start, end: addDays(start, 1) }
  }

  if (period === 'week') {
    const start = mondayOf(anchorDay)
    return { start, end: addDays(start, 7) }
  }

  const start = new Date(anchorDay.getFullYear(), anchorDay.getMonth(), 1)
  const end = new Date(anchorDay.getFullYear(), anchorDay.getMonth() + 1, 1)
  return { start, end }
}

export function resolveTimeRange({ period, anchor }: TimeRangeInput): ResolvedTimeRange {
  const now = new Date()
  const anchorDay = anchor ? parseDateOnly(anchor) : startOfLocalDay(now)
  const { start, end } = periodBounds(period, anchorDay)
  const isLive = end > now

  return {
    from: start,
    to: isLive ? now : end,
    period,
    anchor: anchor ?? null,
    isLive,
  }
}

function shiftAnchorDay(anchorDay: Date, period: PeriodType, direction: 'prev' | 'next') {
  const sign = direction === 'prev' ? -1 : 1

  if (period === 'day') {
    return addDays(anchorDay, sign)
  }

  if (period === 'week') {
    return addDays(anchorDay, 7 * sign)
  }

  return new Date(anchorDay.getFullYear(), anchorDay.getMonth() + sign, 1)
}

export function shiftPeriod(
  anchor: string | undefined,
  period: PeriodType,
  direction: 'prev' | 'next',
  minDate?: string,
) {
  const baseDay = anchor ? parseDateOnly(anchor) : startOfLocalDay(new Date())
  const newDay = shiftAnchorDay(baseDay, period, direction)
  const { start, end } = periodBounds(period, newDay)

  if (direction === 'next' && end > new Date()) {
    return undefined
  }

  if (direction === 'prev' && minDate) {
    const minDay = parseDateOnly(minDate)
    if (start < minDay) {
      return undefined
    }
  }

  return formatDateOnly(newDay)
}

export function canGoNext(anchor: string | undefined, period: PeriodType) {
  if (!anchor) {
    return false
  }

  const { end } = periodBounds(period, parseDateOnly(anchor))
  return end.getTime() <= Date.now()
}

export function canGoPrev(
  anchor: string | undefined,
  period: PeriodType,
  minDate?: string,
) {
  if (!minDate) {
    return true
  }

  const baseDay = anchor ? parseDateOnly(anchor) : startOfLocalDay(new Date())
  const previousDay = shiftAnchorDay(baseDay, period, 'prev')
  const { start } = periodBounds(period, previousDay)
  const minDay = parseDateOnly(minDate)

  return start >= minDay
}

export function formatPeriodLabel(range: ResolvedTimeRange) {
  const anchorDay = range.anchor ? parseDateOnly(range.anchor) : startOfLocalDay(range.to)

  if (range.period === 'day') {
    if (range.isLive) {
      return 'Oggi (dalla mezzanotte a ora)'
    }

    return capitalize(formatFullDay(anchorDay))
  }

  if (range.period === 'week') {
    const { start, end } = periodBounds('week', anchorDay)
    const sunday = addDays(end, -1)
    const label = `Settimana ${formatShortDay(start)} – ${formatFullDay(sunday)}`
    return range.isLive ? `${label} (in corso)` : label
  }

  const label = capitalize(
    anchorDay.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }),
  )
  return range.isLive ? `${label} (in corso)` : label
}

function formatFullDay(date: Date) {
  return date.toLocaleDateString('it-IT', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatShortDay(date: Date) {
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
  })
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function todayDateOnly() {
  return formatDateOnly(new Date())
}

export const RANGE_PRESETS = [
  { label: 'Oggi', period: 'day' },
  { label: 'Settimana', period: 'week' },
  { label: 'Mese', period: 'month' },
] as const satisfies ReadonlyArray<{ label: string; period: PeriodType }>

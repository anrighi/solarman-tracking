export type TimeRangeInput = {
  days: number
  endDate?: string
}

export type ResolvedTimeRange = {
  from: Date
  to: Date
  days: number
  endDate: string | null
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

function addLocalDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

export function resolveTimeRange({ days, endDate }: TimeRangeInput): ResolvedTimeRange {
  const now = new Date()
  const anchorDay = endDate ? parseDateOnly(endDate) : startOfLocalDay(now)
  const from = addLocalDays(anchorDay, -(days - 1))
  let to = endDate ? addLocalDays(anchorDay, 1) : now

  if (to > now) {
    to = now
  }

  return {
    from,
    to,
    days,
    endDate: endDate ?? null,
    isLive: !endDate,
  }
}

export function shiftEndDate(
  endDate: string | undefined,
  days: number,
  direction: 'prev' | 'next',
) {
  const baseDay = endDate ? parseDateOnly(endDate) : startOfLocalDay(new Date())
  const delta = direction === 'prev' ? -days : days
  const newDay = addLocalDays(baseDay, delta)
  const today = startOfLocalDay(new Date())

  if (newDay >= today) {
    return undefined
  }

  return formatDateOnly(newDay)
}

export function canGoNext(endDate: string | undefined, days: number) {
  if (!endDate) {
    return false
  }

  const { to } = resolveTimeRange({ days, endDate })
  return to.getTime() < Date.now() - 60_000
}

export function formatPeriodLabel(range: ResolvedTimeRange) {
  if (range.isLive) {
    if (range.days === 1) {
      return 'Oggi (dalla mezzanotte a ora)'
    }

    return `Ultimi ${range.days} giorni`
  }

  const anchorDay = range.endDate ? parseDateOnly(range.endDate) : range.to

  if (range.days === 1) {
    return capitalize(formatDay(anchorDay))
  }

  return `${formatDay(range.from)} – ${formatDay(anchorDay)}`
}

function formatDay(date: Date) {
  return date.toLocaleDateString('it-IT', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function todayDateOnly() {
  return formatDateOnly(new Date())
}

export const RANGE_PRESETS = [
  { label: 'Oggi', days: 1 },
  { label: '7 giorni', days: 7 },
  { label: '30 giorni', days: 30 },
] as const

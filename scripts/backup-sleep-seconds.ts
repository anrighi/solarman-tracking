#!/usr/bin/env tsx

const tz = process.env.BACKUP_SCHEDULE_TZ ?? 'Europe/Rome'
const scheduleHour = Number(process.env.BACKUP_SCHEDULE_HOUR ?? 3)

function getZonedParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  const parts = formatter.formatToParts(date)
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0)

  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour'),
    minute: read('minute'),
    second: read('second'),
  }
}

function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string,
) {
  let guess = Date.UTC(year, month - 1, day, hour, minute, second)

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = getZonedParts(new Date(guess), timeZone)
    const displayed = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    )
    const target = Date.UTC(year, month - 1, day, hour, minute, second)
    const diffMs = displayed - target

    if (diffMs === 0) {
      return guess
    }

    guess -= diffMs
  }

  return guess
}

function secondsUntilNextRun() {
  const now = new Date()
  const current = getZonedParts(now, tz)
  let targetDay = current.day
  let targetMonth = current.month
  let targetYear = current.year

  const pastScheduleToday =
    current.hour > scheduleHour ||
    (current.hour === scheduleHour && (current.minute > 0 || current.second > 0))

  if (pastScheduleToday) {
    const tomorrow = new Date(
      zonedTimeToUtc(
        current.year,
        current.month,
        current.day,
        12,
        0,
        0,
        tz,
      ) + 24 * 60 * 60 * 1000,
    )
    const next = getZonedParts(tomorrow, tz)
    targetYear = next.year
    targetMonth = next.month
    targetDay = next.day
  }

  const nextRunMs = zonedTimeToUtc(
    targetYear,
    targetMonth,
    targetDay,
    scheduleHour,
    0,
    0,
    tz,
  )

  return Math.max(1, Math.floor((nextRunMs - now.getTime()) / 1000))
}

process.stdout.write(String(secondsUntilNextRun()))

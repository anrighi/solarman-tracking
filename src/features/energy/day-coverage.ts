export const SAMPLES_PER_FULL_DAY = 288
export const COVERAGE_RATIO = 0.8

export function formatUtcDayKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

export function expectedSamplesForDay(dateKey: string, now = new Date()) {
  const todayKey = formatUtcDayKey(now)

  if (dateKey !== todayKey) {
    return SAMPLES_PER_FULL_DAY
  }

  const start = startOfUtcDay(now)
  const minutesSinceMidnight = (now.getTime() - start.getTime()) / 60_000

  return Math.max(1, Math.ceil(minutesSinceMidnight / 5))
}

export function assessDayCoverage(dateKey: string, sampleCount: number, now = new Date()) {
  const expectedSamples = expectedSamplesForDay(dateKey, now)
  const minExpected = expectedSamples * COVERAGE_RATIO

  return {
    expectedSamples,
    minExpected,
    sufficient: sampleCount >= minExpected,
  }
}

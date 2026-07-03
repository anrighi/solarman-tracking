export type SeriesKey =
  | 'production'
  | 'consumption'
  | 'gridImport'
  | 'gridExport'
  | 'batteryPower'
  | 'soc'

export type ChartPoint = {
  time: string
  production: number | null
  consumption: number | null
  soc: number | null
  batteryPower: number | null
  gridImport: number | null
  gridExport: number | null
}

export type SeriesDefinition = {
  key: SeriesKey
  name: string
  stroke: string
  yAxisId: 'power' | 'soc'
}

export const CHART_SERIES: SeriesDefinition[] = [
  { key: 'production', name: 'Produzione', stroke: '#f59e0b', yAxisId: 'power' },
  { key: 'consumption', name: 'Consumo', stroke: '#3b82f6', yAxisId: 'power' },
  { key: 'gridImport', name: 'Prelievo rete', stroke: '#ef4444', yAxisId: 'power' },
  { key: 'gridExport', name: 'Immissione rete', stroke: '#14b8a6', yAxisId: 'power' },
  { key: 'batteryPower', name: 'Potenza batteria', stroke: '#8b5cf6', yAxisId: 'power' },
  { key: 'soc', name: 'SOC batteria', stroke: '#10b981', yAxisId: 'soc' },
]

export const SERIES_KEYS: SeriesKey[] = CHART_SERIES.map((series) => series.key)

export function hasSeriesData(data: ChartPoint[], key: SeriesKey) {
  return data.some((point) => typeof point[key] === 'number')
}

export function normalizeChartData(data: ChartPoint[], smoothWindow: number): ChartPoint[] {
  const normalizedByKey = Object.fromEntries(
    SERIES_KEYS.map((key) => [key, smoothSeries(normalizeSeries(data.map((point) => point[key])), smoothWindow)]),
  ) as Record<SeriesKey, (number | null)[]>

  return data.map((point, index) => ({
    time: point.time,
    production: normalizedByKey.production[index] ?? null,
    consumption: normalizedByKey.consumption[index] ?? null,
    soc: normalizedByKey.soc[index] ?? null,
    batteryPower: normalizedByKey.batteryPower[index] ?? null,
    gridImport: normalizedByKey.gridImport[index] ?? null,
    gridExport: normalizedByKey.gridExport[index] ?? null,
  }))
}

export function resolveSmoothWindow(sampleCount: number) {
  if (sampleCount <= 12) {
    return 1
  }

  if (sampleCount <= 48) {
    return 3
  }

  return 5
}

export function normalizeSeries(values: (number | null)[]) {
  const numbers = values.filter((value): value is number => typeof value === 'number')
  if (numbers.length === 0) {
    return values
  }

  const min = Math.min(...numbers)
  const max = Math.max(...numbers)
  const range = max - min

  if (range === 0) {
    return values.map((value) => (typeof value === 'number' ? 50 : null))
  }

  return values.map((value) => {
    if (typeof value !== 'number') {
      return null
    }

    return ((value - min) / range) * 100
  })
}

export function smoothSeries(values: (number | null)[], windowSize: number) {
  if (windowSize <= 1) {
    return values
  }

  const radius = Math.floor(windowSize / 2)

  return values.map((value, index) => {
    if (typeof value !== 'number') {
      return null
    }

    const slice = values.slice(Math.max(0, index - radius), index + radius + 1)
    const numbers = slice.filter((entry): entry is number => typeof entry === 'number')
    if (numbers.length === 0) {
      return null
    }

    const total = numbers.reduce((sum, entry) => sum + entry, 0)
    return total / numbers.length
  })
}

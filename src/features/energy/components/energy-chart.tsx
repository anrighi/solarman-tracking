import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import {
  CHART_SERIES,
  type ChartPoint,
  SERIES_KEYS,
  type SeriesKey,
  hasSeriesData,
  normalizeChartData,
  resolveSmoothWindow,
} from '@/features/energy/chart-series'
import type { EnergySample } from '@/features/energy/types'

type EnergyChartProps = {
  samples: EnergySample[]
  defaultVisibleSeries: SeriesKey[]
  defaultSmooth: boolean
}

type LegendPayload = {
  dataKey?: string
  value?: string
  color?: string
}

export function EnergyChart({
  samples,
  defaultVisibleSeries,
  defaultSmooth,
}: EnergyChartProps) {
  const [hiddenSeries, setHiddenSeries] = useState<Set<SeriesKey>>(() => {
    const visible = new Set(defaultVisibleSeries)
    return new Set(SERIES_KEYS.filter((key) => !visible.has(key)))
  })
  const [isNormalized, setIsNormalized] = useState(defaultSmooth)

  const useDateLabels = samples.length > 48
  const rawData = useMemo(
    () => samples.map((sample) => toChartPoint(sample, useDateLabels)),
    [samples, useDateLabels],
  )
  const smoothWindow = resolveSmoothWindow(samples.length)
  const chartData = useMemo(
    () => (isNormalized ? normalizeChartData(rawData, smoothWindow) : rawData),
    [isNormalized, rawData, smoothWindow],
  )

  const visibleSeries = CHART_SERIES.filter((series) => {
    if (series.key === 'gridImport' || series.key === 'gridExport') {
      return hasSeriesData(rawData, series.key)
    }

    return true
  })

  if (samples.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-500">
        Nessun dato disponibile. Avvia una sincronizzazione.
      </div>
    )
  }

  function toggleSeries(key: SeriesKey) {
    setHiddenSeries((current) => {
      const next = new Set(current)
      if (next.has(key)) {
        next.delete(key)
        return next
      }

      next.add(key)
      return next
    })
  }

  function handleLegendClick(payload: LegendPayload) {
    const key = payload.dataKey
    if (!isSeriesKey(key)) {
      return
    }

    toggleSeries(key)
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-end">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={isNormalized}
            onChange={(event) => setIsNormalized(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
          />
          Normalizza e leviga curve
        </label>
      </div>

      <div className="h-96 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="time"
              minTickGap={32}
              tick={{ fontSize: 12, fill: '#64748b' }}
            />
            <YAxis
              yAxisId="power"
              domain={isNormalized ? [0, 100] : undefined}
              tick={{ fontSize: 12, fill: '#64748b' }}
              label={{
                value: isNormalized ? '%' : 'W',
                angle: -90,
                position: 'insideLeft',
              }}
            />
            {!isNormalized ? (
              <YAxis
                yAxisId="soc"
                orientation="right"
                domain={[0, 100]}
                tick={{ fontSize: 12, fill: '#64748b' }}
                label={{ value: 'SOC %', angle: 90, position: 'insideRight' }}
              />
            ) : null}
            <Tooltip
              formatter={(value, name, item) =>
                formatTooltip(value, name, item.payload as ChartPoint, rawData, isNormalized)
              }
            />
            <Legend
              onClick={handleLegendClick}
              formatter={(value, entry) => {
                const key = entry.dataKey
                const hidden = isSeriesKey(key) && hiddenSeries.has(key)
                return (
                  <span style={{ color: hidden ? '#94a3b8' : entry.color, cursor: 'pointer' }}>
                    {value}
                  </span>
                )
              }}
            />
            {visibleSeries.map((series) => (
              <Line
                key={series.key}
                yAxisId={isNormalized ? 'power' : series.yAxisId}
                type="monotone"
                dataKey={series.key}
                name={series.name}
                stroke={series.stroke}
                strokeWidth={2}
                dot={false}
                connectNulls
                hide={hiddenSeries.has(series.key)}
                strokeOpacity={hiddenSeries.has(series.key) ? 0 : 1}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function isSeriesKey(value: unknown): value is SeriesKey {
  return typeof value === 'string' && CHART_SERIES.some((series) => series.key === value)
}

function formatTooltip(
  value: unknown,
  name: unknown,
  normalizedPoint: ChartPoint,
  rawData: ChartPoint[],
  isNormalized: boolean,
) {
  if (typeof value !== 'number') {
    return ['—', String(name)]
  }

  const label = String(name)
  const rawPoint = rawData.find((point) => point.time === normalizedPoint.time)
  const rawValue = rawPoint ? rawPoint[findSeriesKey(label)] : null

  if (isNormalized) {
    if (typeof rawValue === 'number') {
      if (label === 'SOC batteria') {
        return [`${value.toFixed(1)} % (${rawValue.toFixed(1)} %)`, label]
      }

      return [`${value.toFixed(1)} % (${formatPower(rawValue)})`, label]
    }

    return [`${value.toFixed(1)} %`, label]
  }

  if (label === 'SOC batteria') {
    return [`${value.toFixed(1)} %`, label]
  }

  return [`${value.toFixed(0)} W`, label]
}

function findSeriesKey(label: string): SeriesKey {
  const match = CHART_SERIES.find((series) => series.name === label)
  return match?.key ?? 'production'
}

function formatPower(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)} kW`
  }

  return `${Math.round(value)} W`
}

function toChartPoint(sample: EnergySample, useDateLabels: boolean): ChartPoint {
  const date = new Date(sample.recordedAt)

  return {
    time: date.toLocaleString('it-IT', {
      ...(useDateLabels ? { day: '2-digit', month: '2-digit' } : {}),
      hour: '2-digit',
      minute: '2-digit',
    }),
    production: sample.productionW,
    consumption: sample.consumptionW,
    soc: sample.batterySoc,
    batteryPower: sample.batteryPowerW,
    gridImport: sample.gridImportW,
    gridExport: sample.gridExportW,
  }
}

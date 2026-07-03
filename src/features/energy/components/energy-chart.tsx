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

import type { EnergySample } from '@/features/energy/types'

type EnergyChartProps = {
  samples: EnergySample[]
}

type ChartPoint = {
  time: string
  produzione: number | null
  consumo: number | null
  batteria: number | null
}

export function EnergyChart({ samples }: EnergyChartProps) {
  if (samples.length === 0) {
    return (
      <div className="flex h-80 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-500">
        Nessun dato disponibile. Avvia una sincronizzazione.
      </div>
    )
  }

  const data = samples.map(toChartPoint)

  return (
    <div className="h-96 w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="time"
            minTickGap={32}
            tick={{ fontSize: 12, fill: '#64748b' }}
          />
          <YAxis
            yAxisId="power"
            tick={{ fontSize: 12, fill: '#64748b' }}
            label={{ value: 'W', angle: -90, position: 'insideLeft' }}
          />
          <YAxis
            yAxisId="soc"
            orientation="right"
            domain={[0, 100]}
            tick={{ fontSize: 12, fill: '#64748b' }}
            label={{ value: 'SOC %', angle: 90, position: 'insideRight' }}
          />
          <Tooltip
            formatter={(value, name) => {
              if (typeof value !== 'number') {
                return ['—', String(name)]
              }

              if (name === 'batteria') {
                return [`${value.toFixed(1)} %`, 'Batteria']
              }

              return [`${value.toFixed(0)} W`, String(name)]
            }}
          />
          <Legend />
          <Line
            yAxisId="power"
            type="monotone"
            dataKey="produzione"
            name="Produzione"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
          <Line
            yAxisId="power"
            type="monotone"
            dataKey="consumo"
            name="Consumo"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
          <Line
            yAxisId="soc"
            type="monotone"
            dataKey="batteria"
            name="Batteria"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function toChartPoint(sample: EnergySample): ChartPoint {
  const date = new Date(sample.recordedAt)

  return {
    time: date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    produzione: sample.produzioneW,
    consumo: sample.consumoW,
    batteria: sample.batterySoc,
  }
}

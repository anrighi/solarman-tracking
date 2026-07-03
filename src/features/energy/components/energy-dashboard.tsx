import { useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { RefreshCw } from 'lucide-react'

import { EnergyChart } from '@/features/energy/components/energy-chart'
import { runEnergySync } from '@/features/energy/server/get-energy-dashboard'
import type { EnergyDashboardData } from '@/features/energy/types'

type EnergyDashboardProps = {
  data: EnergyDashboardData
}

export function EnergyDashboard({ data }: EnergyDashboardProps) {
  const router = useRouter()
  const [isSyncing, setIsSyncing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const latest = data.samples.at(-1)

  async function handleSync() {
    setIsSyncing(true)
    setMessage(null)

    try {
      const result = await runEnergySync()
      setMessage(result.message)
      await router.invalidate()
    } catch (error) {
      const text =
        error instanceof Error ? error.message : 'Sincronizzazione non riuscita'
      setMessage(text)
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Solar Tracking</h1>
          <p className="mt-1 text-slate-600">
            Produzione, consumo e stato batteria — ultime 24 ore
          </p>
        </div>

        <button
          type="button"
          onClick={handleSync}
          disabled={isSyncing}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2 font-medium text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Sincronizzazione...' : 'Sincronizza ora'}
        </button>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Produzione attuale"
          value={formatPower(latest?.produzioneW)}
          accent="text-amber-600"
        />
        <MetricCard
          label="Consumo attuale"
          value={formatPower(latest?.consumoW)}
          accent="text-blue-600"
        />
        <MetricCard
          label="Batteria"
          value={formatSoc(latest?.batterySoc)}
          accent="text-emerald-600"
        />
        <MetricCard
          label="Campioni in DB"
          value={String(data.syncStatus.sampleCount)}
          accent="text-slate-700"
        />
      </section>

      <EnergyChart samples={data.samples} />

      <footer className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <p>
          Stato sync: <StatusBadge status={data.syncStatus.lastStatus} />
          {data.syncStatus.isMock ? ' · modalità demo' : ' · Solarman live'}
        </p>
        {data.syncStatus.lastRunAt ? (
          <p>Ultima esecuzione: {formatDateTime(data.syncStatus.lastRunAt)}</p>
        ) : null}
        {data.syncStatus.lastError ? (
          <p className="text-red-600">Errore: {data.syncStatus.lastError}</p>
        ) : null}
        {message ? <p className="mt-1 text-slate-800">{message}</p> : null}
      </footer>
    </div>
  )
}

function MetricCard({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${accent}`}>{value}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    success: 'text-emerald-700',
    running: 'text-amber-700',
    error: 'text-red-700',
    idle: 'text-slate-600',
  }

  return <span className={styles[status] ?? 'text-slate-600'}>{status}</span>
}

function formatPower(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return '—'
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)} kW`
  }

  return `${Math.round(value)} W`
}

function formatSoc(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return '—'
  }

  return `${value.toFixed(0)} %`
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('it-IT')
}

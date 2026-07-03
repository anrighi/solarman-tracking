import { useState } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { RefreshCw, Settings } from 'lucide-react'

import { AppLogo } from '@/components/app-logo'
import { EnergyChart } from '@/features/energy/components/energy-chart'
import {
  type DashboardSearch,
  TimeRangeNav,
} from '@/features/energy/components/time-range-nav'
import { runEnergySync } from '@/features/energy/server/get-energy-dashboard'
import type { EnergyDashboardData } from '@/features/energy/types'

type EnergyDashboardProps = {
  data: EnergyDashboardData
  days: number
  endDate?: string
  onRangeChange: (search: DashboardSearch) => void
}

export function EnergyDashboard({
  data,
  days,
  endDate,
  onRangeChange,
}: EnergyDashboardProps) {
  const router = useRouter()
  const [isSyncing, setIsSyncing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const stats = data.batteryStats
  const totals = data.energyTotals

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
        <div className="flex items-center gap-3">
          <AppLogo />
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Solar Tracking</h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/settings"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Settings className="h-4 w-4" />
            Impostazioni
          </Link>
          <button
            type="button"
            onClick={handleSync}
            disabled={isSyncing}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2 font-medium text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizzazione...' : 'Sincronizza ora'}
          </button>
        </div>
      </header>

      <TimeRangeNav days={days} endDate={endDate} onChange={onRangeChange} />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <MetricCard
          label="Produzione totale"
          value={formatEnergy(totals.producedWh)}
          accent="text-amber-600"
        />
        <MetricCard
          label="Consumo totale"
          value={formatEnergy(totals.consumedWh)}
          accent="text-blue-600"
        />
        <MetricCard
          label="Prelievo dalla rete"
          value={formatEnergy(totals.importedWh)}
          accent="text-red-600"
        />
        <MetricCard
          label="Immissione in rete"
          value={formatEnergy(totals.exportedWh)}
          accent="text-teal-600"
        />
        <MetricCard
          label="Autoconsumo"
          value={formatEnergy(totals.selfConsumedWh)}
          accent="text-emerald-600"
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="SOC min / max"
          value={`${formatSoc(stats.socMin)} / ${formatSoc(stats.socMax)}`}
          accent="text-emerald-700"
        />
        <MetricCard
          label="SOC medio"
          value={formatSoc(stats.socAvg)}
          accent="text-emerald-700"
        />
        <MetricCard
          label="Energia caricata"
          value={formatEnergy(stats.energyChargedWh)}
          accent="text-green-600"
        />
        <MetricCard
          label="Energia scaricata"
          value={formatEnergy(stats.energyDischargedWh)}
          accent="text-orange-600"
        />
      </section>

      <EnergyChart
        samples={data.samples}
        defaultVisibleSeries={data.config.chart.visibleSeries}
        defaultSmooth={data.config.chart.smooth}
      />

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

function formatSoc(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return '—'
  }

  return `${value.toFixed(0)} %`
}

function formatEnergy(wh: number) {
  if (wh >= 1000) {
    return `${(wh / 1000).toFixed(1)} kWh`
  }

  return `${Math.round(wh)} Wh`
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('it-IT')
}

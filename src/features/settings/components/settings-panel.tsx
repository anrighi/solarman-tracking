import { useState } from 'react'
import { Link, useRouter } from '@tanstack/react-router'
import { Download, RotateCcw, Save } from 'lucide-react'

import { AppLogo } from '@/components/app-logo'
import { CHART_SERIES, type SeriesKey } from '@/features/energy/chart-series'
import type { AppConfig } from '@/lib/config/schema'
import { defaultAppConfig } from '@/lib/config/schema'
import {
  exportAppConfig,
  getAppConfig,
  saveAppConfig,
} from '@/features/settings/server/get-app-config'

type SettingsPanelProps = {
  config: AppConfig
}

const SYNC_INTERVAL_OPTIONS = [
  { label: '1 minuto', value: 60_000 },
  { label: '5 minuti', value: 300_000 },
  { label: '10 minuti', value: 600_000 },
  { label: '15 minuti', value: 900_000 },
  { label: '30 minuti', value: 1_800_000 },
  { label: '60 minuti', value: 3_600_000 },
]

const DASHBOARD_RANGE_OPTIONS = [
  { label: '24 ore', value: 24 },
  { label: '7 giorni', value: 24 * 7 },
  { label: '30 giorni', value: 24 * 30 },
  { label: '90 giorni', value: 24 * 90 },
]

export function SettingsPanel({ config: initialConfig }: SettingsPanelProps) {
  const router = useRouter()
  const [config, setConfig] = useState(initialConfig)
  const [message, setMessage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const isDirty = JSON.stringify(config) !== JSON.stringify(initialConfig)

  async function handleSave() {
    setIsSaving(true)
    setMessage(null)

    try {
      await saveAppConfig({ data: config })
      setMessage('Configurazione salvata.')
      await router.invalidate()
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Salvataggio non riuscito'
      setMessage(text)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleExport() {
    const json = await exportAppConfig()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'app_config.json'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AppLogo />
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Impostazioni</h1>
            <p className="mt-1 text-slate-600">Configurazione applicazione</p>
          </div>
        </div>
        <Link to="/" className="text-sm text-amber-600 hover:underline">
          ← Dashboard
        </Link>
      </header>

      <Section title="Sincronizzazione">
        <SelectField
          label="Intervallo sync"
          value={config.sync.intervalMs}
          options={SYNC_INTERVAL_OPTIONS}
          hint="La granularità dati Solarman è 5 minuti"
          onChange={(value) =>
            setConfig({
              ...config,
              sync: { ...config.sync, intervalMs: value },
            })
          }
        />
        <ToggleField
          label="Includi dati realtime"
          description="Aggiunge lo snapshot istantaneo a ogni sync"
          checked={config.sync.includeRealtime}
          onChange={(checked) =>
            setConfig({
              ...config,
              sync: { ...config.sync, includeRealtime: checked },
            })
          }
        />
      </Section>

      <Section title="Backfill">
        <SliderField
          label="Giorni vuoti prima di fermarsi"
          value={config.backfill.maxConsecutiveEmptyDays}
          min={1}
          max={90}
          step={1}
          unit=" giorni"
          onChange={(value) =>
            setConfig({
              ...config,
              backfill: { ...config.backfill, maxConsecutiveEmptyDays: value },
            })
          }
        />
      </Section>

      <Section title="Batteria">
        <SliderField
          label="SOC basso (soglia alert)"
          value={config.battery.socLow}
          min={0}
          max={100}
          step={1}
          unit=" %"
          accent="emerald"
          onChange={(value) =>
            setConfig({
              ...config,
              battery: { ...config.battery, socLow: value },
            })
          }
        />
        <SliderField
          label="SOC alto (soglia alert)"
          value={config.battery.socHigh}
          min={0}
          max={100}
          step={1}
          unit=" %"
          accent="emerald"
          onChange={(value) =>
            setConfig({
              ...config,
              battery: { ...config.battery, socHigh: value },
            })
          }
        />
        <SliderField
          label="Cooldown alert"
          value={config.battery.alertCooldownHours}
          min={0}
          max={48}
          step={1}
          unit=" ore"
          onChange={(value) =>
            setConfig({
              ...config,
              battery: { ...config.battery, alertCooldownHours: value },
            })
          }
        />
      </Section>

      <Section title="Telegram">
        <ToggleField
          label="Abilita notifiche batteria"
          description="Invia alert quando il SOC supera le soglie"
          checked={config.telegram.enabled}
          onChange={(checked) =>
            setConfig({
              ...config,
              telegram: { ...config.telegram, enabled: checked },
            })
          }
        />
      </Section>

      <Section title="Dashboard">
        <SelectField
          label="Intervallo predefinito"
          value={config.dashboard.defaultRangeHours}
          options={DASHBOARD_RANGE_OPTIONS}
          onChange={(value) =>
            setConfig({
              ...config,
              dashboard: { ...config.dashboard, defaultRangeHours: value },
            })
          }
        />
      </Section>

      <Section title="Grafico">
        <ToggleField
          label="Normalizza e leviga curve"
          description="Attiva di default la vista normalizzata (0-100%) con media mobile"
          checked={config.chart.smooth}
          onChange={(checked) =>
            setConfig({
              ...config,
              chart: { ...config.chart, smooth: checked },
            })
          }
        />
        <div className="flex flex-col gap-3">
          <span className="text-sm text-slate-600">Serie visibili di default</span>
          {CHART_SERIES.map((series) => (
            <ToggleField
              key={series.key}
              label={series.name}
              checked={config.chart.visibleSeries.includes(series.key)}
              onChange={(checked) =>
                setConfig({
                  ...config,
                  chart: {
                    ...config.chart,
                    visibleSeries: toggleVisibleSeries(
                      config.chart.visibleSeries,
                      series.key,
                      checked,
                    ),
                  },
                })
              }
            />
          ))}
        </div>
      </Section>

      <div className="sticky bottom-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white/90 p-3 shadow-sm backdrop-blur">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !isDirty}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 font-medium text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {isSaving ? 'Salvataggio...' : 'Salva'}
        </button>
        <button
          type="button"
          onClick={() => setConfig(defaultAppConfig)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
        >
          <RotateCcw className="h-4 w-4" />
          Ripristina default
        </button>
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
        >
          <Download className="h-4 w-4" />
          Esporta JSON
        </button>
        {isDirty ? (
          <span className="text-sm text-amber-600">Modifiche non salvate</span>
        ) : null}
      </div>

      {message ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {message}
        </p>
      ) : null}
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-slate-800">{title}</h2>
      <div className="grid gap-5">{children}</div>
    </section>
  )
}

const ACCENTS = {
  amber: 'accent-amber-500 text-amber-600',
  emerald: 'accent-emerald-500 text-emerald-600',
} as const

function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit = '',
  accent = 'amber',
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step: number
  unit?: string
  accent?: keyof typeof ACCENTS
}) {
  const accentClass = ACCENTS[accent]

  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-slate-600">{label}</span>
        <span
          className={`min-w-16 rounded-md bg-slate-100 px-2 py-0.5 text-right font-semibold ${accentClass.split(' ')[1]}`}
        >
          {value}
          {unit}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(event) => onChange(Number(event.target.value))}
          className={`h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 ${accentClass.split(' ')[0]}`}
        />
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(event) => onChange(clamp(Number(event.target.value), min, max))}
          className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-right"
        />
      </div>
    </div>
  )
}

function SelectField({
  label,
  value,
  options,
  onChange,
  hint,
}: {
  label: string
  value: number
  options: { label: string; value: number }[]
  onChange: (value: number) => void
  hint?: string
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-slate-600">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint ? <span className="text-xs text-slate-400">{hint}</span> : null}
    </label>
  )
}

function ToggleField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col">
        <span className="text-sm text-slate-700">{label}</span>
        {description ? (
          <span className="text-xs text-slate-400">{description}</span>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
          checked ? 'bg-amber-500' : 'bg-slate-300'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
            checked ? 'translate-x-5' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}

function toggleVisibleSeries(
  current: SeriesKey[],
  key: SeriesKey,
  checked: boolean,
): SeriesKey[] {
  if (!checked) {
    return current.filter((entry) => entry !== key)
  }

  if (current.includes(key)) {
    return current
  }

  return [...current, key]
}

function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) {
    return min
  }

  return Math.min(max, Math.max(min, value))
}

import type { SeriesKey } from '@/features/energy/chart-series'

export function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        ) : null}
      </div>
      <div className="grid gap-5">{children}</div>
    </section>
  )
}

const ACCENTS = {
  amber: 'accent-amber-500 text-amber-600',
  emerald: 'accent-emerald-500 text-emerald-600',
} as const

export function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit = '',
  accent = 'amber',
  hint,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min: number
  max: number
  step: number
  unit?: string
  accent?: keyof typeof ACCENTS
  hint?: string
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
      {hint ? <span className="text-xs text-slate-400">{hint}</span> : null}
    </div>
  )
}

export function SelectField({
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

export function ToggleField({
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

export function toggleVisibleSeries(
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

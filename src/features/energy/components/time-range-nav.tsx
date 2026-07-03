import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

import {
  canGoNext,
  formatPeriodLabel,
  RANGE_PRESETS,
  resolveTimeRange,
  shiftEndDate,
  todayDateOnly,
} from '@/features/energy/time-range'

export type DashboardSearch = {
  days?: number
  endDate?: string
}

type TimeRangeNavProps = {
  days: number
  endDate?: string
  onChange: (search: DashboardSearch) => void
}

export function TimeRangeNav({ days, endDate, onChange }: TimeRangeNavProps) {
  const range = resolveTimeRange({ days, endDate })
  const allowNext = canGoNext(endDate, days)

  function selectPreset(nextDays: number) {
    onChange({ days: nextDays, endDate: undefined })
  }

  function selectDate(value: string) {
    onChange({ days, endDate: value || undefined })
  }

  function shift(direction: 'prev' | 'next') {
    const nextEndDate = shiftEndDate(endDate, days, direction)
    onChange({ days, endDate: nextEndDate })
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-700">{formatPeriodLabel(range)}</p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shift('prev')}
            aria-label="Periodo precedente"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <label className="relative inline-flex items-center">
            <Calendar className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={endDate ?? ''}
              max={todayDateOnly()}
              onChange={(event) => selectDate(event.target.value)}
              className="rounded-lg border border-slate-300 py-2 pr-3 pl-9 text-sm"
            />
          </label>

          <button
            type="button"
            onClick={() => shift('next')}
            disabled={!allowNext}
            aria-label="Periodo successivo"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {RANGE_PRESETS.map((preset) => (
          <button
            key={preset.days}
            type="button"
            onClick={() => selectPreset(preset.days)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              days === preset.days && !endDate
                ? 'bg-amber-500 text-white'
                : 'bg-slate-50 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100'
            }`}
          >
            {preset.label}
          </button>
        ))}
        {endDate ? (
          <button
            type="button"
            onClick={() => onChange({ days, endDate: undefined })}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-amber-700 ring-1 ring-amber-200 hover:bg-amber-50"
          >
            Torna a oggi
          </button>
        ) : null}
      </div>
    </section>
  )
}

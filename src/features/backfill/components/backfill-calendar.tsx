import type { BackfillDayState, BackfillDayStatus } from '@/features/backfill/types'

const STATE_STYLES: Record<
  BackfillDayState,
  { bg: string; border: string; label: string }
> = {
  complete: {
    bg: 'bg-emerald-100',
    border: 'border-emerald-300',
    label: 'Completo',
  },
  partial: {
    bg: 'bg-orange-100',
    border: 'border-orange-300',
    label: 'Parziale',
  },
  missing: {
    bg: 'bg-slate-100',
    border: 'border-slate-200',
    label: 'Assente',
  },
}

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

type BackfillCalendarProps = {
  year: number
  month: number
  days: BackfillDayStatus[]
  selected: Set<string>
  todayKey: string
  onToggle: (date: string) => void
  onClearSelection: () => void
}

export function BackfillCalendar({
  year,
  month,
  days,
  selected,
  todayKey,
  onToggle,
  onClearSelection,
}: BackfillCalendarProps) {
  const byDate = new Map(days.map((day) => [day.date, day]))
  const firstWeekday = mondayIndex(new Date(Date.UTC(year, month - 1, 1)).getUTCDay())
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const cells: Array<BackfillDayStatus | null> = []

  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push(null)
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    cells.push(
      byDate.get(date) ?? {
        date,
        state: 'missing',
        localCount: 0,
        expectedSamples: 288,
      },
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-500">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label}>{label}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} className="aspect-square" />
          }

          const style = STATE_STYLES[day.state]
          const isSelected = selected.has(day.date)
          const isFuture = day.date > todayKey
          const dayNumber = Number(day.date.slice(8, 10))

          return (
            <button
              key={day.date}
              type="button"
              disabled={isFuture}
              title={`${day.date}: ${style.label} (${day.localCount}/${day.expectedSamples})`}
              onClick={() => onToggle(day.date)}
              className={`aspect-square rounded-md border text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${style.bg} ${style.border} ${
                isSelected ? 'ring-2 ring-amber-500 ring-offset-1' : ''
              }`}
            >
              {dayNumber}
            </button>
          )
        })}
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
        {(Object.keys(STATE_STYLES) as BackfillDayState[]).map((state) => (
          <span key={state} className="inline-flex items-center gap-1.5">
            <span
              className={`inline-block h-3 w-3 rounded border ${STATE_STYLES[state].bg} ${STATE_STYLES[state].border}`}
            />
            {STATE_STYLES[state].label}
          </span>
        ))}
        {selected.size > 0 ? (
          <button
            type="button"
            onClick={onClearSelection}
            className="ml-auto text-amber-700 hover:underline"
          >
            Deseleziona ({selected.size})
          </button>
        ) : null}
      </div>
    </div>
  )
}

function mondayIndex(sundayBased: number) {
  return (sundayBased + 6) % 7
}

import type { ArchiveDayState, ArchiveDayStatus } from '@/features/archive/types'

const STATE_STYLES: Record<
  ArchiveDayState,
  { bg: string; border: string; label: string }
> = {
  missing: {
    bg: 'bg-slate-100',
    border: 'border-slate-200',
    label: 'Assente',
  },
  localOnly: {
    bg: 'bg-sky-100',
    border: 'border-sky-300',
    label: 'Solo locale',
  },
  s3Only: {
    bg: 'bg-violet-100',
    border: 'border-violet-300',
    label: 'Solo S3',
  },
  synced: {
    bg: 'bg-emerald-100',
    border: 'border-emerald-300',
    label: 'Sincronizzato',
  },
  mismatch: {
    bg: 'bg-amber-100',
    border: 'border-amber-300',
    label: 'Differenza',
  },
  partial: {
    bg: 'bg-orange-100',
    border: 'border-orange-300',
    label: 'Parziale',
  },
}

const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']

type ArchiveCalendarProps = {
  year: number
  month: number
  days: ArchiveDayStatus[]
  selected: Set<string>
  onToggle: (date: string) => void
  onClearSelection: () => void
}

export function ArchiveCalendar({
  year,
  month,
  days,
  selected,
  onToggle,
  onClearSelection,
}: ArchiveCalendarProps) {
  const byDate = new Map(days.map((day) => [day.date, day]))
  const firstWeekday = mondayIndex(new Date(Date.UTC(year, month - 1, 1)).getUTCDay())
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const cells: Array<ArchiveDayStatus | null> = []

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
        s3RowCount: null,
        s3ContentHash: null,
      },
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-slate-500">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label}>{label}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {cells.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} />
          }

          const style = STATE_STYLES[day.state]
          const isSelected = selected.has(day.date)

          return (
            <button
              key={day.date}
              type="button"
              onClick={() => onToggle(day.date)}
              title={`${day.date}: ${style.label} · locale ${day.localCount}${day.s3RowCount !== null && day.s3RowCount >= 0 ? ` · S3 ${day.s3RowCount}` : ''}`}
              className={`min-h-16 rounded-lg border p-2 text-left transition ${style.bg} ${style.border} ${
                isSelected ? 'ring-2 ring-amber-500 ring-offset-1' : ''
              }`}
            >
              <div className="text-sm font-semibold text-slate-800">
                {Number(day.date.slice(8, 10))}
              </div>
              <div className="mt-1 text-[10px] leading-tight text-slate-600">
                {style.label}
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {(Object.keys(STATE_STYLES) as ArchiveDayState[]).map((state) => (
          <div key={state} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className={`h-3 w-3 rounded ${STATE_STYLES[state].bg} border ${STATE_STYLES[state].border}`} />
            {STATE_STYLES[state].label}
          </div>
        ))}
        {selected.size > 0 ? (
          <button
            type="button"
            onClick={onClearSelection}
            className="ml-auto text-xs text-amber-700 hover:underline"
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

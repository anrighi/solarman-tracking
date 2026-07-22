import { useState } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw, RotateCcw } from 'lucide-react'

import { BackfillCalendar } from '@/features/backfill/components/backfill-calendar'
import {
  getBackfillMonthStatusFn,
  recoverBackfillDaysFn,
  runFullBackfillFn,
} from '@/features/backfill/server/backfill-api'
import type { BackfillMonthSummary } from '@/features/backfill/types'
import { formatUtcDayKey } from '@/features/energy/day-coverage'

const MONTH_NAMES = [
  'Gennaio',
  'Febbraio',
  'Marzo',
  'Aprile',
  'Maggio',
  'Giugno',
  'Luglio',
  'Agosto',
  'Settembre',
  'Ottobre',
  'Novembre',
  'Dicembre',
]

type BackfillCoveragePanelProps = {
  summary: BackfillMonthSummary
}

export function BackfillCoveragePanel({
  summary: initialSummary,
}: BackfillCoveragePanelProps) {
  const [summary, setSummary] = useState(initialSummary)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const todayKey = formatUtcDayKey(new Date())

  function toggleDay(date: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(date)) {
        next.delete(date)
      } else {
        next.add(date)
      }
      return next
    })
  }

  async function shiftMonth(delta: number) {
    setIsBusy(true)
    setMessage(null)

    try {
      let year = summary.year
      let nextMonth = summary.month + delta

      if (nextMonth < 1) {
        nextMonth = 12
        year -= 1
      }

      if (nextMonth > 12) {
        nextMonth = 1
        year += 1
      }

      const next = await getBackfillMonthStatusFn({
        data: { year, month: nextMonth },
      })
      setSummary(next)
      setSelected(new Set())
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Cambio mese non riuscito')
    } finally {
      setIsBusy(false)
    }
  }

  async function handleRecover(dates: string[]) {
    if (dates.length === 0) {
      setMessage('Nessun giorno da ripristinare.')
      return
    }

    setIsBusy(true)
    setMessage(null)

    try {
      const result = await recoverBackfillDaysFn({
        data: {
          dates,
          year: summary.year,
          month: summary.month,
        },
      })
      setSummary(result.summary)
      setSelected(new Set())
      setMessage(result.message)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Ripristino non riuscito')
    } finally {
      setIsBusy(false)
    }
  }

  async function handleRecoverIncomplete() {
    const incomplete = summary.days
      .filter((day) => day.state !== 'complete' && day.date <= todayKey)
      .map((day) => day.date)

    await handleRecover(incomplete)
  }

  async function handleFullBackfill() {
    setIsBusy(true)
    setMessage(null)

    try {
      const result = await runFullBackfillFn({
        data: {
          year: summary.year,
          month: summary.month,
        },
      })
      setSummary(result.summary)
      setSelected(new Set())
      setMessage(result.message)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Backfill completo non riuscito')
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <CheckpointCard checkpoint={summary.checkpoint} />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Copertura mese</h2>
            <p className="text-sm text-slate-500">
              Completo / parziale / assente in base ai campioni minuti locali.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isBusy}
              onClick={() => shiftMonth(-1)}
              className="rounded-lg border border-slate-300 p-2 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              aria-label="Mese precedente"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[9rem] text-center text-sm font-medium text-slate-800">
              {MONTH_NAMES[summary.month - 1]} {summary.year}
            </span>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => shiftMonth(1)}
              className="rounded-lg border border-slate-300 p-2 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              aria-label="Mese successivo"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <p className="mb-3 text-xs text-slate-500">
          Completi {summary.counts.complete} · Parziali {summary.counts.partial} · Assenti{' '}
          {summary.counts.missing}
        </p>

        <BackfillCalendar
          year={summary.year}
          month={summary.month}
          days={summary.days}
          selected={selected}
          todayKey={todayKey}
          onToggle={toggleDay}
          onClearSelection={() => setSelected(new Set())}
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Azioni</h2>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={isBusy || selected.size === 0}
            onClick={() => handleRecover([...selected])}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 font-medium text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RotateCcw className="h-4 w-4" />
            {isBusy ? 'Operazione in corso...' : 'Ripristina selezionati'}
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={handleRecoverIncomplete}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className="h-4 w-4" />
            Ripristina incompleti del mese
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={handleFullBackfill}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className="h-4 w-4" />
            Esegui backfill completo
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Il ripristino richiama Solarman per i giorni scelti (upsert idempotente). Il backfill
          completo riparte dal checkpoint.
        </p>
      </section>

      {message ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {message}
        </p>
      ) : null}
    </div>
  )
}

function CheckpointCard({
  checkpoint,
}: {
  checkpoint: BackfillMonthSummary['checkpoint']
}) {
  if (!checkpoint) {
    return (
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900 shadow-sm">
        <h2 className="text-lg font-semibold">Stato checkpoint</h2>
        <p className="mt-2 text-sm">Nessun checkpoint — esegui un backfill completo per iniziare.</p>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-800">Stato checkpoint</h2>
      <dl className="mt-3 grid gap-2 text-sm text-slate-700">
        <div className="flex justify-between gap-4">
          <dt>Primo dato</dt>
          <dd>{formatOptionalDate(checkpoint.firstDataAt)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Ultimo sync</dt>
          <dd>{formatOptionalDate(checkpoint.lastSyncedAt)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Nessun dato prima di</dt>
          <dd>{formatOptionalDate(checkpoint.noDataBefore)}</dd>
        </div>
      </dl>
    </section>
  )
}

function formatOptionalDate(value: string | null) {
  if (!value) {
    return '—'
  }

  return new Date(value).toLocaleString('it-IT')
}

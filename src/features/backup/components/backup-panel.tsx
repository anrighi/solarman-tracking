import { useState } from 'react'
import { Database, HardDriveDownload, RotateCcw } from 'lucide-react'

import type { BackupHealth, BackupRun } from '@/features/backup/types'
import {
  restoreFromBackup,
  triggerBackup,
} from '@/features/backup/server/backup-api'

type BackupPanelProps = {
  health: BackupHealth
  runs: BackupRun[]
}

export function BackupPanel({ health: initialHealth, runs: initialRuns }: BackupPanelProps) {
  const [health, setHealth] = useState(initialHealth)
  const [runs, setRuns] = useState(initialRuns)
  const [message, setMessage] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [restoreTarget, setRestoreTarget] = useState<BackupRun | null>(null)
  const [confirmText, setConfirmText] = useState('')

  async function handleTriggerBackup() {
    setIsRunning(true)
    setMessage(null)

    try {
      const result = await triggerBackup()
      setHealth(result.health)
      setRuns(result.runs)
      setMessage('Backup completato.')
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Backup non riuscito'
      setMessage(text)
    } finally {
      setIsRunning(false)
    }
  }

  async function handleRestore() {
    if (!restoreTarget) {
      return
    }

    setIsRunning(true)
    setMessage(null)

    try {
      const result = await restoreFromBackup({ data: { id: restoreTarget.id } })
      setHealth(result.health)
      setRuns(result.runs)
      setMessage(`Ripristino completato da ${restoreTarget.filename}.`)
      setRestoreTarget(null)
      setConfirmText('')
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Ripristino non riuscito'
      setMessage(text)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <HealthCard health={health} />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Azioni</h2>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleTriggerBackup}
            disabled={isRunning}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 font-medium text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Database className="h-4 w-4" />
            {isRunning ? 'Operazione in corso...' : 'Esegui backup ora'}
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Prima di un ripristino, considera di fermare il worker sync per evitare conflitti.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">Cronologia</h2>
        {runs.length === 0 ? (
          <p className="text-sm text-slate-500">Nessun backup registrato.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3 font-medium">Data</th>
                  <th className="py-2 pr-3 font-medium">File</th>
                  <th className="py-2 pr-3 font-medium">Dimensione</th>
                  <th className="py-2 pr-3 font-medium">Origine</th>
                  <th className="py-2 pr-3 font-medium">Stato</th>
                  <th className="py-2 pr-3 font-medium">Cubbit</th>
                  <th className="py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id} className="border-b border-slate-100">
                    <td className="py-3 pr-3 whitespace-nowrap">
                      {formatDate(run.createdAt)}
                    </td>
                    <td className="py-3 pr-3 font-mono text-xs">{run.filename}</td>
                    <td className="py-3 pr-3">{formatBytes(run.sizeBytes)}</td>
                    <td className="py-3 pr-3">{formatSource(run.source)}</td>
                    <td className="py-3 pr-3">
                      <StatusBadge status={run.status} />
                    </td>
                    <td className="py-3 pr-3">{run.remoteSynced ? 'Sì' : 'No'}</td>
                    <td className="py-3">
                      <button
                        type="button"
                        disabled={run.status !== 'success' || isRunning}
                        onClick={() => {
                          setRestoreTarget(run)
                          setConfirmText('')
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <HardDriveDownload className="h-3.5 w-3.5" />
                        Ripristina
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {restoreTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Conferma ripristino</h3>
            <p className="mt-2 text-sm text-slate-600">
              Questa operazione sostituirà tutti i dati del database con il backup{' '}
              <span className="font-mono text-xs">{restoreTarget.filename}</span>.
            </p>
            <p className="mt-2 text-sm text-amber-700">
              Digita <strong>RIPRISTINA</strong> per confermare.
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="RIPRISTINA"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRestoreTarget(null)
                  setConfirmText('')
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700"
              >
                Annulla
              </button>
              <button
                type="button"
                disabled={confirmText !== 'RIPRISTINA' || isRunning}
                onClick={handleRestore}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RotateCcw className="h-4 w-4" />
                Ripristina
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {message ? (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          {message}
        </p>
      ) : null}
    </div>
  )
}

function HealthCard({ health }: { health: BackupHealth }) {
  const styles = {
    ok: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    missing: 'border-amber-200 bg-amber-50 text-amber-900',
    failed: 'border-red-200 bg-red-50 text-red-900',
  } as const

  const labels = {
    ok: 'Backup aggiornato',
    missing: 'Backup mancante o scaduto',
    failed: 'Ultimo tentativo fallito',
  } as const

  return (
    <section className={`rounded-xl border p-6 shadow-sm ${styles[health.status]}`}>
      <h2 className="text-lg font-semibold">{labels[health.status]}</h2>
      <dl className="mt-3 grid gap-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt>Ultimo backup OK</dt>
          <dd>{health.lastSuccessAt ? formatDate(new Date(health.lastSuccessAt)) : '—'}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Ultimo tentativo</dt>
          <dd>{health.lastRunAt ? formatDate(new Date(health.lastRunAt)) : '—'}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Soglia massima</dt>
          <dd>{health.maxAgeHours} ore</dd>
        </div>
        {health.lastSuccessRun ? (
          <div className="flex justify-between gap-4">
            <dt>Ultimo file</dt>
            <dd className="font-mono text-xs">{health.lastSuccessRun.filename}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  )
}

function StatusBadge({ status }: { status: BackupRun['status'] }) {
  const styles = {
    success: 'bg-emerald-100 text-emerald-800',
    failed: 'bg-red-100 text-red-800',
    upload_failed: 'bg-amber-100 text-amber-800',
  } as const

  const labels = {
    success: 'OK',
    failed: 'Fallito',
    upload_failed: 'Upload fallito',
  } as const

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}

function formatDate(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value)
  return date.toLocaleString('it-IT')
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  const kb = bytes / 1024

  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`
  }

  return `${(kb / 1024).toFixed(1)} MB`
}

function formatSource(source: BackupRun['source']) {
  if (source === 'manual') {
    return 'Manuale'
  }

  return 'Programmato'
}

import { Download, RotateCcw, Save } from 'lucide-react'

type SettingsSaveBarProps = {
  isDirty: boolean
  isSaving: boolean
  onSave: () => void
  onReset: () => void
  onExport: () => void
}

export function SettingsSaveBar({
  isDirty,
  isSaving,
  onSave,
  onReset,
  onExport,
}: SettingsSaveBarProps) {
  return (
    <div className="sticky bottom-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white/90 p-3 shadow-sm backdrop-blur">
      <button
        type="button"
        onClick={onSave}
        disabled={isSaving || !isDirty}
        className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 font-medium text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Save className="h-4 w-4" />
        {isSaving ? 'Salvataggio...' : 'Salva'}
      </button>
      <button
        type="button"
        onClick={onReset}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
      >
        <RotateCcw className="h-4 w-4" />
        Ripristina default
      </button>
      <button
        type="button"
        onClick={onExport}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
      >
        <Download className="h-4 w-4" />
        Esporta JSON
      </button>
      {isDirty ? (
        <span className="text-sm text-amber-600">Modifiche non salvate</span>
      ) : null}
    </div>
  )
}

export function SettingsMessage({ message }: { message: string | null }) {
  if (!message) {
    return null
  }

  return (
    <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
      {message}
    </p>
  )
}

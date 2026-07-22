import { useEffect, useState } from 'react'

import { ArchivePanel } from '@/features/archive/components/archive-panel'
import { ArchivePolicySection } from '@/features/archive/components/archive-policy-section'
import { getArchiveMonthStatus } from '@/features/archive/server/archive-api'
import type { ArchiveMonthSummary, ArchiveRun } from '@/features/archive/types'
import type { AppConfig } from '@/lib/config/schema'

type ArchiveSettingsPageProps = {
  config: AppConfig
  summary: ArchiveMonthSummary
  runs: ArchiveRun[]
}

export function ArchiveSettingsPage({
  config,
  summary: initialSummary,
  runs: initialRuns,
}: ArchiveSettingsPageProps) {
  const [summary, setSummary] = useState(initialSummary)
  const [runs, setRuns] = useState(initialRuns)

  useEffect(() => {
    setSummary(initialSummary)
    setRuns(initialRuns)
  }, [initialSummary, initialRuns])

  async function handleMonthChange(year: number, monthNumber: number) {
    const status = await getArchiveMonthStatus({
      data: { year, month: monthNumber },
    })
    setSummary(status.summary)
    setRuns(status.runs)
  }

  return (
    <div className="flex flex-col gap-6">
      <ArchivePolicySection config={config} />
      <ArchivePanel
        config={config}
        summary={summary}
        runs={runs}
        onStatusChange={(nextSummary, nextRuns) => {
          setSummary(nextSummary)
          setRuns(nextRuns)
        }}
        onMonthChange={handleMonthChange}
      />
    </div>
  )
}

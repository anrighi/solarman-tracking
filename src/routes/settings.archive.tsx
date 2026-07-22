import { createFileRoute } from '@tanstack/react-router'

import { ArchiveSettingsPage } from '@/features/archive/components/archive-settings-page'
import { getArchiveMonthStatus } from '@/features/archive/server/archive-api'
import { getAppConfig } from '@/features/settings/server/get-app-config'

export const Route = createFileRoute('/settings/archive')({
  loader: async () => {
    const now = new Date()
    const [config, status] = await Promise.all([
      getAppConfig(),
      getArchiveMonthStatus({
        data: {
          year: now.getUTCFullYear(),
          month: now.getUTCMonth() + 1,
        },
      }),
    ])

    return {
      config,
      summary: status.summary,
      runs: status.runs,
    }
  },
  component: ArchiveSettingsRoute,
})

function ArchiveSettingsRoute() {
  const { config, summary, runs } = Route.useLoaderData()
  return <ArchiveSettingsPage config={config} summary={summary} runs={runs} />
}

import { createFileRoute } from '@tanstack/react-router'

import { getBackfillMonthStatusFn } from '@/features/backfill/server/backfill-api'
import { SyncSettingsPage } from '@/features/settings/components/sync-settings-page'
import { getAppConfig } from '@/features/settings/server/get-app-config'

export const Route = createFileRoute('/settings/sync')({
  loader: async () => {
    const now = new Date()
    const [config, backfillSummary] = await Promise.all([
      getAppConfig(),
      getBackfillMonthStatusFn({
        data: {
          year: now.getUTCFullYear(),
          month: now.getUTCMonth() + 1,
        },
      }),
    ])

    return { config, backfillSummary }
  },
  component: SyncSettingsRoute,
})

function SyncSettingsRoute() {
  const { config, backfillSummary } = Route.useLoaderData()
  return <SyncSettingsPage config={config} backfillSummary={backfillSummary} />
}

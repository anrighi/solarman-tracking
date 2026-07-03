import { createFileRoute } from '@tanstack/react-router'

import { SyncSettingsPage } from '@/features/settings/components/sync-settings-page'
import { getAppConfig } from '@/features/settings/server/get-app-config'

export const Route = createFileRoute('/settings/sync')({
  loader: () => getAppConfig(),
  component: SyncSettingsRoute,
})

function SyncSettingsRoute() {
  const config = Route.useLoaderData()
  return <SyncSettingsPage config={config} />
}

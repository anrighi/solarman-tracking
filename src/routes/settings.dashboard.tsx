import { createFileRoute } from '@tanstack/react-router'

import { DashboardSettingsPage } from '@/features/settings/components/dashboard-settings-page'
import { getAppConfig } from '@/features/settings/server/get-app-config'

export const Route = createFileRoute('/settings/dashboard')({
  loader: () => getAppConfig(),
  component: DashboardSettingsRoute,
})

function DashboardSettingsRoute() {
  const config = Route.useLoaderData()
  return <DashboardSettingsPage config={config} />
}

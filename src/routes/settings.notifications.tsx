import { createFileRoute } from '@tanstack/react-router'

import { NotificationsSettingsPage } from '@/features/settings/components/notifications-settings-page'
import { getAppConfig } from '@/features/settings/server/get-app-config'

export const Route = createFileRoute('/settings/notifications')({
  loader: () => getAppConfig(),
  component: NotificationsSettingsRoute,
})

function NotificationsSettingsRoute() {
  const config = Route.useLoaderData()
  return <NotificationsSettingsPage config={config} />
}

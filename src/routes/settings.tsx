import { createFileRoute } from '@tanstack/react-router'

import { SettingsPanel } from '@/features/settings/components/settings-panel'
import { getAppConfig } from '@/features/settings/server/get-app-config'

export const Route = createFileRoute('/settings')({
  loader: () => getAppConfig(),
  component: SettingsPage,
})

function SettingsPage() {
  const config = Route.useLoaderData()

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <SettingsPanel config={config} />
    </main>
  )
}

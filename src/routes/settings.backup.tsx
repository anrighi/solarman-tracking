import { createFileRoute } from '@tanstack/react-router'

import { BackupSettingsPage } from '@/features/settings/components/backup-settings-page'
import { getBackupStatus } from '@/features/backup/server/backup-api'
import { getAppConfig } from '@/features/settings/server/get-app-config'

export const Route = createFileRoute('/settings/backup')({
  loader: async () => {
    const [config, status] = await Promise.all([getAppConfig(), getBackupStatus()])
    return { config, ...status }
  },
  component: BackupSettingsRoute,
})

function BackupSettingsRoute() {
  const { config, health, runs } = Route.useLoaderData()
  return <BackupSettingsPage config={config} health={health} runs={runs} />
}

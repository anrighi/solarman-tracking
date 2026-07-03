import type { AppConfig } from '@/lib/config/schema'
import type { BackupHealth, BackupRun } from '@/features/backup/types'
import { BackupPanel } from '@/features/backup/components/backup-panel'
import { BackupPolicySection } from '@/features/settings/components/backup-policy-section'

type BackupSettingsPageProps = {
  config: AppConfig
  health: BackupHealth
  runs: BackupRun[]
}

export function BackupSettingsPage({
  config,
  health,
  runs,
}: BackupSettingsPageProps) {
  return (
    <div className="flex flex-col gap-6">
      <BackupPolicySection config={config} />
      <BackupPanel health={health} runs={runs} />
    </div>
  )
}

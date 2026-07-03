import type { AppConfig } from '@/lib/config/schema'
import { useSettingsForm } from '@/features/settings/hooks/use-settings-form'
import {
  Section,
  SliderField,
  ToggleField,
} from '@/features/settings/components/settings-fields'
import {
  SettingsMessage,
  SettingsSaveBar,
} from '@/features/settings/components/settings-save-bar'

type BackupPolicySectionProps = {
  config: AppConfig
}

export function BackupPolicySection({ config: initialConfig }: BackupPolicySectionProps) {
  const form = useSettingsForm(initialConfig)
  const { config, setConfig } = form

  return (
    <>
      <Section
        title="Policy backup"
        description="Soglie per il controllo automatico della regolarità dei backup."
      >
        <SliderField
          label="Soglia backup mancante"
          value={config.backup.maxAgeHours}
          min={1}
          max={168}
          step={1}
          unit=" ore"
          hint="Segnala un problema se l'ultimo backup OK è più vecchio di questa soglia"
          onChange={(value) =>
            setConfig({
              ...config,
              backup: { ...config.backup, maxAgeHours: value },
            })
          }
        />
        <ToggleField
          label="Alert Telegram backup mancante"
          description="Richiede notifiche Telegram attive"
          checked={config.backup.alertOnMissing}
          onChange={(checked) =>
            setConfig({
              ...config,
              backup: { ...config.backup, alertOnMissing: checked },
            })
          }
        />
      </Section>

      <SettingsSaveBar
        isDirty={form.isDirty}
        isSaving={form.isSaving}
        onSave={form.handleSave}
        onReset={form.handleReset}
        onExport={form.handleExport}
      />
      <SettingsMessage message={form.message} />
    </>
  )
}

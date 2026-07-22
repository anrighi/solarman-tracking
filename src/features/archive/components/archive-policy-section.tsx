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

type ArchivePolicySectionProps = {
  config: AppConfig
}

export function ArchivePolicySection({ config: initialConfig }: ArchivePolicySectionProps) {
  const form = useSettingsForm(initialConfig)
  const { config, setConfig } = form

  return (
    <>
      <Section
        title="Policy archivio"
        description="Abilita esportazione/ripristino giorno su Cubbit e indica la finestra calda locale suggerita."
      >
        <ToggleField
          label="Archivio S3 abilitato"
          description="Permette esportazione e ripristino da Impostazioni → Archivio"
          checked={config.archive?.enabled ?? false}
          onChange={(checked) =>
            setConfig({
              ...config,
              archive: {
                enabled: checked,
                hotRetentionDays: config.archive?.hotRetentionDays ?? 90,
              },
            })
          }
        />
        <SliderField
          label="Finestra calda locale"
          value={config.archive?.hotRetentionDays ?? 90}
          min={7}
          max={365}
          step={1}
          unit=" giorni"
          hint="Indicazione operativa: i giorni più vecchi possono vivere su S3 (prune automatico non attivo in F16)"
          onChange={(value) =>
            setConfig({
              ...config,
              archive: {
                enabled: config.archive?.enabled ?? false,
                hotRetentionDays: value,
              },
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

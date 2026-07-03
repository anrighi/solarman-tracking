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

type NotificationsSettingsPageProps = {
  config: AppConfig
}

export function NotificationsSettingsPage({
  config: initialConfig,
}: NotificationsSettingsPageProps) {
  const form = useSettingsForm(initialConfig)
  const { config, setConfig } = form

  return (
    <div className="flex flex-col gap-6">
      <Section
        title="Telegram"
        description="Abilita l'invio di notifiche tramite bot Telegram."
      >
        <ToggleField
          label="Notifiche attive"
          description="Master switch per tutti gli alert Telegram"
          checked={config.telegram.enabled}
          onChange={(checked) =>
            setConfig({
              ...config,
              telegram: { ...config.telegram, enabled: checked },
            })
          }
        />
      </Section>

      <Section
        title="Alert batteria"
        description="Soglie SOC e frequenza degli avvisi batteria."
      >
        <SliderField
          label="SOC basso"
          value={config.battery.socLow}
          min={0}
          max={100}
          step={1}
          unit=" %"
          accent="emerald"
          hint="Alert quando la carica scende sotto questa soglia"
          onChange={(value) =>
            setConfig({
              ...config,
              battery: { ...config.battery, socLow: value },
            })
          }
        />
        <SliderField
          label="SOC alto"
          value={config.battery.socHigh}
          min={0}
          max={100}
          step={1}
          unit=" %"
          accent="emerald"
          hint="Alert quando la carica supera questa soglia"
          onChange={(value) =>
            setConfig({
              ...config,
              battery: { ...config.battery, socHigh: value },
            })
          }
        />
        <SliderField
          label="Cooldown alert"
          value={config.battery.alertCooldownHours}
          min={0}
          max={48}
          step={1}
          unit=" ore"
          hint="Intervallo minimo tra due notifiche dello stesso tipo"
          onChange={(value) =>
            setConfig({
              ...config,
              battery: { ...config.battery, alertCooldownHours: value },
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
    </div>
  )
}

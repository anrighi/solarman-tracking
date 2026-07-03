import { CHART_SERIES } from '@/features/energy/chart-series'
import type { AppConfig } from '@/lib/config/schema'
import { useSettingsForm } from '@/features/settings/hooks/use-settings-form'
import {
  Section,
  SelectField,
  ToggleField,
  toggleVisibleSeries,
} from '@/features/settings/components/settings-fields'
import {
  SettingsMessage,
  SettingsSaveBar,
} from '@/features/settings/components/settings-save-bar'

const DASHBOARD_RANGE_OPTIONS = [
  { label: '24 ore', value: 24 },
  { label: '7 giorni', value: 24 * 7 },
  { label: '30 giorni', value: 24 * 30 },
  { label: '90 giorni', value: 24 * 90 },
]

type DashboardSettingsPageProps = {
  config: AppConfig
}

export function DashboardSettingsPage({
  config: initialConfig,
}: DashboardSettingsPageProps) {
  const form = useSettingsForm(initialConfig)
  const { config, setConfig } = form

  return (
    <div className="flex flex-col gap-6">
      <Section
        title="Intervallo temporale"
        description="Periodo predefinito mostrato all'apertura della dashboard."
      >
        <SelectField
          label="Intervallo predefinito"
          value={config.dashboard.defaultRangeHours}
          options={DASHBOARD_RANGE_OPTIONS}
          onChange={(value) =>
            setConfig({
              ...config,
              dashboard: { ...config.dashboard, defaultRangeHours: value },
            })
          }
        />
      </Section>

      <Section
        title="Grafico energia"
        description="Aspetto e serie visualizzate di default nel grafico principale."
      >
        <ToggleField
          label="Normalizza e leviga curve"
          description="Vista normalizzata (0–100%) con media mobile"
          checked={config.chart.smooth}
          onChange={(checked) =>
            setConfig({
              ...config,
              chart: { ...config.chart, smooth: checked },
            })
          }
        />
        <div className="flex flex-col gap-3">
          <span className="text-sm text-slate-600">Serie visibili di default</span>
          {CHART_SERIES.map((series) => (
            <ToggleField
              key={series.key}
              label={series.name}
              checked={config.chart.visibleSeries.includes(series.key)}
              onChange={(checked) =>
                setConfig({
                  ...config,
                  chart: {
                    ...config.chart,
                    visibleSeries: toggleVisibleSeries(
                      config.chart.visibleSeries,
                      series.key,
                      checked,
                    ),
                  },
                })
              }
            />
          ))}
        </div>
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

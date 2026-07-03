import {
  type AppConfig,
  appConfigSchema,
  defaultAppConfig,
} from '@/lib/config/schema'
import {
  readAppConfigRaw,
  upsertAppConfig,
} from '@/server/db/config-repository'

let cachedConfig: AppConfig | null = null

export function invalidateConfigCache() {
  cachedConfig = null
}

export async function getConfig(): Promise<AppConfig> {
  if (cachedConfig) {
    return cachedConfig
  }

  const raw = await readAppConfigRaw()

  if (!raw) {
    cachedConfig = defaultAppConfig
    return cachedConfig
  }

  cachedConfig = appConfigSchema.parse(raw)
  return cachedConfig
}

export async function updateConfig(partial: Partial<AppConfig>): Promise<AppConfig> {
  const current = await getConfig()
  const merged = appConfigSchema.parse(deepMerge(current, partial))
  await upsertAppConfig(merged)
  cachedConfig = merged
  return merged
}

export async function exportConfigJson(): Promise<string> {
  const config = await getConfig()
  return JSON.stringify(config, null, 2)
}

function deepMerge(current: AppConfig, partial: Partial<AppConfig>): AppConfig {
  return {
    sync: { ...current.sync, ...partial.sync },
    backfill: { ...current.backfill, ...partial.backfill },
    battery: { ...current.battery, ...partial.battery },
    telegram: { ...current.telegram, ...partial.telegram },
    dashboard: { ...current.dashboard, ...partial.dashboard },
    chart: { ...current.chart, ...partial.chart },
    backup: { ...current.backup, ...partial.backup },
  }
}

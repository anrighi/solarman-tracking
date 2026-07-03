import { createServerFn } from '@tanstack/react-start'

import type { AppConfig } from '@/lib/config/schema'
import { appConfigSchema } from '@/lib/config/schema'
import { exportConfigJson, getConfig, updateConfig } from '@/lib/config/service'

export const getAppConfig = createServerFn({ method: 'GET' }).handler(
  async (): Promise<AppConfig> => getConfig(),
)

export const saveAppConfig = createServerFn({ method: 'POST' })
  .validator((data: unknown) => appConfigSchema.parse(data))
  .handler(async ({ data }): Promise<AppConfig> => updateConfig(data))

export const exportAppConfig = createServerFn({ method: 'GET' }).handler(
  async (): Promise<string> => exportConfigJson(),
)

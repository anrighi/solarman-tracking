import { z } from 'zod'

const syncSchema = z
  .object({
    intervalMs: z.number().int().min(60_000).max(3_600_000).default(300_000),
    includeRealtime: z.boolean().default(true),
  })
  .default({})

const backfillSchema = z
  .object({
    maxConsecutiveEmptyDays: z.number().int().min(1).max(90).default(7),
  })
  .default({})

const batterySchema = z
  .object({
    socLow: z.number().min(0).max(100).default(20),
    socHigh: z.number().min(0).max(100).default(95),
    alertCooldownHours: z.number().min(0).max(168).default(4),
  })
  .default({})

const telegramSchema = z
  .object({
    enabled: z.boolean().default(false),
  })
  .default({})

const dashboardSchema = z
  .object({
    defaultRangeHours: z.number().int().min(1).max(24 * 90).default(24),
  })
  .default({})

export const chartSeriesKeys = [
  'production',
  'consumption',
  'gridImport',
  'gridExport',
  'batteryPower',
  'soc',
] as const

const chartSchema = z
  .object({
    visibleSeries: z
      .array(z.enum(chartSeriesKeys))
      .default(['production', 'consumption', 'soc']),
    smooth: z.boolean().default(true),
  })
  .default({})

const backupSchema = z
  .object({
    maxAgeHours: z.number().min(1).max(168).default(26),
    alertOnMissing: z.boolean().default(true),
  })
  .default({})

export const appConfigSchema = z.object({
  sync: syncSchema,
  backfill: backfillSchema,
  battery: batterySchema,
  telegram: telegramSchema,
  dashboard: dashboardSchema,
  chart: chartSchema,
  backup: backupSchema,
})

export type AppConfig = z.infer<typeof appConfigSchema>

export const defaultAppConfig: AppConfig = appConfigSchema.parse({})

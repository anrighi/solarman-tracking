import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import {
  exportDaysToArchive,
  getMonthArchiveStatus,
  hydrateDaysFromArchive,
  listRecentArchiveRuns,
} from '@/features/archive/service'
import type { ArchiveMonthSummary, ArchiveRun } from '@/features/archive/types'
import { getStationId } from '@/server/jobs/sync-solarman'

const monthInputSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
})

const daysInputSchema = z.object({
  days: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1),
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
})

export type ArchiveStatusResponse = {
  summary: ArchiveMonthSummary
  runs: ArchiveRun[]
}

type SerializedArchiveRun = Omit<ArchiveRun, 'createdAt'> & {
  createdAt: string
}

type SerializedArchiveStatusResponse = {
  summary: Omit<ArchiveMonthSummary, 'latestRun'> & {
    latestRun: SerializedArchiveRun | null
  }
  runs: SerializedArchiveRun[]
}

function serializeRun(run: ArchiveRun): SerializedArchiveRun {
  const createdAt =
    run.createdAt instanceof Date ? run.createdAt.toISOString() : String(run.createdAt)

  return {
    ...run,
    createdAt,
  }
}

async function buildStatusResponse(
  stationId: number,
  year: number,
  month: number,
): Promise<SerializedArchiveStatusResponse> {
  let runs: ArchiveRun[] = []

  try {
    runs = await listRecentArchiveRuns(stationId)
  } catch {
    runs = []
  }

  const monthStatus = await getMonthArchiveStatus({ stationId, year, month })

  return {
    summary: {
      ...monthStatus,
      latestRun: monthStatus.latestRun ? serializeRun(monthStatus.latestRun) : null,
    },
    runs: runs.map(serializeRun),
  }
}

export const getArchiveMonthStatus = createServerFn({ method: 'GET' })
  .validator((data: unknown) => monthInputSchema.parse(data ?? {}))
  .handler(async ({ data }): Promise<SerializedArchiveStatusResponse> => {
    return buildStatusResponse(getStationId(), data.year, data.month)
  })

export const exportArchiveDays = createServerFn({ method: 'POST' })
  .validator((data: unknown) => daysInputSchema.parse(data))
  .handler(async ({ data }) => {
    const stationId = getStationId()
    const result = await exportDaysToArchive({ stationId, days: data.days })
    const status = await buildStatusResponse(stationId, data.year, data.month)

    return {
      result: {
        daysProcessed: result.daysProcessed,
        rowsAffected: result.rowsAffected,
        status: result.status,
        errorMessage: result.errorMessage,
        run: serializeRun(result.run),
      },
      ...status,
    }
  })

export const hydrateArchiveDays = createServerFn({ method: 'POST' })
  .validator((data: unknown) => daysInputSchema.parse(data))
  .handler(async ({ data }) => {
    const stationId = getStationId()
    const result = await hydrateDaysFromArchive({ stationId, days: data.days })
    const status = await buildStatusResponse(stationId, data.year, data.month)

    return {
      result: {
        daysProcessed: result.daysProcessed,
        rowsAffected: result.rowsAffected,
        status: result.status,
        errorMessage: result.errorMessage,
        run: serializeRun(result.run),
      },
      ...status,
    }
  })

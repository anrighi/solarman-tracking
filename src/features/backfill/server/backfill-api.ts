import { createServerFn } from '@tanstack/react-start'

import {
  getBackfillMonthStatus,
  recoverBackfillDays,
  runFullBackfillAction,
} from '@/features/backfill/service'
import type {
  FullBackfillActionResult,
  RecoverBackfillResult,
  BackfillMonthSummary,
} from '@/features/backfill/types'

function parseYearMonth(data: unknown) {
  const input = (data ?? {}) as { year?: unknown; month?: unknown }
  const now = new Date()
  const year = input.year == null ? now.getUTCFullYear() : Number(input.year)
  const month = input.month == null ? now.getUTCMonth() + 1 : Number(input.month)

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error('Anno non valido')
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error('Mese non valido')
  }

  return { year, month }
}

export const getBackfillMonthStatusFn = createServerFn({ method: 'GET' })
  .validator((data: unknown) => parseYearMonth(data))
  .handler(async ({ data }): Promise<BackfillMonthSummary> => {
    return getBackfillMonthStatus(data.year, data.month)
  })

export const recoverBackfillDaysFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => {
    if (!data || typeof data !== 'object') {
      throw new Error('Payload non valido')
    }

    const input = data as { dates?: unknown; year?: unknown; month?: unknown }

    if (!Array.isArray(input.dates)) {
      throw new Error('Elenco giorni mancante')
    }

    const dates = input.dates.map((value) => String(value))
    const { year, month } = parseYearMonth(input)

    return { dates, year, month }
  })
  .handler(async ({ data }): Promise<RecoverBackfillResult> => {
    return recoverBackfillDays(data.dates, {
      year: data.year,
      month: data.month,
    })
  })

export const runFullBackfillFn = createServerFn({ method: 'POST' })
  .validator((data: unknown) => {
    const input = (data ?? {}) as {
      maxDays?: unknown
      year?: unknown
      month?: unknown
    }
    const { year, month } = parseYearMonth(input)
    const maxDays =
      input.maxDays == null ? undefined : Number(input.maxDays)

    if (maxDays != null && (!Number.isInteger(maxDays) || maxDays < 1 || maxDays > 3650)) {
      throw new Error('maxDays non valido')
    }

    return { maxDays, year, month }
  })
  .handler(async ({ data }): Promise<FullBackfillActionResult> => {
    return runFullBackfillAction({
      maxDays: data.maxDays,
      year: data.year,
      month: data.month,
    })
  })

import { createServerFn } from '@tanstack/react-start'

import {
  getBackupHealth,
  listBackups,
  restoreFromBackupRunId,
  runBackup,
} from '@/features/backup/service'
import type { BackupHealth, BackupRun } from '@/features/backup/types'

export type BackupStatusResponse = {
  health: BackupHealth
  runs: BackupRun[]
}

export const getBackupStatus = createServerFn({ method: 'GET' }).handler(
  async (): Promise<BackupStatusResponse> => {
    const [health, runs] = await Promise.all([getBackupHealth(), listBackups(20)])
    return { health, runs }
  },
)

export const triggerBackup = createServerFn({ method: 'POST' }).handler(
  async (): Promise<BackupStatusResponse> => {
    const result = await runBackup('manual')

    if (result.error && !result.run) {
      throw new Error(result.error)
    }

    const [health, runs] = await Promise.all([getBackupHealth(), listBackups(20)])
    return { health, runs }
  },
)

export const restoreFromBackup = createServerFn({ method: 'POST' })
  .validator((data: unknown) => {
    if (!data || typeof data !== 'object' || !('id' in data)) {
      throw new Error('ID backup mancante')
    }

    const id = Number((data as { id: unknown }).id)

    if (!Number.isInteger(id) || id <= 0) {
      throw new Error('ID backup non valido')
    }

    return { id }
  })
  .handler(async ({ data }): Promise<BackupStatusResponse> => {
    await restoreFromBackupRunId(data.id)
    const [health, runs] = await Promise.all([getBackupHealth(), listBackups(20)])
    return { health, runs }
  })

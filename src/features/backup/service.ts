import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { getConfig } from '@/lib/config/service'
import { env } from '@/lib/env'
import {
  getBackupRunById,
  getLatestBackupRun,
  getLatestSuccessfulBackupRun,
  insertBackupRun,
  listBackupRuns,
} from '@/features/backup/repository'
import type {
  BackupHealth,
  BackupSource,
  RunBackupResult,
} from '@/features/backup/types'
import { exportConfigJson } from '@/lib/config/service'

const BACKUP_DIR = path.resolve('backups')

function timestamp() {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}_${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}`
}

export function getRcloneRemote() {
  if (process.env.RCLONE_REMOTE) {
    return process.env.RCLONE_REMOTE
  }

  const bucket = process.env.CUBBIT_BUCKET ?? 'solar-tracking-app'
  const prefix = process.env.CUBBIT_BACKUP_PREFIX ?? 'backups'
  return `cubbit:${bucket}/${prefix}`
}

export async function dumpDatabase() {
  await mkdir(BACKUP_DIR, { recursive: true })

  const stamp = timestamp()
  const filename = `solar_tracking_${stamp}.sql.gz`
  const sqlFile = path.join(BACKUP_DIR, `solar_tracking_${stamp}.sql`)
  const gzFile = path.join(BACKUP_DIR, filename)

  const dumpCmd = [
    'mysqldump',
    `-h${env.MYSQL_HOST}`,
    `-P${env.MYSQL_PORT}`,
    `-u${env.MYSQL_USER}`,
    `-p${env.MYSQL_PASSWORD}`,
    '--skip-ssl',
    '--no-tablespaces',
    '--single-transaction',
    '--routines',
    env.MYSQL_DATABASE,
    `> "${sqlFile}"`,
  ].join(' ')

  execSync(dumpCmd, { stdio: 'inherit', shell: '/bin/sh' })
  execSync(`gzip -f "${sqlFile}"`, { stdio: 'inherit', shell: '/bin/sh' })

  const configPath = path.join(BACKUP_DIR, 'app_config.json')
  await writeFile(configPath, await exportConfigJson(), 'utf8')

  const fileStat = await stat(gzFile)

  return {
    filename,
    filePath: gzFile,
    sizeBytes: fileStat.size,
  }
}

export async function restoreDatabase(inputPath: string) {
  const resolved = path.resolve(inputPath)

  if (!existsSync(resolved)) {
    throw new Error(`File non trovato: ${resolved}`)
  }

  const isGz = resolved.endsWith('.gz')
  const sqlPath = isGz ? resolved.replace(/\.gz$/, '') : resolved

  if (isGz) {
    execSync(`gunzip -c "${resolved}" > "${sqlPath}"`, {
      stdio: 'inherit',
      shell: '/bin/sh',
    })
  }

  const restoreCmd = [
    'mysql',
    `-h${env.MYSQL_HOST}`,
    `-P${env.MYSQL_PORT}`,
    `-u${env.MYSQL_USER}`,
    `-p${env.MYSQL_PASSWORD}`,
    '--skip-ssl',
    env.MYSQL_DATABASE,
    `< "${sqlPath}"`,
  ].join(' ')

  execSync(restoreCmd, { stdio: 'inherit', shell: '/bin/sh' })

  if (isGz) {
    execSync(`rm -f "${sqlPath}"`, { stdio: 'inherit', shell: '/bin/sh' })
  }
}

function uploadToRemote() {
  if (!commandExists('rclone')) {
    return { ok: false, error: 'rclone non trovato' }
  }

  const remote = getRcloneRemote()

  try {
    execSync(`rclone copy "${BACKUP_DIR}/" "${remote}"`, {
      stdio: 'inherit',
      shell: '/bin/sh',
    })
    return { ok: true, remote }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { ok: false, error: message }
  }
}

function commandExists(command: string) {
  try {
    execSync(`command -v ${command}`, { stdio: 'ignore', shell: '/bin/sh' })
    return true
  } catch {
    return false
  }
}

export async function runBackup(source: BackupSource): Promise<RunBackupResult> {
  try {
    const dump = await dumpDatabase()
    const upload = uploadToRemote()

    if (!upload.ok) {
      const run = await insertBackupRun({
        filename: dump.filename,
        sizeBytes: dump.sizeBytes,
        status: 'upload_failed',
        source,
        remoteSynced: false,
        errorMessage: upload.error ?? 'Upload fallito',
      })

      return { run, error: upload.error }
    }

    const run = await insertBackupRun({
      filename: dump.filename,
      sizeBytes: dump.sizeBytes,
      status: 'success',
      source,
      remoteSynced: true,
    })

    return { run }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    const run = await insertBackupRun({
      filename: `failed_${timestamp()}.sql.gz`,
      sizeBytes: 0,
      status: 'failed',
      source,
      remoteSynced: false,
      errorMessage: message,
    })

    return { run, error: message }
  }
}

export async function getBackupHealth(): Promise<BackupHealth> {
  const config = await getConfig()
  const maxAgeHours = config.backup.maxAgeHours
  const lastSuccess = await getLatestSuccessfulBackupRun()
  const lastRun = await getLatestBackupRun()

  if (!lastSuccess) {
    return {
      status: 'missing',
      lastSuccessAt: null,
      lastRunAt: lastRun?.createdAt.toISOString() ?? null,
      hoursSinceLastSuccess: null,
      maxAgeHours,
      lastSuccessRun: null,
    }
  }

  const hoursSinceLastSuccess =
    (Date.now() - lastSuccess.createdAt.getTime()) / (1000 * 60 * 60)

  if (hoursSinceLastSuccess > maxAgeHours) {
    return {
      status: 'missing',
      lastSuccessAt: lastSuccess.createdAt.toISOString(),
      lastRunAt: lastRun?.createdAt.toISOString() ?? null,
      hoursSinceLastSuccess,
      maxAgeHours,
      lastSuccessRun: lastSuccess,
    }
  }

  if (lastRun && lastRun.status !== 'success') {
    return {
      status: 'failed',
      lastSuccessAt: lastSuccess.createdAt.toISOString(),
      lastRunAt: lastRun.createdAt.toISOString(),
      hoursSinceLastSuccess,
      maxAgeHours,
      lastSuccessRun: lastSuccess,
    }
  }

  return {
    status: 'ok',
    lastSuccessAt: lastSuccess.createdAt.toISOString(),
    lastRunAt: lastRun?.createdAt.toISOString() ?? null,
    hoursSinceLastSuccess,
    maxAgeHours,
    lastSuccessRun: lastSuccess,
  }
}

export async function listBackups(limit = 20) {
  return listBackupRuns(limit)
}

export async function restoreFromBackupRunId(id: number) {
  const run = await getBackupRunById(id)

  if (!run) {
    throw new Error('Backup non trovato')
  }

  if (run.status !== 'success') {
    throw new Error('Solo i backup completati possono essere ripristinati')
  }

  const filePath = path.join(BACKUP_DIR, run.filename)

  if (!existsSync(filePath)) {
    throw new Error(`File backup non trovato in locale: ${run.filename}`)
  }

  await restoreDatabase(filePath)
  return run
}

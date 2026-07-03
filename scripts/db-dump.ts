#!/usr/bin/env tsx

import { execSync } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { env } from '@/lib/env'
import { exportConfigJson } from '@/lib/config/service'
import { closePool } from '@/server/db/connection'

function timestamp() {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}_${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}`
}

async function main() {
  const backupDir = path.resolve('backups')
  await mkdir(backupDir, { recursive: true })

  const stamp = timestamp()
  const sqlFile = path.join(backupDir, `solar_tracking_${stamp}.sql`)
  const gzFile = `${sqlFile}.gz`

  const dumpCmd = [
    'mysqldump',
    `-h${env.MYSQL_HOST}`,
    `-P${env.MYSQL_PORT}`,
    `-u${env.MYSQL_USER}`,
    `-p${env.MYSQL_PASSWORD}`,
    '--single-transaction',
    '--routines',
    env.MYSQL_DATABASE,
    `> "${sqlFile}"`,
  ].join(' ')

  execSync(dumpCmd, { stdio: 'inherit', shell: '/bin/sh' })
  execSync(`gzip -f "${sqlFile}"`, { stdio: 'inherit', shell: '/bin/sh' })

  const configJson = await exportConfigJson()
  const configPath = path.join(backupDir, 'app_config.json')
  await writeFile(configPath, configJson, 'utf8')

  console.log(`[db:dump] creato ${gzFile}`)
  console.log(`[db:dump] config esportata in ${configPath}`)

  await closePool()
}

main().catch(async (error) => {
  console.error('[db:dump] errore:', error)
  await closePool()
  process.exit(1)
})

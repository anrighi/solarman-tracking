#!/usr/bin/env tsx

import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

import { env } from '@/lib/env'
import { closePool } from '@/server/db/connection'

async function main() {
  const inputPath = process.argv[2]

  if (!inputPath) {
    console.error('Usage: pnpm run db:restore <path-to-backup.sql.gz>')
    process.exit(1)
  }

  const resolved = path.resolve(inputPath)

  if (!existsSync(resolved)) {
    console.error(`[db:restore] file non trovato: ${resolved}`)
    process.exit(1)
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
    env.MYSQL_DATABASE,
    `< "${sqlPath}"`,
  ].join(' ')

  execSync(restoreCmd, { stdio: 'inherit', shell: '/bin/sh' })

  if (isGz) {
    execSync(`rm -f "${sqlPath}"`, { stdio: 'inherit', shell: '/bin/sh' })
  }

  console.log(`[db:restore] ripristino completato da ${resolved}`)
  await closePool()
}

main().catch(async (error) => {
  console.error('[db:restore] errore:', error)
  await closePool()
  process.exit(1)
})

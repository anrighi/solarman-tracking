import type { RowDataPacket } from 'mysql2/promise'

import { getConfig } from '@/lib/config/service'
import { sendTelegramMessage } from '@/lib/telegram/notifier'
import { getBackupHealth } from '@/features/backup/service'
import { withConnection } from '@/server/db/connection'
import { getStationId } from '@/server/jobs/sync-solarman'

export type BackupAlertRunResult = {
  sent: number
  skipped: number
  errors: string[]
}

async function wasAlertSentRecently(input: {
  alertType: string
  stationId: number
  cooldownHours: number
}) {
  if (input.cooldownHours <= 0) {
    return false
  }

  return withConnection(async (connection) => {
    const [rows] = await connection.query<(RowDataPacket & { total: number })[]>(
      `SELECT COUNT(*) AS total
       FROM telegram_messages
       WHERE alert_type = ? AND station_id = ?
         AND sent_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? HOUR)`,
      [input.alertType, input.stationId, input.cooldownHours],
    )

    return Number(rows[0]?.total ?? 0) > 0
  })
}

async function recordTelegramAlert(input: {
  alertType: string
  stationId: number
  messageText: string
  sentAt: Date
}) {
  await withConnection(async (connection) => {
    await connection.query(
      `INSERT INTO telegram_messages (alert_type, station_id, message_text, sent_at)
       VALUES (?, ?, ?, ?)`,
      [input.alertType, input.stationId, input.messageText, input.sentAt],
    )
  })
}

export async function runBackupAlerts(): Promise<BackupAlertRunResult> {
  const config = await getConfig()

  if (!config.telegram.enabled || !config.backup.alertOnMissing) {
    return { sent: 0, skipped: 0, errors: [] }
  }

  const health = await getBackupHealth()

  if (health.status !== 'missing') {
    return { sent: 0, skipped: 0, errors: [] }
  }

  const stationId = getStationId()
  const recentlySent = await wasAlertSentRecently({
    alertType: 'backup_missing',
    stationId,
    cooldownHours: config.battery.alertCooldownHours,
  })

  if (recentlySent) {
    return { sent: 0, skipped: 1, errors: [] }
  }

  const hoursText =
    health.hoursSinceLastSuccess === null
      ? 'nessun backup registrato'
      : `${health.hoursSinceLastSuccess.toFixed(1)} ore fa`

  const message = `⚠️ <b>Backup mancante</b>\nUltimo backup OK: ${hoursText}\nSoglia: ${health.maxAgeHours} ore`

  const result = await sendTelegramMessage(message)

  if (!result.ok) {
    return { sent: 0, skipped: 0, errors: [result.error ?? 'Errore sconosciuto'] }
  }

  await recordTelegramAlert({
    alertType: 'backup_missing',
    stationId,
    messageText: message,
    sentAt: new Date(),
  })

  return { sent: 1, skipped: 0, errors: [] }
}

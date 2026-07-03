import type { RowDataPacket } from 'mysql2/promise'

import type { AppConfig } from '@/lib/config/schema'
import { withConnection } from '@/server/db/connection'

export type BatteryAlertType = 'soc_low' | 'soc_high'

export type BatterySample = {
  batterySoc: number | null
  recordedAt: Date
}

export type BatteryAlert = {
  type: BatteryAlertType
  message: string
}

export function evaluateBatteryAlerts(
  sample: BatterySample,
  config: AppConfig,
): BatteryAlert[] {
  if (sample.batterySoc === null) {
    return []
  }

  const alerts: BatteryAlert[] = []
  const soc = sample.batterySoc
  const time = sample.recordedAt.toLocaleString('it-IT')

  if (soc <= config.battery.socLow) {
    alerts.push({
      type: 'soc_low',
      message: `⚠️ <b>Batteria bassa</b>\nSOC: ${soc.toFixed(0)}% (soglia ${config.battery.socLow}%)\n${time}`,
    })
  }

  if (soc >= config.battery.socHigh) {
    alerts.push({
      type: 'soc_high',
      message: `✅ <b>Batteria piena</b>\nSOC: ${soc.toFixed(0)}% (soglia ${config.battery.socHigh}%)\n${time}`,
    })
  }

  return alerts
}

export async function wasAlertSentRecently(input: {
  alertType: BatteryAlertType
  stationId: number
  cooldownHours: number
}) {
  if (input.cooldownHours <= 0) {
    return false
  }

  return withConnection(async (connection) => {
    const [rows] = await connection.query<
      (RowDataPacket & { total: number })[]
    >(
      `SELECT COUNT(*) AS total
       FROM telegram_messages
       WHERE alert_type = ? AND station_id = ?
         AND sent_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL ? HOUR)`,
      [input.alertType, input.stationId, input.cooldownHours],
    )

    return Number(rows[0]?.total ?? 0) > 0
  })
}

export async function recordTelegramAlert(input: {
  alertType: BatteryAlertType
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

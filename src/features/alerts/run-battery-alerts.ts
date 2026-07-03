import { getConfig } from '@/lib/config/service'
import { sendTelegramMessage } from '@/lib/telegram/notifier'
import {
  evaluateBatteryAlerts,
  recordTelegramAlert,
  wasAlertSentRecently,
} from '@/features/alerts/battery-rules'
import { getEnergySamples } from '@/server/db/energy-repository'
import { getStationId } from '@/server/jobs/sync-solarman'

export type BatteryAlertRunResult = {
  sent: number
  skipped: number
  errors: string[]
}

export async function runBatteryAlerts(): Promise<BatteryAlertRunResult> {
  const config = await getConfig()

  if (!config.telegram.enabled) {
    return { sent: 0, skipped: 0, errors: [] }
  }

  const stationId = getStationId()
  const to = new Date()
  const from = new Date(to.getTime() - 10 * 60_000)
  const rows = await getEnergySamples({ stationId, from, to })
  const latest = rows.at(-1)

  if (!latest || latest.battery_soc === null) {
    return { sent: 0, skipped: 0, errors: [] }
  }

  const sample = {
    batterySoc: Number(latest.battery_soc),
    recordedAt: latest.recorded_at,
  }

  const alerts = evaluateBatteryAlerts(sample, config)
  let sent = 0
  let skipped = 0
  const errors: string[] = []

  for (const alert of alerts) {
    const recentlySent = await wasAlertSentRecently({
      alertType: alert.type,
      stationId,
      cooldownHours: config.battery.alertCooldownHours,
    })

    if (recentlySent) {
      skipped += 1
      continue
    }

    const result = await sendTelegramMessage(alert.message)

    if (!result.ok) {
      errors.push(result.error ?? 'Errore sconosciuto')
      continue
    }

    await recordTelegramAlert({
      alertType: alert.type,
      stationId,
      messageText: alert.message,
      sentAt: new Date(),
    })

    sent += 1
  }

  return { sent, skipped, errors }
}

import { env } from '@/lib/env'

export type TelegramSendResult = {
  ok: boolean
  messageId?: number
  error?: string
}

export async function sendTelegramMessage(text: string): Promise<TelegramSendResult> {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    return { ok: false, error: 'Credenziali Telegram mancanti' }
  }

  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: env.TELEGRAM_CHAT_ID,
      text,
      parse_mode: 'HTML',
    }),
  })

  if (!response.ok) {
    return { ok: false, error: `Telegram API ${response.status}` }
  }

  const payload = (await response.json()) as {
    ok: boolean
    result?: { message_id: number }
    description?: string
  }

  if (!payload.ok) {
    return { ok: false, error: payload.description ?? 'Invio non riuscito' }
  }

  return { ok: true, messageId: payload.result?.message_id }
}

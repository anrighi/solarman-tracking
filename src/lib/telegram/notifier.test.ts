import { describe, expect, it } from 'vitest'

import { sendTelegramMessage } from '@/lib/telegram/notifier'

describe('sendTelegramMessage', () => {
  it('returns error when credentials missing', async () => {
    const result = await sendTelegramMessage('test')
    expect(result.ok).toBe(false)
    expect(result.error).toContain('Telegram')
  })
})

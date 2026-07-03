import { describe, expect, it } from 'vitest'

import { envSchema } from '@/lib/env'

describe('envSchema', () => {
  it('applica default per MySQL in dev locale', () => {
    const parsed = envSchema.parse({})

    expect(parsed.MYSQL_HOST).toBe('127.0.0.1')
    expect(parsed.MYSQL_DATABASE).toBe('solar_tracking')
    expect(parsed.NODE_ENV).toBe('development')
  })

  it('accetta override Docker con host mysql', () => {
    const parsed = envSchema.parse({
      MYSQL_HOST: 'mysql',
      MYSQL_USER: 'solartracking',
      MYSQL_PASSWORD: 'solartracking_pwd',
      MYSQL_DATABASE: 'solar_tracking',
    })

    expect(parsed.MYSQL_HOST).toBe('mysql')
  })

  it('rifiuta email Solarman non valida', () => {
    expect(() =>
      envSchema.parse({ SOLARMAN_EMAIL: 'non-email' }),
    ).toThrow()
  })
})

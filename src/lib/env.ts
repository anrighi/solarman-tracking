import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),

  MYSQL_HOST: z.string().default('127.0.0.1'),
  MYSQL_PORT: z.string().default('3306'),
  MYSQL_USER: z.string().default('solartracking'),
  MYSQL_PASSWORD: z.string().default('solartracking_pwd'),
  MYSQL_DATABASE: z.string().default('solar_tracking'),

  SOLARMAN_API_URL: z.string().url().optional(),
  SOLARMAN_APP_ID: z.string().optional(),
  SOLARMAN_APP_SECRET: z.string().optional(),
  SOLARMAN_EMAIL: z.string().email().optional(),
  SOLARMAN_PASSWORD: z.string().optional(),
  SOLARMAN_STATION_ID: z.string().optional(),

  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),
  LLM_ENDPOINT: z.string().url().optional(),
  LLM_MODEL: z.string().optional(),
});

const definedEnv = Object.fromEntries(
  Object.entries(process.env).filter(([, value]) => value !== ''),
);

export const env = envSchema.parse(definedEnv);

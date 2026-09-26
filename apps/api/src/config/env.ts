import { config } from 'dotenv';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Não usar override: true — em Docker o JWT_* do compose deve prevalecer.
config({ path: resolve(__dirname, '../../../.env') });
config({ path: resolve(__dirname, '../../.env') });

if (process.env.DATABASE_URL?.includes('@localhost')) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace('@localhost', '@127.0.0.1');
}

const envSchema = z.object({
  API_PORT: z.coerce.number().default(3003),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
  JWT_SECRET: z.string().min(8).default('dev-jwt-secret-change-me'),
  JWT_REFRESH_SECRET: z.string().min(8).default('dev-refresh-secret-change-me'),
  CORS_ORIGIN: z.string().default('http://localhost:5178'),
  APP_URL: z.string().default('http://localhost:5178'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  RATE_LIMIT_API_MAX: z.coerce.number().default(1000),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().default(30),
  RATE_LIMIT_PUBLIC_MAX: z.coerce.number().default(120),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Variáveis de ambiente inválidas:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

const WEAK_SECRET_MARKERS = ['dev-', 'change-me', 'altere-', 'secret-change', 'password', '123456'];

function looksWeak(value: string): boolean {
  const lower = value.toLowerCase();
  return WEAK_SECRET_MARKERS.some((m) => lower.includes(m)) || value.length < 16;
}

if (env.NODE_ENV === 'production') {
  const checks: Array<[string, string]> = [
    ['JWT_SECRET', env.JWT_SECRET],
    ['JWT_REFRESH_SECRET', env.JWT_REFRESH_SECRET],
  ];
  const weak = checks.filter(([, v]) => looksWeak(v)).map(([k]) => k);
  if (weak.length) {
    console.error(
      `[mucifrar-api] Secrets fracos/default em produção: ${weak.join(', ')}. Rotacione antes do go-live.`,
    );
    process.exit(1);
  }
}

export function corsOrigins(): string[] {
  return env.CORS_ORIGIN.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

import { z } from 'zod';

const DEV_JWT_SECRET = 'dev-only-jwt-secret-change-me';

const schema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1).default('postgresql://hatlanh:hatlanh@localhost:5432/hat_lanh'),
  JWT_SECRET: z.string().min(8).default(DEV_JWT_SECRET),
  /** Fake social login (POST /auth/dev-login) is enabled ONLY when this is explicitly 'dev'. */
  OAUTH_MODE: z.enum(['dev', 'live']).optional(),
  /** Per-IP limit per minute for POST /auth/login and /auth/register (global default stays 300/min). */
  AUTH_RATE_LIMIT: z.coerce.number().int().positive().default(10),
  CORS_ORIGINS: z.string().default('http://localhost:3001,http://localhost:3002'),
});

export interface Env {
  nodeEnv: string;
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  oauthMode: 'dev' | 'live';
  corsOrigins: string[];
  authRateLimit: number;
}

/** Reads and validates environment variables (call lazily so tests can set them first). */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment: ${detail}`);
  }
  const e = parsed.data;
  const production = e.NODE_ENV === 'production';
  if (production && (!source.JWT_SECRET || e.JWT_SECRET === DEV_JWT_SECRET)) {
    throw new Error('Invalid environment: JWT_SECRET is required in production and must not be the dev default');
  }
  return {
    nodeEnv: e.NODE_ENV,
    port: e.PORT,
    databaseUrl: e.DATABASE_URL,
    jwtSecret: e.JWT_SECRET,
    // Unset means 'live' (dev-login hidden) in every environment: it must be opted into explicitly.
    oauthMode: e.OAUTH_MODE ?? 'live',
    authRateLimit: e.AUTH_RATE_LIMIT,
    corsOrigins: e.CORS_ORIGINS.split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  };
}

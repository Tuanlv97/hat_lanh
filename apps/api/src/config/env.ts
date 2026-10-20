import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1).default('postgresql://hatlanh:hatlanh@localhost:5432/hat_lanh'),
  JWT_SECRET: z.string().min(8).default('dev-only-jwt-secret-change-me'),
  OAUTH_MODE: z.enum(['dev', 'live']).optional(),
  CORS_ORIGINS: z.string().default('http://localhost:3001,http://localhost:3002'),
});

export interface Env {
  nodeEnv: string;
  port: number;
  databaseUrl: string;
  jwtSecret: string;
  oauthMode: 'dev' | 'live';
  corsOrigins: string[];
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
  if (production && !source.JWT_SECRET) throw new Error('Invalid environment: JWT_SECRET is required in production');
  return {
    nodeEnv: e.NODE_ENV,
    port: e.PORT,
    databaseUrl: e.DATABASE_URL,
    jwtSecret: e.JWT_SECRET,
    oauthMode: e.OAUTH_MODE ?? (production ? 'live' : 'dev'),
    corsOrigins: e.CORS_ORIGINS.split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  };
}

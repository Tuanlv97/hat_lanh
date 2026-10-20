import { execSync } from 'node:child_process';
import path from 'node:path';
import { useTestDatabase } from './test-env';

/** Applies all Prisma migrations to the test database once per Jest run. */
export default async function globalSetup(): Promise<void> {
  const url = useTestDatabase();
  execSync('npx prisma migrate deploy', {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  });
}

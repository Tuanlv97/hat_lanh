import path from 'node:path';
import { config } from 'dotenv';

const DEFAULT_TEST_DATABASE_URL = 'postgresql://hatlanh:hatlanh@localhost:5432/hat_lanh_test';

/**
 * Points DATABASE_URL at the test database (hat_lanh_test).
 * Used by Jest globalSetup (before migrations) and setupFiles (in each test context).
 */
export function useTestDatabase(): string {
  config({ path: path.resolve(__dirname, '../../../.env') });
  const url = process.env.TEST_DATABASE_URL || DEFAULT_TEST_DATABASE_URL;
  process.env.DATABASE_URL = url;
  return url;
}

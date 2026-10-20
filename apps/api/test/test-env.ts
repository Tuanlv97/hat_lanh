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
  const dbName = new URL(url).pathname.replace(/^\//, '');
  if (!dbName.endsWith('_test')) {
    throw new Error(
      `Refusing to run tests: database "${dbName}" does not end with "_test". Set TEST_DATABASE_URL to a dedicated test database.`,
    );
  }
  process.env.DATABASE_URL = url;
  return url;
}

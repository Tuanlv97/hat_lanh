import type { Config } from 'jest';

// Tests share one database (hat_lanh_test): always run with --runInBand (see "test" script).
const config: Config = {
  rootDir: '.',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js', 'json'],
  testRegex: '.*\\.(test|spec)\\.ts$',
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }] },
  globalSetup: '<rootDir>/test/global-setup.ts',
  setupFiles: ['<rootDir>/test/setup-env.ts'],
  testTimeout: 60000,
};

export default config;

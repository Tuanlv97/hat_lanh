import { useTestDatabase } from './test-env';

useTestDatabase();
// e2e suites log in many times from one IP; keep the stricter auth throttle out of their way.
process.env.AUTH_RATE_LIMIT = '10000';

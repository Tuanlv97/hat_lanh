import { loadEnv } from './env';

describe('loadEnv', () => {
  it('OAUTH_MODE unset -> live (dev-login off) in development too', () => {
    expect(loadEnv({ NODE_ENV: 'development' }).oauthMode).toBe('live');
    expect(loadEnv({}).oauthMode).toBe('live');
  });

  it('OAUTH_MODE=dev is honoured only when set explicitly', () => {
    expect(loadEnv({ OAUTH_MODE: 'dev' }).oauthMode).toBe('dev');
  });

  it('production refuses a missing JWT_SECRET or the hard-coded dev default', () => {
    expect(() => loadEnv({ NODE_ENV: 'production' })).toThrow(/JWT_SECRET/);
    expect(() => loadEnv({ NODE_ENV: 'production', JWT_SECRET: 'dev-only-jwt-secret-change-me' })).toThrow(/JWT_SECRET/);
    expect(loadEnv({ NODE_ENV: 'production', JWT_SECRET: 'a-real-long-random-secret' }).oauthMode).toBe('live');
  });
});

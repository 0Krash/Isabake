const { isDevAuthAllowed } = require('../../middleware/auth');

describe('auth middleware config', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  test('dev auth is isolated outside production by default', () => {
    process.env = {
      ...originalEnv,
      ENABLE_DEV_AUTH: '',
      NODE_ENV: 'production',
    };

    expect(isDevAuthAllowed()).toBe(false);

    process.env = {
      ...originalEnv,
      ENABLE_DEV_AUTH: 'true',
      NODE_ENV: 'production',
    };

    expect(isDevAuthAllowed()).toBe(true);
  });
});

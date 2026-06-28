import { getSyncBaseUrl, validateSyncConfig } from './syncConfig';

describe('syncConfig', () => {
  test('returns explicit baseUrl without trailing slash', () => {
    expect(getSyncBaseUrl({ baseUrl: 'http://localhost:3000/' })).toBe(
      'http://localhost:3000',
    );
  });

  test('reports missing sync base URL clearly', () => {
    expect(validateSyncConfig({ baseUrl: '' })).toEqual({
      baseUrl: '',
      error: 'sync_base_url_missing',
      ok: false,
    });
  });

  test('rejects invalid sync base URL', () => {
    expect(validateSyncConfig({ baseUrl: 'not a url' })).toEqual({
      baseUrl: 'not a url',
      error: 'sync_base_url_invalid',
      ok: false,
    });
  });

  test('accepts http and https URLs', () => {
    expect(validateSyncConfig({ baseUrl: 'http://localhost:3000' })).toEqual({
      baseUrl: 'http://localhost:3000',
      error: null,
      ok: true,
    });
    expect(validateSyncConfig({ baseUrl: 'https://sync.example.test' })).toEqual({
      baseUrl: 'https://sync.example.test',
      error: null,
      ok: true,
    });
  });
});

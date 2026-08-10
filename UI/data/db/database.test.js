const mockDb = {
  execAsync: jest.fn(),
};
const mockOpenDatabaseAsync = jest.fn(async () => mockDb);
const mockRunMigrations = jest.fn(async () => 3);

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: (...args) => mockOpenDatabaseAsync(...args),
}));

jest.mock('./migrations', () => ({
  runMigrations: (...args) => mockRunMigrations(...args),
}));

describe('database initialization', () => {
  beforeEach(() => {
    jest.resetModules();
    mockDb.execAsync.mockReset();
    mockOpenDatabaseAsync.mockClear();
    mockRunMigrations.mockClear();
  });

  test('configures SQLite before running migrations', async () => {
    const { initDatabase } = require('./database');

    await initDatabase();

    expect(mockDb.execAsync).toHaveBeenCalledWith(
      expect.stringContaining('PRAGMA busy_timeout = 5000'),
    );
    expect(mockDb.execAsync).toHaveBeenCalledWith(
      expect.stringContaining('PRAGMA journal_mode = WAL'),
    );
    expect(mockRunMigrations).toHaveBeenCalledWith(mockDb);
  });
});

const mockDb = {
  execAsync: jest.fn(),
};

jest.mock('./database', () => ({
  initDatabase: jest.fn(async () => mockDb),
}));

import { runLocalTransaction } from './localTransaction';

describe('runLocalTransaction', () => {
  beforeEach(() => {
    mockDb.execAsync.mockReset();
    delete mockDb.withExclusiveTransactionAsync;
    delete mockDb.withTransactionAsync;
  });

  test('returns the callback result when commit succeeds', async () => {
    const result = await runLocalTransaction(async () => ({
      ok: true,
      value: 'returned',
    }));

    expect(result).toEqual({ ok: true, value: 'returned' });
    expect(mockDb.execAsync).toHaveBeenCalledWith('BEGIN TRANSACTION;');
    expect(mockDb.execAsync).toHaveBeenCalledWith('COMMIT;');
  });

  test('rolls back and propagates callback errors', async () => {
    await expect(
      runLocalTransaction(async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(mockDb.execAsync).toHaveBeenCalledWith('BEGIN TRANSACTION;');
    expect(mockDb.execAsync).toHaveBeenCalledWith('ROLLBACK;');
  });
});

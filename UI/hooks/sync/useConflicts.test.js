jest.mock('../../data/sync/conflictService', () => ({
  getConflictDetails: jest.fn(),
  getConflictSummary: jest.fn(),
  resolveConflictPreferLocal: jest.fn(),
  resolveConflictPreferRemote: jest.fn(),
}));

import {
  getConflictSummary,
} from '../../data/sync/conflictService';
import {
  loadConflictsSnapshot,
  resolveConfirmedConflict,
  resolveConflictWithRefresh,
} from './useConflicts';

describe('useConflicts helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('loads summary and conflict list snapshot', async () => {
    getConflictSummary.mockResolvedValueOnce({
      conflictDocumentCount: 1,
      documents: [
        {
          collection: 'recipes',
          localId: 'recipe_1',
        },
      ],
    });

    await expect(loadConflictsSnapshot()).resolves.toEqual({
      conflicts: [
        {
          collection: 'recipes',
          localId: 'recipe_1',
        },
      ],
      summary: {
        conflictDocumentCount: 1,
        documents: [
          {
            collection: 'recipes',
            localId: 'recipe_1',
          },
        ],
      },
    });
  });

  test('does not resolve without confirmation', async () => {
    const resolveLocal = jest.fn();
    const resolveRemote = jest.fn();

    await expect(
      resolveConfirmedConflict({
        action: null,
        conflict: { collection: 'recipes', localId: 'recipe_1' },
        resolveLocal,
        resolveRemote,
      }),
    ).resolves.toEqual({
      ok: false,
      reason: 'confirmation_required',
      skipped: true,
    });

    expect(resolveLocal).not.toHaveBeenCalled();
    expect(resolveRemote).not.toHaveBeenCalled();
  });

  test('prefer local calls resolver after confirmation', async () => {
    const conflict = { collection: 'recipes', localId: 'recipe_1' };
    const resolveLocal = jest.fn(async () => ({ ok: true }));
    const resolveRemote = jest.fn();

    await expect(
      resolveConfirmedConflict({
        action: 'local',
        conflict,
        resolveLocal,
        resolveRemote,
      }),
    ).resolves.toEqual({ ok: true });

    expect(resolveLocal).toHaveBeenCalledWith(conflict);
    expect(resolveRemote).not.toHaveBeenCalled();
  });

  test('prefer remote calls resolver after confirmation', async () => {
    const conflict = { collection: 'recipes', localId: 'recipe_1' };
    const resolveLocal = jest.fn();
    const resolveRemote = jest.fn(async () => ({ ok: true }));

    await expect(
      resolveConfirmedConflict({
        action: 'remote',
        conflict,
        resolveLocal,
        resolveRemote,
      }),
    ).resolves.toEqual({ ok: true });

    expect(resolveLocal).not.toHaveBeenCalled();
    expect(resolveRemote).toHaveBeenCalledWith(conflict);
  });

  test('resolving through service refreshes conflict data', async () => {
    const conflict = { collection: 'recipes', localId: 'recipe_1' };
    const refresh = jest.fn(async () => ({ conflicts: [] }));
    const resolveService = jest.fn(async () => ({ ok: true }));

    await expect(
      resolveConflictWithRefresh({
        conflict,
        refresh,
        resolveService,
      }),
    ).resolves.toEqual({ ok: true });

    expect(resolveService).toHaveBeenCalledWith({
      collection: 'recipes',
      documentId: 'recipe_1',
    });
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});

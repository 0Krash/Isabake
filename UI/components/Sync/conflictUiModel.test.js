import {
  getConflictKey,
  getConflictReason,
  getConflictScreenState,
  getRemotePreviewData,
  groupConflictsByCollection,
  stringifyPreviewData,
} from './conflictUiModel';

describe('conflictUiModel', () => {
  test('stringifies preview data and handles empty values', () => {
    expect(stringifyPreviewData(null)).toBe('Sin datos');
    expect(stringifyPreviewData({ name: 'Pan' })).toContain('"name": "Pan"');
  });

  test('gets remote preview data from supported detail shapes', () => {
    expect(
      getRemotePreviewData({
        remoteDocument: { document: { name: 'Remote document' } },
      }),
    ).toEqual({ name: 'Remote document' });

    expect(
      getRemotePreviewData({
        remoteDocument: { data: { name: 'Remote data' } },
      }),
    ).toEqual({ name: 'Remote data' });
  });

  test('builds readable conflict metadata', () => {
    expect(
      getConflictReason({
        conflictMetadata: { reason: 'server_version_mismatch' },
      }),
    ).toBe('server_version_mismatch');
    expect(getConflictReason({ syncStatus: 'conflict' })).toBe('conflict');
  });

  test('groups conflicts by collection', () => {
    expect(
      groupConflictsByCollection([
        { collection: 'recipes' },
        { collection: 'recipes' },
        { collection: 'inventory' },
      ]),
    ).toEqual({
      inventory: 1,
      recipes: 2,
    });
  });

  test('derives empty, list, and detail screen state', () => {
    expect(getConflictScreenState()).toEqual({
      hasConflicts: false,
      selectedKey: null,
      totalConflicts: 0,
    });

    const selectedConflict = {
      collection: 'recipes',
      localId: 'recipe_1',
    };

    expect(getConflictKey(selectedConflict)).toBe('recipes:recipe_1');
    expect(
      getConflictScreenState({
        conflicts: [selectedConflict],
        selectedConflict,
        summary: { conflictDocumentCount: 4 },
      }),
    ).toEqual({
      hasConflicts: true,
      selectedKey: 'recipes:recipe_1',
      totalConflicts: 4,
    });
  });
});

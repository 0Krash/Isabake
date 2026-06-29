import {
  getConflictResolutionState,
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

  test('derives conflict resolution button availability', () => {
    expect(
      getConflictResolutionState({
        localData: { name: 'Local' },
        remoteDocument: null,
      }),
    ).toEqual({
      missingLocalDocument: false,
      missingRemoteDocument: true,
      remoteUnavailableMessage:
        'Remote version is not available for this conflict. Choose Prefer local or resolve manually.',
      resolvablePreferLocal: true,
      resolvablePreferRemote: false,
    });

    expect(
      getConflictResolutionState({
        localData: { name: 'Local' },
        remoteDocument: { document: { name: 'Remote' } },
      }),
    ).toEqual(
      expect.objectContaining({
        missingRemoteDocument: false,
        resolvablePreferLocal: true,
        resolvablePreferRemote: true,
      }),
    );
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
      preferLocalResolvableCount: 0,
      preferRemoteResolvableCount: 0,
      selectedKey: null,
      totalConflicts: 0,
      unresolvedMissingRemoteCount: 0,
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
        summary: {
          conflictDocumentCount: 4,
          preferLocalResolvableCount: 3,
          preferRemoteResolvableCount: 2,
          unresolvedMissingRemoteCount: 1,
        },
      }),
    ).toEqual({
      hasConflicts: true,
      preferLocalResolvableCount: 3,
      preferRemoteResolvableCount: 2,
      selectedKey: 'recipes:recipe_1',
      totalConflicts: 4,
      unresolvedMissingRemoteCount: 1,
    });
  });
});

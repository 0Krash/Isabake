const fs = require('fs');
const path = require('path');

describe('BackupStatusIndicator integration', () => {
  const read = (relativePath) =>
    fs.readFileSync(path.join(__dirname, '../../', relativePath), 'utf8');

  test('indicator component uses friendly backup labels only', () => {
    const source = read('components/Sync/BackupStatusIndicator.js');

    expect(source).toContain('BackupStatusIndicator');
    expect(source).not.toMatch(
      /push|pull|cursor|groupId|serverVersion|sync_outbox|raw JSON/i,
    );
  });

  test('main screens render the indicator without direct sync execution', () => {
    [
      'screens/TransactionBalance/TransactionBalanceScreen.js',
      'screens/RecipeBook/RecipeBookScreen.js',
      'screens/Inventory/InventoryScreen.js',
    ].forEach((screenPath) => {
      const source = read(screenPath);

      expect(source).toContain('BackupStatusIndicator');
      expect(source).not.toMatch(
        /runSync\(|pushPendingChanges|pullRemoteChanges|runAutoSyncNow|notifyAutoSyncNeeded/,
      );
    });
  });

  test('App keeps three primary tabs and only passes conflict navigation callback', () => {
    const appSource = read('App.js');

    expect(appSource).toContain("setActiveTab('conflicts')");
    expect(appSource).not.toContain('runAutoSyncNow');
    expect(appSource).not.toMatch(
      /runSync\(|pushPendingChanges|pullRemoteChanges/,
    );
    expect(appSource).not.toContain('connectivity_restored');
  });
});

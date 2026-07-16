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

      expect(source).toContain('WorkspaceContextIndicator');
      expect(source).toContain('onOpenSync={onOpenSync}');
      expect(source).toContain('onOpenWorkspace={onOpenWorkspace}');
      expect(source).not.toMatch(
        /runSync\(|pushPendingChanges|pullRemoteChanges|runAutoSyncNow|notifyAutoSyncNeeded/,
      );
    });
  });

  test('App keeps three primary tabs and only passes navigation callbacks', () => {
    const appSource = read('App.js');

    expect(appSource).toContain("setActiveTab('conflicts')");
    expect(appSource).toContain("setActiveTab('sync')");
    expect(appSource).toContain("setActiveTab('workspace')");
    expect(appSource).not.toContain('runAutoSyncNow');
    expect(appSource).not.toMatch(
      /runSync\(|pushPendingChanges|pullRemoteChanges/,
    );
    expect(appSource).not.toContain('connectivity_restored');
  });

  test('main add buttons stay hidden until the first item exists', () => {
    const transactionsSource = read(
      'screens/TransactionBalance/TransactionBalanceScreen.js',
    );
    const transactionListSource = read(
      'components/TransactionBalance/TransactionDetail.js',
    );
    const recipesSource = read('screens/RecipeBook/RecipeBookScreen.js');
    const inventorySource = read('screens/Inventory/InventoryScreen.js');

    expect(transactionsSource).toContain('transactions.length > 0');
    expect(transactionListSource).toContain('Crear movimiento');
    expect(recipesSource).toContain('hasRecipes &&');
    expect(recipesSource).toContain('Crear receta');
    expect(inventorySource).toContain('hasInventoryItems &&');
    expect(inventorySource).toContain('Crear ingrediente');
  });

  test('read-only workspaces hide write actions in main screens', () => {
    const transactionsSource = read(
      'screens/TransactionBalance/TransactionBalanceScreen.js',
    );
    const transactionListSource = read(
      'components/TransactionBalance/TransactionDetail.js',
    );
    const transactionRowSource = read(
      'components/TransactionBalance/TransactionDetailContainer.js',
    );
    const recipesSource = read('screens/RecipeBook/RecipeBookScreen.js');
    const inventorySource = read('screens/Inventory/InventoryScreen.js');

    expect(transactionsSource).toContain('canWrite && transactions.length > 0');
    expect(transactionListSource).toContain('canWrite ? (');
    expect(transactionRowSource).toContain('if (!canWrite)');
    expect(recipesSource).toContain('canWrite && hasRecipes');
    expect(recipesSource).toContain('canManage={canWrite}');
    expect(inventorySource).toContain('canWrite && hasInventoryItems');
    expect(inventorySource).toContain('canManageOptions={canWrite}');
  });

  test('main screens keep the business card as the primary header', () => {
    const transactionsSource = read(
      'screens/TransactionBalance/TransactionBalanceScreen.js',
    );
    const recipesSource = read('screens/RecipeBook/RecipeBookScreen.js');
    const inventorySource = read('screens/Inventory/InventoryScreen.js');

    expect(transactionsSource).not.toContain('title="Transacciones"');
    expect(recipesSource).not.toContain('title="Recetario"');
    expect(inventorySource).not.toContain('title="Inventario"');
    expect(recipesSource).not.toContain('title="Filtros"');
    expect(inventorySource).not.toContain('title="Filtros"');
    expect(recipesSource).not.toContain(' de ${recipes.length} recetas');
    expect(inventorySource).not.toContain(
      ' de ${inventoryItems.length} ingredientes',
    );

    [transactionsSource, recipesSource, inventorySource].forEach((source) => {
      expect(source).toContain('borderTopLeftRadius: 8');
      expect(source).toContain('borderTopRightRadius: 8');
    });
  });

  test('main screens support manual pull-to-refresh without direct sync execution', () => {
    [
      'screens/TransactionBalance/TransactionBalanceScreen.js',
      'screens/RecipeBook/RecipeBookScreen.js',
      'screens/Inventory/InventoryScreen.js',
    ].forEach((screenPath) => {
      const source = read(screenPath);

      expect(source).toContain('refreshNetworkStatus');
      expect(source).toContain("runManualSyncAction({ action: 'full' })");
      expect(source).toContain('refreshing={refreshing}');
      expect(source).toContain('onRefresh={handleRefresh}');
      expect(source).not.toMatch(
        /runSync\(|pushPendingChanges|pullRemoteChanges|runAutoSyncNow|notifyAutoSyncNeeded/,
      );
    });

    const recipesSource = read('screens/RecipeBook/RecipeBookScreen.js');
    const inventorySource = read('screens/Inventory/InventoryScreen.js');

    expect(recipesSource.indexOf('<QuickFilterChips')).toBeLessThan(
      recipesSource.indexOf('<FlatList'),
    );
    expect(inventorySource.indexOf('<QuickFilterChips')).toBeLessThan(
      inventorySource.indexOf('<FlatList'),
    );
  });

  test('workspace sharing screen supports manual pull-to-sync', () => {
    const appScreenSource = read('components/layout/AppScreen.js');
    const workspaceSource = read('screens/Workspace/WorkspaceScreen.js');

    expect(appScreenSource).toContain('RefreshControl');
    expect(appScreenSource).toContain('alwaysBounceVertical={Boolean(onRefresh)}');
    expect(appScreenSource).toContain('bounces={Boolean(onRefresh)}');
    expect(workspaceSource).toContain('handlePullToSync');
    expect(workspaceSource).toContain('onRefresh={handlePullToSync}');
    expect(workspaceSource).toContain('refreshNetworkStatus');
    expect(workspaceSource).not.toMatch(
      /runSync\(|pushPendingChanges|pullRemoteChanges|runAutoSyncNow|notifyAutoSyncNeeded/,
    );
  });

  test('workspace selection only changes the active project context', () => {
    const hookSource = read('hooks/workspace/useWorkspaces.js');
    const selectStart = hookSource.indexOf('const selectWorkspace = useCallback');
    const selectEnd = hookSource.indexOf('const refreshMembers = useCallback');
    const selectWorkspaceSource = hookSource.slice(selectStart, selectEnd);

    expect(selectStart).toBeGreaterThan(-1);
    expect(selectEnd).toBeGreaterThan(selectStart);
    expect(selectWorkspaceSource).toContain('selectWorkspaceService(workspace)');
    expect(selectWorkspaceSource).not.toContain('loadWorkspaceMembers');
    expect(selectWorkspaceSource).not.toContain('loadWorkspaceInvitations');
    expect(selectWorkspaceSource).not.toMatch(
      /runSync\(|pushPendingChanges|pullRemoteChanges|runAutoSyncNow|notifyAutoSyncNeeded/,
    );
  });
});

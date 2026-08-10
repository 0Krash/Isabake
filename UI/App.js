import {
  AppState,
  Linking,
  SafeAreaView,
  StyleSheet,
  StatusBar,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { useEffect, useState } from 'react';
import TransactionBalanceScreen from './screens/TransactionBalance/TransactionBalanceScreen';
import RecipeBookScreen from './screens/RecipeBook/RecipeBookScreen';
import RecipeSaleScreen from './screens/RecipeBook/RecipeSaleScreen';
import InventoryScreen from './screens/Inventory/InventoryScreen';
import SyncDiagnosticsScreen from './screens/Dev/SyncDiagnosticsScreen';
import ConflictResolutionScreen from './screens/Sync/ConflictResolutionScreen';
import SyncCenterScreen from './screens/Sync/SyncCenterScreen';
import SyncHistoryScreen from './screens/Sync/SyncHistoryScreen';
import AuthStatusScreen from './screens/Auth/AuthStatusScreen';
import InvitationAcceptScreen from './screens/Workspace/InvitationAcceptScreen';
import WorkspaceScreen from './screens/Workspace/WorkspaceScreen';
import SettingsScreen from './screens/Settings/SettingsScreen';
import ClientsScreen from './screens/Clients/ClientsScreen';
import StoresScreen from './screens/Stores/StoresScreen';
import { isSyncDiagnosticsEnabled } from './data/dev/syncDiagnosticsModel';
import { createInvitationNavigationState } from './data/workspace/invitationNavigation';
import {
  initializeNetworkStatus,
  startNetworkMonitoring,
  stopNetworkMonitoring,
} from './data/network/networkStatusService';
import AppBottomNavigation from './components/AppBottomNavigation';
import { TransactionBalanceThemeContext } from './context/TransactionBalanceThemeContext';
import themes from './constants/TransactionBalance/Theme';
import { initDatabase } from './data/db/database';
import {
  handleAutoSyncAppStateChange,
  initializeAutoSync,
  startAutoSync,
  stopAutoSync,
} from './data/sync/autoSyncService';
import { restoreAccountSessionOnStartup } from './data/auth/startupAccountSession';

const primaryTabs = new Set(['home', 'recipes', 'inventory']);

export default function App() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? themes.dark : themes.light;
  const [activeTab, setActiveTab] = useState('home');
  const [dbError, setDbError] = useState(null);
  const [dbReady, setDbReady] = useState(false);
  const [inviteToken, setInviteToken] = useState(null);
  const [saleRecipe, setSaleRecipe] = useState(null);
  const [accountStatus, setAccountStatus] = useState('checking');
  const [clientsBackTab, setClientsBackTab] = useState('home');
  const [hideBottomNavigation, setHideBottomNavigation] = useState(false);
  const [settingsBackTab, setSettingsBackTab] = useState('home');
  const [storesBackTab, setStoresBackTab] = useState('home');
  const [workspaceBackTab, setWorkspaceBackTab] = useState('home');
  const [mountedPrimaryTabs, setMountedPrimaryTabs] = useState(
    () => new Set(['home']),
  );
  const devSyncDiagnosticsEnabled = isSyncDiagnosticsEnabled();

  useEffect(() => {
    let isMounted = true;

    initDatabase()
      .then(() => {
        if (isMounted) {
          initializeAutoSync();
          initializeNetworkStatus();
          startAutoSync({
            appState: AppState.currentState === 'active' ? 'active' : 'inactive',
          });
          startNetworkMonitoring();
          setDbReady(true);
        }
      })
      .catch((error) => {
        console.error('Error al inicializar la base de datos local:', error);

        if (isMounted) {
          setDbError(error);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!primaryTabs.has(activeTab)) {
      return;
    }

    setMountedPrimaryTabs((currentTabs) => {
      if (currentTabs.has(activeTab)) {
        return currentTabs;
      }

      const nextTabs = new Set(currentTabs);
      nextTabs.add(activeTab);
      return nextTabs;
    });
  }, [activeTab]);

  useEffect(() => {
    if (!dbReady) {
      return undefined;
    }

    let isMounted = true;
    restoreAccountSessionOnStartup()
      .then(({ status }) => {
        if (isMounted) {
          setAccountStatus(status);
        }
      })
      .catch(() => {
        if (isMounted) {
          setAccountStatus('local');
        }
      });

    const subscription = AppState.addEventListener('change', (nextState) => {
      handleAutoSyncAppStateChange(nextState);
    });

    return () => {
      isMounted = false;
      subscription?.remove?.();
      stopNetworkMonitoring();
      stopAutoSync();
    };
  }, [dbReady]);

  useEffect(() => {
    const handleUrl = (url) => {
      const navigationState = createInvitationNavigationState(url);

      if (!navigationState.ok) {
        return;
      }

      setInviteToken(navigationState.inviteToken);
      setSaleRecipe(null);
      setActiveTab('invite');
    };

    Linking.getInitialURL()
      .then((url) => {
        if (url) {
          handleUrl(url);
        }
      })
      .catch(() => {});

    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleUrl(url);
    });

    return () => {
      subscription?.remove?.();
    };
  }, []);

  const openWorkspaceFrom = (tabKey) => {
    setWorkspaceBackTab(tabKey || activeTab || 'home');
    setActiveTab('workspace');
  };

  const openSettingsFrom = (tabKey) => {
    setSettingsBackTab(tabKey || activeTab || 'home');
    setActiveTab('settings');
  };

  const openClientsFrom = (tabKey) => {
    setClientsBackTab(tabKey || activeTab || 'home');
    setActiveTab('clients');
  };

  const openStoresFrom = (tabKey) => {
    setStoresBackTab(tabKey || activeTab || 'home');
    setActiveTab('stores');
  };

  const renderScreen = () => {
    if (saleRecipe) {
      return (
        <RecipeSaleScreen
          onClose={() => setSaleRecipe(null)}
          onOpenClients={() => {
            setSaleRecipe(null);
            openClientsFrom('recipes');
          }}
          recipe={saleRecipe}
        />
      );
    }

    if (activeTab === 'recipes') {
      return (
        <RecipeBookScreen
          accountStatus={accountStatus}
          onOpenAccount={() => setActiveTab('account')}
          onOpenInventory={() => setActiveTab('inventory')}
          onOpenAppMenu={() => openSettingsFrom('recipes')}
          onOpenSync={() => setActiveTab('sync')}
          onOpenStores={() => openStoresFrom('recipes')}
          onOpenWorkspace={() => openWorkspaceFrom('recipes')}
          onOpenRecipeSale={setSaleRecipe}
        />
      );
    }

    if (activeTab === 'inventory') {
      return (
        <InventoryScreen
          accountStatus={accountStatus}
          onOpenAccount={() => setActiveTab('account')}
          onOpenAppMenu={() => openSettingsFrom('inventory')}
          onOpenSync={() => setActiveTab('sync')}
          onOpenStores={() => openStoresFrom('inventory')}
          onOpenWorkspace={() => openWorkspaceFrom('inventory')}
        />
      );
    }

    if (activeTab === 'conflicts') {
      return <ConflictResolutionScreen />;
    }

    if (activeTab === 'sync') {
      return (
        <SyncCenterScreen
          onOpenConflicts={() => setActiveTab('conflicts')}
          onOpenHistory={() => setActiveTab('sync-history')}
        />
      );
    }

    if (activeTab === 'sync-history') {
      return <SyncHistoryScreen onBack={() => setActiveTab('sync')} />;
    }

    if (activeTab === 'account') {
      return <AuthStatusScreen onOpenWorkspaces={() => openWorkspaceFrom('account')} />;
    }

    if (activeTab === 'settings') {
      return (
        <SettingsScreen
          devToolsEnabled={devSyncDiagnosticsEnabled}
          onBack={() => setActiveTab(settingsBackTab || 'home')}
          onOpenAccount={() => setActiveTab('account')}
          onOpenClients={() => openClientsFrom('settings')}
          onOpenDevTools={() => setActiveTab('dev-sync')}
          onOpenStores={() => openStoresFrom('settings')}
          onOpenWorkspace={() => openWorkspaceFrom('settings')}
        />
      );
    }

    if (activeTab === 'stores') {
      return (
        <StoresScreen
          onBack={() => setActiveTab(storesBackTab || 'home')}
          onMapFullscreenChange={setHideBottomNavigation}
        />
      );
    }

    if (activeTab === 'clients') {
      return (
        <ClientsScreen
          onBack={() => setActiveTab(clientsBackTab || 'home')}
          onMapFullscreenChange={setHideBottomNavigation}
        />
      );
    }

    if (activeTab === 'workspace') {
      return (
        <WorkspaceScreen
          onBack={() => setActiveTab(workspaceBackTab || 'home')}
          onOpenAccount={() => setActiveTab('account')}
        />
      );
    }

    if (activeTab === 'invite') {
      return (
        <InvitationAcceptScreen
          initialToken={inviteToken}
          onBackToWorkspace={() => setActiveTab('workspace')}
          onOpenAccount={() => setActiveTab('account')}
        />
      );
    }

    if (activeTab === 'dev-sync' && devSyncDiagnosticsEnabled) {
      return <SyncDiagnosticsScreen />;
    }

    return (
        <TransactionBalanceScreen
          accountStatus={accountStatus}
          onOpenAccount={() => setActiveTab('account')}
          onOpenAppMenu={() => openSettingsFrom('home')}
          onOpenClients={() => openClientsFrom('home')}
          onOpenSync={() => setActiveTab('sync')}
          onOpenStores={() => openStoresFrom('home')}
          onOpenWorkspace={() => openWorkspaceFrom('home')}
        />
    );
  };

  const renderPrimaryScreens = () => (
    <>
      {mountedPrimaryTabs.has('home') ? (
        <View
          style={[
            styles.primaryScreen,
            activeTab === 'home' ? styles.visibleScreen : styles.hiddenScreen,
          ]}
        >
          <TransactionBalanceScreen
            accountStatus={accountStatus}
            onOpenAccount={() => setActiveTab('account')}
            onOpenAppMenu={() => openSettingsFrom('home')}
            onOpenClients={() => openClientsFrom('home')}
            onOpenSync={() => setActiveTab('sync')}
            onOpenStores={() => openStoresFrom('home')}
            onOpenWorkspace={() => openWorkspaceFrom('home')}
          />
        </View>
      ) : null}
      {mountedPrimaryTabs.has('recipes') ? (
        <View
          style={[
            styles.primaryScreen,
            activeTab === 'recipes'
              ? styles.visibleScreen
              : styles.hiddenScreen,
          ]}
        >
          <RecipeBookScreen
            accountStatus={accountStatus}
            onOpenAccount={() => setActiveTab('account')}
            onOpenInventory={() => setActiveTab('inventory')}
            onOpenAppMenu={() => openSettingsFrom('recipes')}
            onOpenSync={() => setActiveTab('sync')}
            onOpenStores={() => openStoresFrom('recipes')}
            onOpenWorkspace={() => openWorkspaceFrom('recipes')}
            onOpenRecipeSale={setSaleRecipe}
          />
        </View>
      ) : null}
      {mountedPrimaryTabs.has('inventory') ? (
        <View
          style={[
            styles.primaryScreen,
            activeTab === 'inventory'
              ? styles.visibleScreen
              : styles.hiddenScreen,
          ]}
        >
          <InventoryScreen
            accountStatus={accountStatus}
            onOpenAccount={() => setActiveTab('account')}
            onOpenAppMenu={() => openSettingsFrom('inventory')}
            onOpenSync={() => setActiveTab('sync')}
            onOpenStores={() => openStoresFrom('inventory')}
            onOpenWorkspace={() => openWorkspaceFrom('inventory')}
          />
        </View>
      ) : null}
    </>
  );

  if (!dbReady || dbError) {
    return (
      <TransactionBalanceThemeContext.Provider value={theme}>
        <SafeAreaView
          style={[
            styles.container,
            styles.dbStateContainer,
            { backgroundColor: theme.colors.appBackground },
          ]}
        >
          <StatusBar
            backgroundColor={theme.colors.appBackground}
            barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
            translucent={false}
          />
          <Text
            style={[
              styles.dbStateText,
              { color: dbError ? theme.colors.danger : theme.colors.textMuted },
            ]}
          >
            {dbError
              ? 'No se pudo inicializar la base local.'
              : 'Preparando datos locales...'}
          </Text>
        </SafeAreaView>
      </TransactionBalanceThemeContext.Provider>
    );
  }

  return (
    <TransactionBalanceThemeContext.Provider value={theme}>
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: theme.colors.appBackground },
        ]}
      >
        <StatusBar
          backgroundColor={theme.colors.appBackground}
          barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
          translucent={false}
        />
        <View style={styles.screenContainer}>
          {!saleRecipe && primaryTabs.has(activeTab)
            ? renderPrimaryScreens()
            : renderScreen()}
        </View>
        {!saleRecipe && !hideBottomNavigation && (
          <AppBottomNavigation
            activeTab={activeTab}
            onTabPress={setActiveTab}
          />
        )}
      </SafeAreaView>
    </TransactionBalanceThemeContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screenContainer: {
    flex: 1,
  },
  dbStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  dbStateText: {
    fontSize: 16,
    textAlign: 'center',
  },
  hiddenScreen: {
    display: 'none',
  },
  primaryScreen: {
    flex: 1,
  },
  visibleScreen: {
    display: 'flex',
  },
});

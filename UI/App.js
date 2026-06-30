import {
  Linking,
  SafeAreaView,
  StyleSheet,
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
import AuthStatusScreen from './screens/Auth/AuthStatusScreen';
import InvitationAcceptScreen from './screens/Workspace/InvitationAcceptScreen';
import WorkspaceScreen from './screens/Workspace/WorkspaceScreen';
import { isSyncDiagnosticsEnabled } from './data/dev/syncDiagnosticsModel';
import { createInvitationNavigationState } from './data/workspace/invitationNavigation';
import AppBottomNavigation from './components/AppBottomNavigation';
import { TransactionBalanceThemeContext } from './context/TransactionBalanceThemeContext';
import themes from './constants/TransactionBalance/Theme';
import { initDatabase } from './data/db/database';

export default function App() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? themes.dark : themes.light;
  const [activeTab, setActiveTab] = useState('home');
  const [dbError, setDbError] = useState(null);
  const [dbReady, setDbReady] = useState(false);
  const [inviteToken, setInviteToken] = useState(null);
  const [saleRecipe, setSaleRecipe] = useState(null);
  const devSyncDiagnosticsEnabled = isSyncDiagnosticsEnabled();

  useEffect(() => {
    let isMounted = true;

    initDatabase()
      .then(() => {
        if (isMounted) {
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

  const renderScreen = () => {
    if (saleRecipe) {
      return (
        <RecipeSaleScreen
          onClose={() => setSaleRecipe(null)}
          recipe={saleRecipe}
        />
      );
    }

    if (activeTab === 'recipes') {
      return (
        <RecipeBookScreen
          onOpenInventory={() => setActiveTab('inventory')}
          onOpenRecipeSale={setSaleRecipe}
        />
      );
    }

    if (activeTab === 'inventory') {
      return <InventoryScreen />;
    }

    if (activeTab === 'conflicts') {
      return <ConflictResolutionScreen />;
    }

    if (activeTab === 'sync') {
      return <SyncCenterScreen onOpenConflicts={() => setActiveTab('conflicts')} />;
    }

    if (activeTab === 'account') {
      return <AuthStatusScreen onOpenWorkspaces={() => setActiveTab('workspace')} />;
    }

    if (activeTab === 'workspace') {
      return <WorkspaceScreen onOpenAccount={() => setActiveTab('account')} />;
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

    return <TransactionBalanceScreen />;
  };

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
        <View style={styles.screenContainer}>{renderScreen()}</View>
        {!saleRecipe && (
          <AppBottomNavigation
            activeTab={activeTab}
            accountTabEnabled
            conflictTabEnabled
            syncTabEnabled
            workspaceTabEnabled
            extraTabs={
              devSyncDiagnosticsEnabled
                ? [{ key: 'dev-sync', label: 'Sync Dev' }]
                : []
            }
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
});

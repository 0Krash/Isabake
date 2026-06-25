import {
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
  const [saleRecipe, setSaleRecipe] = useState(null);

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

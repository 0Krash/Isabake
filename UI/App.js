import { SafeAreaView, StyleSheet, useColorScheme, View } from 'react-native';
import { useState } from 'react';
import TransactionBalanceScreen from './screens/TransactionBalance/TransactionBalanceScreen';
import RecipeBookScreen from './screens/RecipeBook/RecipeBookScreen';
import InventoryScreen from './screens/Inventory/InventoryScreen';
import AppBottomNavigation from './components/AppBottomNavigation';
import { TransactionBalanceThemeContext } from './context/TransactionBalanceThemeContext';
import themes from './constants/TransactionBalance/Theme';

export default function App() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? themes.dark : themes.light;
  const [activeTab, setActiveTab] = useState('home');

  const renderScreen = () => {
    if (activeTab === 'recipes') {
      return <RecipeBookScreen />;
    }

    if (activeTab === 'inventory') {
      return <InventoryScreen />;
    }

    return <TransactionBalanceScreen />;
  };

  return (
    <TransactionBalanceThemeContext.Provider value={theme}>
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.appBackground }]}
      >
        <View style={styles.screenContainer}>{renderScreen()}</View>
        <AppBottomNavigation activeTab={activeTab} onTabPress={setActiveTab} />
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
});

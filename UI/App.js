import { SafeAreaView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useState } from 'react';
import TransactionBalanceScreen from './screens/TransactionBalance/TransactionBalanceScreen';
import RecipeBookScreen from './screens/RecipeBook/RecipeBookScreen';
import AppBottomNavigation from './components/AppBottomNavigation';
import { TransactionBalanceThemeContext } from './context/TransactionBalanceThemeContext';
import themes from './constants/TransactionBalance/Theme';
import typography from './constants/TransactionBalance/Typography';

export default function App() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? themes.dark : themes.light;
  const [activeTab, setActiveTab] = useState('home');

  const renderScreen = () => {
    if (activeTab === 'recipes') {
      return <RecipeBookScreen />;
    }

    if (activeTab === 'purchases') {
      return (
        <View
          style={[
            styles.placeholderScreen,
            { backgroundColor: theme.colors.screenBackground },
          ]}
        >
          <Text style={[styles.placeholderTitle, { color: theme.colors.textPrimary }]}>
            Compras
          </Text>
          <Text style={[styles.placeholderText, { color: theme.colors.textMuted }]}>
            Esta seccion quedara lista para administrar compras.
          </Text>
        </View>
      );
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
  placeholderScreen: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    flex: 1,
    marginHorizontal: 8,
    marginTop: 50,
    padding: 24,
  },
  placeholderText: {
    fontSize: typography.sizes.body,
    lineHeight: 22,
    marginTop: 8,
  },
  placeholderTitle: {
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.bold,
  },
  screenContainer: {
    flex: 1,
  },
});

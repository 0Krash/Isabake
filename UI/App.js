import { SafeAreaView, StyleSheet, useColorScheme } from 'react-native';
import TransactionBalanceScreen from './screens/TransactionBalance/TransactionBalanceScreen';
import { TransactionBalanceThemeContext } from './context/TransactionBalanceThemeContext';
import themes from './constants/TransactionBalance/Theme';

export default function App() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? themes.dark : themes.light;

  return (
    <TransactionBalanceThemeContext.Provider value={theme}>
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.appBackground }]}
      >
        <TransactionBalanceScreen />
      </SafeAreaView>
    </TransactionBalanceThemeContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

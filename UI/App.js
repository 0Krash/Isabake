import { StyleSheet, SafeAreaView } from 'react-native';
import TransactionBalanceScreen from './screens/TransactionBalance/TransactionBalanceScreen';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <TransactionBalanceScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#B3B2D6',
  },
});

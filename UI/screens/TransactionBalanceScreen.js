import { StyleSheet, View, SafeAreaView, Text, Button } from 'react-native';
import Dashboard from '../components/TransactionBalance/Dashboard';
import Selector from '../components/TransactionBalance/Selector';
import TransactionDetail from '../components/TransactionBalance/TransactionDetail';

function TransactionBalanceScreen() {
  return (
    <View style={styles.mainContainer}>
      <View style={styles.headerContainer}>
        <View>
          <Text style={{ fontSize: 30, fontWeight: 'bold', color: '#3B3F3A' }}>
            Transacciones
          </Text>
        </View>
        <View>
          <Button title="+" />
        </View>
      </View>
      <Dashboard />
      <Selector />
      <TransactionDetail />
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    marginTop: 50,
    marginHorizontal: 15,
    flex: 1,
    backgroundColor: '#EFECFF',
    borderRadius: 30,
    // alignItems: 'center',
  },
  headerContainer: {
    // borderColor: 'yellow',
    // borderWidth: 2,
    marginTop: 15,
    marginHorizontal: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

export default TransactionBalanceScreen;

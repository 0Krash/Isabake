import { StyleSheet, View, Text } from 'react-native';

import Dashboard from '../../components/TransactionBalance/Dashboard';
import SwitchSelector from '../../components/TransactionBalance/SwitchSelector';
import TransactionDetail from '../../components/TransactionBalance/TransactionDetail';
import AddTransactionButton from '../../components/TransactionBalance/AddTransactionButton';

function TransactionBalanceScreen() {
  return (
    <View style={styles.mainContainer}>
      <View style={styles.headerContainer}>
        <Text style={{ fontSize: 30, fontWeight: 'bold', color: '#3B3F3A' }}>
          Transacciones
        </Text>
      </View>
      <Dashboard />
      <SwitchSelector />
      <TransactionDetail />
      <AddTransactionButton />
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

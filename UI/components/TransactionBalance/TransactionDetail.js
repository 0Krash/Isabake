import { ScrollView, StyleSheet, View } from 'react-native';
import TransactionDetailContainer from './TransactionDetailContainer';

export default function TransactionDetail() {
  return (
    <View style={styles.mainContainer}>
      <ScrollView
        style={styles.transactionDetailContainer}
        showsVerticalScrollIndicator={false}
      >
        <TransactionDetailContainer />
        <TransactionDetailContainer />
        <TransactionDetailContainer />
        <TransactionDetailContainer />
        <TransactionDetailContainer />
        <TransactionDetailContainer />
        <TransactionDetailContainer />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    // borderColor: 'green',
    // borderWidth: 2,
    flex: 2.5,
    marginHorizontal: 15,
    marginBottom: 20,
  },
  transactionDetailContainer: {
    flex: 1,
    backgroundColor: '#EFECFF',
    borderRadius: 20,
    marginVertical: 10,
    alignContent: 'center',
  },
});

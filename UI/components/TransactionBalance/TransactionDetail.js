import { StyleSheet, View } from 'react-native';

function TransactionDetail() {
  return (
    <View style={styles.mainContainer}>
      <View style={styles.transactionDetailContainer}></View>
    </View>
  );
}

export default TransactionDetail;

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
    backgroundColor: '#FEFCFF',
    borderRadius: 20,
    marginVertical: 10,
    alignContent: 'center',
    justifyContent: 'center',
  },
});

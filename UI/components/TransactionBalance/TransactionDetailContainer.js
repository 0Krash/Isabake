import { StyleSheet, View, Text } from 'react-native';

export default function TransactionDetailContainer() {
  return (
    <View style={styles.mainContainer}>
      <View style={{ direction: 'row' }}>
        <Text>Tipo de transaccion</Text>
        <Text style>Concepto</Text>
        <Text>Fecha</Text>
        <Text>Monto</Text>
        <Text>{'>'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    // borderColor: 'green',
    // borderWidth: 2,
    flex: 2.5,
    marginTop: 10,
    height: 90,
    borderRadius: 10,
    backgroundColor: '#FEFCFF',
  },
});

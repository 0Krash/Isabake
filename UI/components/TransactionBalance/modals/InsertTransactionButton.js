import { TouchableOpacity, StyleSheet, Text } from 'react-native';
import { API_URL } from '@env';

export default function InsertTransactionButton(props) {
  const {
    amount,
    selected,
    category,
    quantity,
    unitValue,
    description,
    itemQuantity,
    selectedDate,
    transactionType,
  } = props;

  const data = {
    amount: amount,
    storeId: selected,
    category: category,
    quantity: quantity,
    uomId: unitValue,
    description: description,
    itemQuantity: itemQuantity,
    selectedDate: selectedDate,
    transactionType: transactionType,
  };

  const postTransactionData = () => {
    console.log(JSON.stringify(data));
  };

  return (
    <TouchableOpacity
      testID="addTransactionButton"
      style={[styles.buttonTransaction]}
      onPress={postTransactionData}
    >
      <Text
        style={{
          fontSize: 20,
          fontWeight: '700',
          color: '#FEFCFF',
          textAlign: 'center',
        }}
      >
        Agregar Transaccion
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  buttonTransaction: {
    height: 60,
    width: '100%',
    backgroundColor: '#6D37FF',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
});

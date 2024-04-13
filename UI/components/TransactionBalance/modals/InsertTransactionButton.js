import { API_URL } from '@env';
import { useState } from 'react';
import { TouchableOpacity, StyleSheet, Text } from 'react-native';

import TransactionAlertModal from './TransactionAlertModal';

export default function InsertTransactionButton(props) {
  const [transactionAlertVisible, setTransactionAlertVisibility] =
    useState(false);

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

  const textAlert = {
    title: `${transactionType.slice(
      0,
      transactionType.length - 1
    )} por ${amount}`,
  };

  const postTransactionData = () => {
    setTransactionAlertVisibility(true);
    console.log(JSON.stringify(data));
  };

  return (
    <>
      <TouchableOpacity
        testID="addTransactionButton"
        style={[
          styles.buttonTransaction,
          {
            backgroundColor: props.validationError
              ? 'rgba(109, 55, 255, 1)'
              : 'rgba(109, 55, 255, .5)',
          },
        ]}
        onPress={postTransactionData}
        disabled={!props.validationError}
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
      <TransactionAlertModal
        textAlert={textAlert}
        handleModalOnClose={props.handleModalOnClose}
        transactionAlertVisible={transactionAlertVisible}
        setTransactionAlertVisibility={setTransactionAlertVisibility}
      />
    </>
  );
}

const styles = StyleSheet.create({
  buttonTransaction: {
    height: 60,
    width: '100%',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
});

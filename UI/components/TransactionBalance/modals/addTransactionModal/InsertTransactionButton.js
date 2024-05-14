import { useState } from 'react';
import { TouchableOpacity, StyleSheet, Text } from 'react-native';

import TransactionAlertModal from '../TransactionAlertModal';
import transactionService from '../../../../services/TransactionBalance/API/transactionService';

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
    store: { storeId: selected },
    category: { categoryId: category },
    quantity: quantity,
    uomId: unitValue,
    description: description,
    itemQuantity: itemQuantity,
    selectedDate: selectedDate,
    transactionType: transactionType,
  };

  const postTransaction = async () => {
    try {
      await transactionService.postTransaction(data);
    } catch (error) {
      console.error(
        'Error al obtener transacciones desde TransactionBalanceScreen: ',
        error
      );
    }
  };

  const textAlert = {
    title: `${transactionType.slice(
      0,
      transactionType.length - 1
    )} por ${amount}`,
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
        onPress={() => {
          postTransaction(), setTransactionAlertVisibility(true);
        }}
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

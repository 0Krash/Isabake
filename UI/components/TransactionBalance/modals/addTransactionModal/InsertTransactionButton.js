import { useState } from 'react';
import { Keyboard, TouchableOpacity, StyleSheet, Text } from 'react-native';

import TransactionAlertModal from '../TransactionAlertModal';
import transactionService from '../../../../services/TransactionBalance/API/transactionService';
import CurrencyFormatter from '../../../../utils/CurrencyFormatter';
import DateFormatter from '../../../../utils/DateFormatter';
import typography from '../../../../constants/TransactionBalance/Typography';
import { useTransactionBalanceTheme } from '../../../../context/TransactionBalanceThemeContext';

export default function InsertTransactionButton(props) {
  const { colors } = useTransactionBalanceTheme();
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
    onTransactionCreated,
  } = props;

  const postTransaction = async () => {
    const data = {
      amount: CurrencyFormatter.convertCurrencyToCents(amount),
      store: { storeId: selected },
      category: { categoryId: category },
      quantity: quantity,
      uomId: unitValue,
      description: description,
      itemQuantity: itemQuantity,
      selectedDate: DateFormatter.convertSelectedToISO(selectedDate),
      transactionType: transactionType,
    };

    try {
      await transactionService.postTransaction(data);
      onTransactionCreated?.();
      setTransactionAlertVisibility(true);
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
              ? colors.primary
              : `${colors.primary}80`,
          },
        ]}
        onPress={() => {
          Keyboard.dismiss();
          postTransaction();
        }}
        disabled={!props.validationError}
      >
        <Text style={[styles.buttonText, { color: colors.textInverse }]}>
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
    height: 52,
    width: '100%',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
  },
});

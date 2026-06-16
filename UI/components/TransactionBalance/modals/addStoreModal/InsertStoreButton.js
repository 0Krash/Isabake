import { useState } from 'react';
import { TouchableOpacity, StyleSheet, Text, View } from 'react-native';

import transactionService from '../../../../services/TransactionBalance/API/transactionService';
import typography from '../../../../constants/TransactionBalance/Typography';
import { useTransactionBalanceTheme } from '../../../../context/TransactionBalanceThemeContext';

export default function InsertStoreButton(props) {
  const { colors } = useTransactionBalanceTheme();
  const { storeName, storeAlias, storeAddress } = props;

  const postTransaction = async () => {
    const data = {
      Name: storeName,
      Alias: storeAlias,
      Address: storeAddress,
    };

    try {
      // await transactionService.postTransaction(data);
    } catch (error) {
      console.error(
        'Error al obtener transacciones desde InsertStoreButton: ',
        error
      );
    }
  };

  return (
    <View style={styles.mainContainer}>
      <TouchableOpacity
        testID="addStoreButton"
        style={[
          styles.baseButton,
          {
            backgroundColor: props.validationError
              ? colors.primary
              : `${colors.primary}80`,
          },
        ]}
        onPress={() => {
          //   postTransaction(),
          props.setAddStoreModalIsVisible(false);
        }}
        disabled={!props.validationError}
      >
        <Text style={[styles.buttonText, { color: colors.textInverse }]}>
          Agregar Tienda
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    marginVertical: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  baseButton: {
    height: 60,
    width: '90%',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  buttonText: {
    fontSize: typography.sizes.bodyLarge,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
  },
});

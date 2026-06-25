import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import typography from '../../../constants/TransactionBalance/Typography';
import { useTransactionBalanceTheme } from '../../../context/TransactionBalanceThemeContext';
import useTransactionBalanceData from '../../../hooks/TransactionBalance/useTransactionBalanceData';

export default function DeleteTransactionModal({
  transactionDetail,
  DeleteTransactionModalIsVisible,
  onTransactionDeleted,
  setDeleteTransactionModalIsVisible,
}) {
  const { colors } = useTransactionBalanceTheme();
  const { deleteTransaction } = useTransactionBalanceData(undefined, {
    autoLoad: false,
  });
  const handleDeleteTransaction = async (transactionId) => {
    try {
      await deleteTransaction(transactionId);
      setDeleteTransactionModalIsVisible(false);
      onTransactionDeleted?.();
    } catch (error) {
      console.error('Error al eliminar la transacción local:', error);
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={DeleteTransactionModalIsVisible}
      onRequestClose={() => setDeleteTransactionModalIsVisible(false)}
    >
      <View style={[styles.backdrop, { backgroundColor: colors.softBackdrop }]}>
        <View style={[styles.modalView, { backgroundColor: colors.surface }]}>
          <Text style={[styles.text, { color: colors.textPrimary }]}>
            Desea eliminar {transactionDetail.transactionType} de{' '}
            {transactionDetail.description}?
          </Text>
          <TouchableOpacity
            testID="deleteTransactionButton"
            onPress={() =>
              handleDeleteTransaction(transactionDetail.transactionId)
            }
            style={[
              styles.deleteButton,
              { backgroundColor: colors.destructive },
            ]}
          >
            <Text
              style={[styles.deleteButtonText, { color: colors.textInverse }]}
            >
              Eliminar
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalView: {
    height: '35%',
    width: '80%',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: typography.sizes.bodyLarge,
    fontWeight: typography.weights.semibold,
    lineHeight: 25,
    marginBottom: 20,
    textAlign: 'center',
  },
  deleteButton: {
    height: 45,
    width: '90%',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  deleteButtonText: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
  },
});

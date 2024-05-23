import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Image,
  Text,
  TouchableOpacity,
} from 'react-native';
import transactionService from '../../../services/TransactionBalance/API/transactionService';

export default function DeleteTransactionModal({
  transactionDetail,
  DeleteTransactionModalIsVisible,
  setDeleteTransactionModalIsVisible,
}) {
  const handleDeleteTransaction = (transactionId) => {
    transactionService
      .deleteTransactionById(transactionId)
      .then((data) => {
        setDeleteTransactionModalIsVisible(false);
      })
      .catch((error) => {
        console.error('Error al eliminar la transacción:', error);
      });
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={DeleteTransactionModalIsVisible}
      onRequestClose={() => setDeleteTransactionModalIsVisible(false)}
    >
      <View style={styles.backdrop}>
        <View style={styles.modalView}>
          <Image
            source={require('../../../assets/images/delete.png')}
            style={styles.image}
          />
          <Text style={styles.text}>
            Desea eliminar {transactionDetail.transactionType} de{' '}
            {transactionDetail.description}?
          </Text>
          <TouchableOpacity
            testID="deleteTransactionButton"
            onPress={() =>
              handleDeleteTransaction(transactionDetail.transactionId)
            }
            style={styles.deleteButton}
          >
            <Text style={styles.deleteButtonText}>Eliminar</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalView: {
    height: '35%',
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: 50,
    height: 50,
    marginBottom: 30,
  },
  text: {
    fontSize: 20,
    fontWeight: '600',
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
    backgroundColor: '#e88282',
  },
  deleteButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FEFCFF',
    textAlign: 'center',
  },
});

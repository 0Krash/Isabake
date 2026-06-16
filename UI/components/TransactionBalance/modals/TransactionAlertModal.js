import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
} from 'react-native';
import typography from '../../../constants/TransactionBalance/Typography';
import { useTransactionBalanceTheme } from '../../../context/TransactionBalanceThemeContext';

const TransactionAlertModal = (props) => {
  const { colors } = useTransactionBalanceTheme();

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={props.transactionAlertVisible}
      onRequestClose={() => {
        props.setTransactionAlertVisibility(false);
        props.handleModalOnClose();
      }}
    >
      <View
        style={[styles.backdrop, { backgroundColor: colors.softBackdrop }]}
        onPress={() => props.setModalVisible(false)}
      >
        <View style={[styles.modalView, { backgroundColor: colors.surface }]}>
          <Image
            source={require('../../../assets/images/check.png')}
            style={styles.image}
          />
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {props.textAlert.title}
          </Text>
          <TouchableOpacity
            testID="addTransactionButton"
            style={[styles.button, { backgroundColor: colors.success }]}
            onPress={() => {
              props.setTransactionAlertVisibility(false);
              props.handleModalOnClose();
            }}
          >
            <Text style={[styles.buttonText, { color: colors.textInverse }]}>
              OK
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default TransactionAlertModal;

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
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
  image: {
    width: 64,
    height: 64,
    marginBottom: 24,
  },
  title: {
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.semibold,
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    height: 45,
    width: '90%',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  buttonText: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
  },
});

import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
} from 'react-native';
export default TransactionAlertModal = (props) => {
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
        style={styles.backdrop}
        onPress={() => props.setModalVisible(false)}
      >
        <View
          style={{
            height: '35%',
            width: '80%',
            backgroundColor: 'white',
            borderRadius: 10,
            padding: 20,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Image
            source={require('../../../assets/images/check.png')}
            style={{ width: 70, height: 70, marginBottom: 30 }}
          />
          <Text
            style={{
              fontSize: 30,
              fontWeight: '600',
              marginBottom: 20,
            }}
          >
            {props.textAlert.title}
          </Text>
          <TouchableOpacity
            testID="addTransactionButton"
            style={{
              height: 45,
              width: '90%',
              borderRadius: 10,
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: 15,
              backgroundColor: '#699f4c',
            }}
            onPress={() => {
              props.setTransactionAlertVisibility(false);
              props.handleModalOnClose();
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: '600',
                color: '#FEFCFF',
                textAlign: 'center',
              }}
            >
              OK
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
});

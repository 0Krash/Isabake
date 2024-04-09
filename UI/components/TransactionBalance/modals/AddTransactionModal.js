import { useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

import SwitchSelector from '../SwitchSelector';
import formatter from '../../../utils/DateFormatter';

export default function AddTransactionModal({ visible, onClose }) {
  const amountInput = useRef(null);
  const quantityInput = useRef(null);
  const [amount, setAmount] = useState('');
  const [selectedTab, setSelectedTab] = useState('Ventas');
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [selectedDate, setSelectedDate] = useState(formatter.ddmmm(new Date()));

  const handleModalOnClose = () => {
    onClose();
    setSelectedDate(formatter.ddmmm(new Date()));
    setAmount('');
  };

  const handleTabChange = (tabName) => {
    setSelectedTab(tabName);
  };

  const showDatePicker = () => {
    setDatePickerVisibility(true);
  };

  const hideDatePicker = () => {
    setDatePickerVisibility(false);
  };

  const handleConfirm = (date) => {
    setSelectedDate(formatter.ddmmm(date));
    hideDatePicker();
  };

  const handleInputFocus = () => {
    Keyboard.dismiss();
  };

  const amountHandleBlur = () => {
    const numericValue = amount.replace(/[^0-9.]/g, '');

    if (numericValue !== '' && numericValue !== 0) {
      const formattedValue = parseFloat(numericValue)
        .toLocaleString('es-MX', {
          style: 'currency',
          currency: 'MXN',
          currencyDisplay: 'symbol',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
        .replace(/\s?MXN/g, '')
        .trim();
      setAmount(`${formattedValue}`);
    } else {
      setAmount('');
    }
  };

  return (
    <Modal
      transparent={true}
      animationType="slide"
      visible={visible}
      onRequestClose={handleModalOnClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="height"
        // keyboardVerticalOffset={90}
      >
        <View style={styles.mainContainer}>
          <View style={{ flex: 3 }}></View>
          <View style={styles.modalView}>
            <View style={styles.modalContaier}>
              <View testID="switchArea" style={styles.switchContainer}>
                <SwitchSelector onTabChange={handleTabChange} />
              </View>
              <View testID="inputContainer" style={styles.inputContainer}>
                <View testID="firstRow">
                  <View testID="description">
                    <Text style={styles.textInputLabelBase}>Descripción</Text>
                    <TextInput
                      style={styles.textInputBase}
                      onSubmitEditing={() => {
                        quantityInput.current.focus();
                      }}
                    />
                  </View>
                </View>
                <View testID="secondRow" style={styles.secondRow}>
                  <View testID="quantity">
                    <Text style={[styles.textInputLabelBase, { width: 150 }]}>
                      Cantidad
                    </Text>
                    <TextInput
                      ref={quantityInput}
                      style={styles.textInputBase}
                      keyboardType="numeric"
                      onSubmitEditing={() => {
                        amountInput.current.focus();
                      }}
                    />
                  </View>
                  <View testID="amount">
                    <Text style={[styles.textInputLabelBase, { width: 150 }]}>
                      {selectedTab === 'Gastos' ? 'Costo' : 'Precio'}
                    </Text>
                    <TextInput
                      keyboardType="numeric"
                      onBlur={amountHandleBlur}
                      onChangeText={setAmount}
                      onFocus={() => setAmount('')}
                      placeholder="$0.00"
                      ref={amountInput}
                      style={styles.textInputBase}
                      value={amount}
                    />
                  </View>
                </View>
                <View testID="thirdRow" style={styles.thirdRow}>
                  <View testID="date">
                    <Text style={[styles.textInputLabelBase, { width: 150 }]}>
                      Fecha
                    </Text>
                    <TextInput
                      style={styles.textInputBase}
                      onPressIn={showDatePicker}
                      onFocus={handleInputFocus}
                      value={selectedDate}
                    />
                    <DateTimePickerModal
                      isVisible={isDatePickerVisible}
                      mode="date"
                      onConfirm={handleConfirm}
                      onCancel={hideDatePicker}
                    />
                  </View>
                </View>
              </View>
              <TouchableOpacity style={styles.buttonTransaction}>
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
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  modalView: {
    backgroundColor: '#EFECFF',
    flex: 6,
    width: '100%',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 15,
  },
  modalContaier: {
    // borderWidth: 2,
    // borderColor: 'red',
    paddingHorizontal: 5,
    flex: 1,
  },
  thirdRow: {
    // borderWidth: 2,
    // borderColor: 'red',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textInputBase: {
    backgroundColor: '#FEFCFF',
    borderRadius: 15,
    height: 50,
    margin: 10,
    padding: 15,
    fontSize: 22,
    textAlign: 'center',
  },
  textInputLabelBase: {
    marginTop: 10,
    fontSize: 15,
    marginLeft: 15,
    color: '#9E9AAB',
    fontWeight: '500',
  },
  buttonTransaction: {
    height: 60,
    width: '100%',
    backgroundColor: '#6D37FF',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    height: 350,
    // borderWidth: 2,
    // borderColor: 'green',
  },
  switchContainer: {
    height: 90,
  },
  secondRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
});

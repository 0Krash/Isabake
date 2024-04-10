import React, { useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Modal,
  Text,
  KeyboardAvoidingView,
  TouchableOpacity,
  FlatList,
  Keyboard,
} from 'react-native';

import SwitchSelector from '../SwitchSelector';
import formatter from '../../../utils/DateFormatter';
import CategoryInputComponent from './CategoryInputComponent';
import DescriptionInputComponent from './DescriptionInputComponent';
import QuantityInputComponent from './QuantityInputComponent';
import AmountInputComponent from './AmountInputComponent';
import DatePickerComponent from './DatePickerComponent';
import StoreInputComponent from './StoreInputComponent';

export default function AddTransactionModal({ visible, onClose }) {
  const amountInput = useRef(null);
  const quantityInput = useRef(null);
  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState('');
  const [selectedTab, setSelectedTab] = useState('Ventas');
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [selectedDate, setSelectedDate] = useState(formatter.ddmmm(new Date()));
  const [selectedValue, setSelectedValue] = useState('1');
  const [selected, setSelected] = useState('');

  const handleModalOnClose = () => {
    onClose();
    setSelectedDate(formatter.ddmmm(new Date()));
    setShowCategoryInput(false);
    setSelectedValue('1');
    setQuantity('');
    setAmount('');
  };

  const handleTabChange = (tabName) => {
    setSelectedTab(tabName);
    setShowCategoryInput(tabName === 'Gastos');
    Keyboard.dismiss();
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
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
        <View style={styles.mainContainer}>
          <View style={{ flex: 3 }}></View>
          <View style={[styles.modalView, showCategoryInput && { flex: 12 }]}>
            <View style={styles.modalContaier}>
              <View testID="switchArea" style={styles.switchContainer}>
                <SwitchSelector onTabChange={handleTabChange} />
              </View>
              <ScrollView testID="inputContainer" style={styles.inputContainer}>
                <View testID="filterArea">
                  {showCategoryInput && (
                    <CategoryInputComponent
                      selectedValue={selectedValue}
                      onValueChange={setSelectedValue}
                    />
                  )}
                  {showCategoryInput && selectedValue === '1' && (
                    <StoreInputComponent setSelected={setSelected} />
                  )}
                </View>
                <View testID="secondRow" style={styles.secondRow}>
                  <DescriptionInputComponent quantityInput={quantityInput} />
                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      justifyContent: 'flex-start',
                    }}
                  >
                    <QuantityInputComponent
                      quantity={quantity}
                      setQuantity={setQuantity}
                      quantityInput={quantityInput}
                      amountInput={amountInput}
                    />
                    <AmountInputComponent
                      selectedTab={selectedTab}
                      amount={amount}
                      setAmount={setAmount}
                      amountInput={amountInput}
                      amountHandleBlur={amountHandleBlur}
                    />
                    <DatePickerComponent
                      isDatePickerVisible={isDatePickerVisible}
                      showDatePicker={showDatePicker}
                      hideDatePicker={hideDatePicker}
                      handleConfirm={handleConfirm}
                      selectedDate={selectedDate}
                    />
                  </View>
                </View>
              </ScrollView>
              <TouchableOpacity
                testID="addTransactionButton"
                style={[styles.buttonTransaction]}
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
    paddingHorizontal: 5,
    flex: 1,
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
    marginBottom: 10,
  },
});

import React, { useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Modal,
  Text,
  KeyboardAvoidingView,
  TouchableOpacity,
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
import UOMInputComponent from './UOMInputComponent';
import ItemQuantityInputComponent from './ItemQuantityInputComponent';

export default function AddTransactionModal({ visible, onClose }) {
  const amountInputRef = useRef(null);
  const quantityInputRef = useRef(null);
  const itemQuantityInputRef = useRef(null);
  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState('');
  const [selectedTab, setSelectedTab] = useState('Ventas');
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [selectedDate, setSelectedDate] = useState(formatter.ddmmm(new Date()));
  const [selectedValue, setSelectedValue] = useState('1');
  const [unitValue, setUnitValue] = useState('');
  const [itemQuantity, setItemQuantity] = useState('');
  const [selected, setSelected] = useState('');

  const handleModalOnClose = () => {
    onClose();
    setSelectedDate(formatter.ddmmm(new Date()));
    setShowCategoryInput(false);
    setSelectedValue('1');
    setQuantity('');
    setAmount('');
    setItemQuantity('');
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
                  {showCategoryInput &&
                    (selectedValue === '1' || selectedValue === '2') && (
                      <StoreInputComponent setSelected={setSelected} />
                    )}
                </View>
                <View testID="secondRow" style={styles.secondRow}>
                  <DescriptionInputComponent
                    showCategoryInput={showCategoryInput}
                    selectedValue={selectedValue}
                    quantityInputRef={quantityInputRef}
                    itemQuantityInputRef={itemQuantityInputRef}
                  />
                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      justifyContent: 'flex-start',
                    }}
                  >
                    {showCategoryInput && selectedValue === '1' && (
                      <ItemQuantityInputComponent
                        itemQuantity={itemQuantity}
                        setItemQuantity={setItemQuantity}
                        itemQuantityInputRef={itemQuantityInputRef}
                        quantityInputRef={quantityInputRef}
                      />
                    )}
                    <QuantityInputComponent
                      showCategoryInput={showCategoryInput}
                      selectedValue={selectedValue}
                      quantity={quantity}
                      setQuantity={setQuantity}
                      quantityInputRef={quantityInputRef}
                      amountInputRef={amountInputRef}
                    />
                    {showCategoryInput && selectedValue === '1' && (
                      <UOMInputComponent
                        unitValue={unitValue}
                        setUnitValue={setUnitValue}
                      />
                    )}
                    <AmountInputComponent
                      selectedTab={selectedTab}
                      amount={amount}
                      setAmount={setAmount}
                      amountInputRef={amountInputRef}
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
    marginTop: 15,
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

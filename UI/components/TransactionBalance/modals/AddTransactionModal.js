import React, { useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Modal,
  KeyboardAvoidingView,
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
import InsertTransactionButton from './InsertTransactionButton';

export default function AddTransactionModal({ visible, onClose }) {
  const amountInputRef = useRef(null);
  const quantityInputRef = useRef(null);
  const itemQuantityInputRef = useRef(null);
  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState('');
  const [description, setDescription] = useState('');
  const [transactionType, setTransactionType] = useState('Ventas');
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [selectedDate, setSelectedDate] = useState(formatter.ddmmm(new Date()));
  const [category, setCategory] = useState('1');
  const [unitValue, setUnitValue] = useState('1');
  const [itemQuantity, setItemQuantity] = useState('');
  const [selected, setSelected] = useState('');

  const handleModalOnClose = () => {
    onClose();
    setSelectedDate(formatter.ddmmm(new Date()));
    setShowCategoryInput(false);
    setCategory('1');
    setQuantity('');
    setAmount('');
    setDescription('');
    setItemQuantity('');
  };

  const handleTabChange = (tabName) => {
    setTransactionType(tabName);
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
    setSelectedDate(formatter.ddmmyy(date));
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
                      category={category}
                      setCategory={setCategory}
                    />
                  )}
                  {showCategoryInput &&
                    (category === '1' || category === '2') && (
                      <StoreInputComponent setSelected={setSelected} />
                    )}
                </View>
                <View testID="secondRow" style={styles.secondRow}>
                  <DescriptionInputComponent
                    showCategoryInput={showCategoryInput}
                    category={category}
                    setDescription={setDescription}
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
                    {showCategoryInput && category === '1' && (
                      <ItemQuantityInputComponent
                        itemQuantity={itemQuantity}
                        setItemQuantity={setItemQuantity}
                        itemQuantityInputRef={itemQuantityInputRef}
                        quantityInputRef={quantityInputRef}
                      />
                    )}
                    <QuantityInputComponent
                      showCategoryInput={showCategoryInput}
                      category={category}
                      quantity={quantity}
                      setQuantity={setQuantity}
                      quantityInputRef={quantityInputRef}
                      amountInputRef={amountInputRef}
                    />
                    {showCategoryInput && category === '1' && (
                      <UOMInputComponent
                        unitValue={unitValue}
                        setUnitValue={setUnitValue}
                      />
                    )}
                    <AmountInputComponent
                      transactionType={transactionType}
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
              <InsertTransactionButton
                amount={amount}
                selected={selected}
                quantity={quantity}
                category={category}
                unitValue={unitValue}
                description={description}
                itemQuantity={itemQuantity}
                selectedDate={selectedDate}
                transactionType={transactionType}
              />
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
  inputContainer: {
    height: 350,
  },
  switchContainer: {
    height: 90,
    marginBottom: 10,
  },
});

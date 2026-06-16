import React, { useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Modal,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';

import SwitchSelector from '../../SwitchSelector';
import formatter from '../../../../utils/DateFormatter';
import CategoryInputComponent from './CategoryInputComponent';
import DescriptionInputComponent from './DescriptionInputComponent';
import QuantityInputComponent from './QuantityInputComponent';
import AmountInputComponent from './AmountInputComponent';
import DatePickerComponent from './DatePickerComponent';
import StoreInputComponent from './StoreInputComponent';
import UOMInputComponent from './UOMInputComponent';
import ItemQuantityInputComponent from './ItemQuantityInputComponent';
import InsertTransactionButton from './InsertTransactionButton';
import { useTransactionBalanceTheme } from '../../../../context/TransactionBalanceThemeContext';

export default function AddTransactionModal({
  AddTransactionModalIsVisible,
  setAddTransactionModalIsVisible,
  setAddStoreModalIsVisible,
}) {
  const { colors } = useTransactionBalanceTheme();
  const amountInputRef = useRef(null);
  const quantityInputRef = useRef(null);
  const itemQuantityInputRef = useRef(null);
  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState('');
  const [description, setDescription] = useState('');
  const [transactionType, setTransactionType] = useState('Ventas');
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    formatter.ddmmyy(new Date())
  );
  const [category, setCategory] = useState('1');
  const [unitValue, setUnitValue] = useState('1');
  const [itemQuantity, setItemQuantity] = useState('');
  const [selected, setSelected] = useState('');

  const [validationErrorStore, setValidationErrorStore] = useState(false);
  const [validationErrorAmount, setValidationErrorAmount] = useState(false);
  const [validationErrorQuantity, setValidationErrorQuantity] = useState(false);
  const [validationErrorDescription, setValidationErrorDescription] =
    useState(false);
  const [validationErrorItemQuantity, setValidationErrorItemQuantity] =
    useState(false);

  const handleModalOnClose = () => {
    setAddTransactionModalIsVisible(false);
    resetValidatioErrors();
    setSelectedDate(formatter.ddmmyy(new Date()));
    setTransactionType('Ventas');
    setShowCategoryInput(false);
    setCategory('1');
    setQuantity('');
    setAmount('');
    setDescription('');
    setItemQuantity('');
  };

  const resetValidatioErrors = () => {
    setValidationErrorDescription(false);
    setValidationErrorAmount(false);
    setValidationErrorQuantity(false);
    setValidationErrorItemQuantity(false);
    setValidationErrorStore(false);
  };

  const handleTabChange = (tabName) => {
    setValidationErrorStore(false);
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
      visible={AddTransactionModalIsVisible}
      onRequestClose={handleModalOnClose}
    >
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="height">
        <View style={[styles.mainContainer, { backgroundColor: colors.backdrop }]}>
          <View style={{ flex: 3 }}></View>
          <View
            style={[
              styles.modalView,
              { backgroundColor: colors.screenBackground },
              showCategoryInput && { flex: 12 },
            ]}
          >
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
                      <StoreInputComponent
                        selected={selected}
                        setSelected={setSelected}
                        setAddStoreModalIsVisible={setAddStoreModalIsVisible}
                        setValidationErrorStore={setValidationErrorStore}
                        transactionType={transactionType}
                      />
                    )}
                </View>
                <View testID="secondRow" style={styles.secondRow}>
                  <DescriptionInputComponent
                    showCategoryInput={showCategoryInput}
                    category={category}
                    setDescription={setDescription}
                    quantityInputRef={quantityInputRef}
                    itemQuantityInputRef={itemQuantityInputRef}
                    setValidationErrorDescription={
                      setValidationErrorDescription
                    }
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
                        setValidationErrorItemQuantity={
                          setValidationErrorItemQuantity
                        }
                      />
                    )}
                    <QuantityInputComponent
                      showCategoryInput={showCategoryInput}
                      category={category}
                      quantity={quantity}
                      setQuantity={setQuantity}
                      quantityInputRef={quantityInputRef}
                      amountInputRef={amountInputRef}
                      setValidationErrorQuantity={setValidationErrorQuantity}
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
                      setValidationErrorAmount={setValidationErrorAmount}
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
                validationError={
                  transactionType === 'Gastos' && category === '1'
                    ? validationErrorDescription &&
                      validationErrorQuantity &&
                      validationErrorAmount &&
                      validationErrorItemQuantity &&
                      validationErrorStore
                    : transactionType === 'Gastos' && category === '2'
                    ? validationErrorDescription &&
                      validationErrorQuantity &&
                      validationErrorAmount &&
                      validationErrorStore
                    : validationErrorDescription &&
                      validationErrorQuantity &&
                      validationErrorAmount
                }
                itemQuantity={transactionType === 'Gastos' ? itemQuantity : ''}
                unitValue={transactionType === 'Gastos' ? unitValue : ''}
                category={transactionType === 'Gastos' ? category : ''}
                selected={transactionType === 'Gastos' ? selected : ''} //store
                transactionType={transactionType}
                selectedDate={selectedDate}
                description={description}
                quantity={quantity}
                amount={amount}
                handleModalOnClose={handleModalOnClose}
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
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  modalView: {
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

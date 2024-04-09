import { useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Keyboard,
  Alert,
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import RNPickerSelect from 'react-native-picker-select';
import { SelectList } from 'react-native-dropdown-select-list';

import SwitchSelector from '../SwitchSelector';
import formatter from '../../../utils/DateFormatter';

export default function AddTransactionModal({ visible, onClose }) {
  const amountInput = useRef(null);
  const quantityInput = useRef(null);
  const categoryInput = useRef(null);
  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState('');
  const [selectedTab, setSelectedTab] = useState('Ventas');
  const [showCategotyInput, setShowCategotyInput] = useState(false);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [selectedDate, setSelectedDate] = useState(formatter.ddmmm(new Date()));

  const handleModalOnClose = () => {
    onClose();
    setSelectedDate(formatter.ddmmm(new Date()));
    setShowCategotyInput(false);
    setSelectedValue('1');
    setQuantity('');
    setAmount('');
  };

  const handleTabChange = (tabName) => {
    setSelectedTab(tabName);
    tabName === 'Gastos'
      ? setShowCategotyInput(true)
      : setShowCategotyInput(false);
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

  const [selectedValue, setSelectedValue] = useState('1');

  // const placeholder = {
  //   label: 'Selecciona una opción...',
  //   value: null,
  // };

  const options = [
    { label: 'Materia prima (ingredientes básicos)', value: '1' },
    { label: 'Insumos (materiales para elavoración)', value: '2' },
    { label: 'Formación (desarrollo de habilidades)', value: '3' },
    { label: 'Operativo (gastos del negocio)', value: '4' },
  ];

  const [selected, setSelected] = useState('');

  const data = [
    { key: '0', value: 'Agregar tienda...' },
    { key: '1', value: 'La Concepcion (Consti)' },
    { key: '2', value: 'La Super Cremeria (Consti)' },
    // { key: '4', value: 'Computers', disabled: true },
    { key: '3', value: 'La Alpina (Tepeyac)' },
    { key: '5', value: 'Diary Products' },
    { key: '5', value: 'Diary Products' },
    { key: '5', value: 'Diary Products' },
    { key: '5', value: 'Diary Products' },
    { key: '5', value: 'Diary Products' },
    { key: '5', value: 'Diary Products' },
    { key: '5', value: 'Diary Products' },
    { key: '5', value: 'Diary Products' },
    { key: '5', value: 'Diary Products' },
    { key: '5', value: 'Diary Products' },
    { key: '5', value: 'Diary Products' },
    // { key: '7', value: 'Drinks' },
  ];

  const onSelectHandler = () => {
    console.log(selected);
    if (selected === 'Agregar tienda...') new Alert('agregando');
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
          <View style={[styles.modalView, showCategotyInput && { flex: 12 }]}>
            <View style={styles.modalContaier}>
              <View testID="switchArea" style={styles.switchContainer}>
                <SwitchSelector onTabChange={handleTabChange} />
              </View>
              <ScrollView testID="inputContainer" style={styles.inputContainer}>
                <View testID="firstRow">
                  {showCategotyInput && (
                    <View testID="category">
                      <Text style={styles.textInputLabelBase}>Categoria</Text>
                      <View
                        ref={categoryInput}
                        style={[
                          styles.textInputBase,
                          { justifyContent: 'center', textAlign: 'center' },
                        ]}
                      >
                        <RNPickerSelect
                          placeholder={{}}
                          items={options}
                          onValueChange={(value) => setSelectedValue(value)}
                          value={selectedValue}
                          style={styles.textInputLabelBase}
                        />
                      </View>
                    </View>
                  )}
                  {showCategotyInput && selectedValue === '1' && (
                    <View testID="store">
                      <Text style={styles.textInputLabelBase}>Tienda</Text>
                      {/* <TextInput style={styles.textInputBase}></TextInput> */}
                      <SelectList
                        setSelected={(item) => setSelected(item)}
                        placeholder={'Seleccione una opción...'}
                        data={data}
                        save="value"
                        notFoundText={'Tienda no existe...'}
                        onSelect={onSelectHandler}
                        // defaultOption={{ key: '0', value: 'Agregar tienda...' }}
                        boxStyles={[
                          styles.textInputBase,
                          { borderColor: 'white' },
                        ]}
                        inputStyles={
                          // [styles.textInputBase]
                          {
                            marginTop: 0,
                            fontSize: 18,
                            marginLeft: 9,
                            fontWeight: '400',
                          }
                        }
                        dropdownStyles={{
                          backgroundColor: '#FEFCFF',
                          borderRadius: 15,
                          margin: 10,
                          textAlign: 'center',
                          borderColor: 'white',
                        }}
                        dropdownTextStyles={{
                          fontWeight: '400',
                          fontSize: 16,
                        }}
                      />
                    </View>
                  )}
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
                      keyboardType="numeric"
                      onChangeText={setQuantity}
                      onFocus={() => setQuantity('')}
                      onSubmitEditing={() => {
                        amountInput.current.focus();
                      }}
                      ref={quantityInput}
                      style={styles.textInputBase}
                      value={quantity}
                    />
                  </View>
                  <View testID="amount">
                    <Text style={[styles.textInputLabelBase, { width: 150 }]}>
                      {selectedTab === 'Gastos' ? 'Costo' : 'Precio'}
                    </Text>
                    <TextInput
                      autoCorrect={false}
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
                      autoCorrect={false}
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
  secondRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
});

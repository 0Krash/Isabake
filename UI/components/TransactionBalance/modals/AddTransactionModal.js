import { useState } from 'react';
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
import DropDownPicker from 'react-native-dropdown-picker';

import SwitchSelector from '../SwitchSelector';
import formatter from '../../../utils/DateFormatter';
import CurrencyFormater from '../../../utils/CurrencyFormatter';

export default function AddTransactionModal({ visible, onClose }) {
  const [selectedDate, setSelectedDate] = useState(formatter.ddmmm(new Date()));
  const [priceValue, setPriceValue] = useState('0');

  //Calendar
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);

  //dropList
  // const [open, setOpen] = useState(false);
  // const [value, setValue] = useState(null);
  // const [items, setItems] = useState([
  //   { label: 'Apple', value: 'apple' },
  //   { label: 'Banana', value: 'banana' },
  // ]);

  //Calendar
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

  //Currency
  const hadleOnFocusInputZero = () => {
    setPriceValue('');
  };

  //Modal
  const handleModalOnClose = () => {
    onClose();
    setSelectedDate(formatter.ddmmm(new Date()));
    setPriceValue('0');
  };

  const handleCurrencyInput = (priceValue) => {
    return CurrencyFormater.MXNPesos.format(priceValue);
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
              <View style={styles.switchContainer}>
                <SwitchSelector />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.textInputLabelBase}>Descripción</Text>
                <TextInput style={styles.textInputBase} />
                <View style={styles.AmounthContainer}>
                  <View>
                    <Text style={[styles.textInputLabelBase, { width: 150 }]}>
                      Cantidad
                    </Text>
                    <TextInput
                      style={styles.textInputBase}
                      keyboardType="numeric"
                    />
                  </View>
                  <View>
                    <Text style={[styles.textInputLabelBase, { width: 150 }]}>
                      Precio
                    </Text>
                    <TextInput
                      style={styles.textInputBase}
                      // value={priceValue}
                      onFocus={hadleOnFocusInputZero}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
                <View style={styles.dateContainer}>
                  <View>
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
                  {/* <View>
                    <Text style={[styles.textInputLabelBase, { width: 150 }]}>
                      Time
                    </Text>
                    <DropDownPicker
                      style={[
                        styles.textInputLabelBase,
                        { width: 150, left: -7, borderColor: 'white' },
                      ]}
                      open={open}
                      value={value}
                      items={items}
                      setOpen={setOpen}
                      setValue={setValue}
                      setItems={setItems}
                    />
                  </View> */}
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
  dateContainer: {
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
  AmounthContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
});

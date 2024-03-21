import { useState } from 'react';
import {
  StyleSheet,
  View,
  Modal,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  TextInputBase,
} from 'react-native';
import SwitchSelector from '../SwitchSelector';

export default function AddTransactionModal({ visible, onClose }) {
  const [selectedValue, setSelectedValue] = useState(null);
  const options = [
    { label: 'Opción 1', value: 'opcion1' },
    { label: 'Opción 2', value: 'opcion2' },
    { label: 'Opción 3', value: 'opcion3' },
    { label: 'Opción 4', value: 'opcion4' },
    // Agrega más opciones según sea necesario
  ];

  const handleSelectItem = (item) => {
    setSelectedValue(item.value);
  };

  const renderOptionItem = ({ item }) => (
    <TouchableOpacity
      style={styles.optionItem}
      onPress={() => handleSelectItem(item)}
    >
      <Text>{item.label}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      transparent={true}
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <View style={styles.mainContainer}>
          <View style={{ flex: 4 }}></View>
          <View style={styles.modalView}>
            <Text>Welcome to ReactNativeTips.com</Text>

            <SwitchSelector />
            <Text>Welcome to ReactNativeTips.com</Text>
            <TextInput style={styles.textInputBase}></TextInput>
            {/* <FlatList
              data={options}
              renderItem={renderOptionItem}
              keyExtractor={(item) => item.value}
            /> */}
            <Text>Welcome to ReactNativeTips.com</Text>
            <TextInput style={styles.textInputBase}></TextInput>
            <View style={styles.dateContainer}>
              <View>
                <Text>Date</Text>
                <TextInput style={styles.textInputBase}></TextInput>
              </View>
              <View>
                <Text>Time</Text>
                <TextInput style={styles.textInputBase}></TextInput>
              </View>
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
    // alignItems: 'center',
    shadowColor: '#000',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInputBase: {
    backgroundColor: '#FEFCFF',
    margin: 10,
  },
});

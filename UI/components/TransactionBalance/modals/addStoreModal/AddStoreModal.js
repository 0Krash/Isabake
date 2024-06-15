import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import NameInputComponent from './NameInputComponent';
import AliasInputComponent from './AliasInputComponent';
import AddressInputComponent from './AddressInputComponent';
import InsertStoreButton from './InsertStoreButton';

export default function AddStoreModal({
  AddStoreModalIsVisible,
  setAddStoreModalIsVisible,
}) {
  const [storeName, setStoreName] = useState('');
  const [storeAlias, setStoreAlias] = useState('');
  const [storeAddress, setStoreAddress] = useState('');

  const storeNameInputRef = useRef(null);
  const storeAliasInputRef = useRef(null);
  const storeAddressInputRef = useRef(null);

  const [inputValidationErrorStoreName, setInputValidationErrorStoreName] =
    useState(false);
  const [inputValidationErrorStoreAlias, setInputValidationErrorStoreAlias] =
    useState(false);
  const [
    inputValidationErrorStoreAddress,
    setInputValidationErrorStoreAddress,
  ] = useState(false);

  return (
    <Modal
      transparent={true}
      animationType="slide"
      visible={AddStoreModalIsVisible}
      onRequestClose={() => {
        setAddStoreModalIsVisible(false);
      }}
    >
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <View style={styles.mainContainer}>
          <View style={[styles.modalContainerBase, { height: '75%' }]}>
            <View style={{ alignItems: 'center', margin: 20 }}>
              <Text style={{ fontSize: 25, fontWeight: '500' }}>
                🏬 Agregar nueva tienda
              </Text>
            </View>
            <ScrollView
              contentContainerStyle={styles.scrollViewContent}
              keyboardShouldPersistTaps="handled"
            >
              <NameInputComponent
                setStoreName={setStoreName}
                storeNameInputRef={storeNameInputRef}
                storeAliasInputRef={storeAliasInputRef}
                setInputValidationErrorStoreName={
                  setInputValidationErrorStoreName
                }
              />
              <AliasInputComponent
                setStoreAlias={setStoreAlias}
                storeAliasInputRef={storeAliasInputRef}
                storeAddressInputRef={storeAddressInputRef}
                setInputValidationErrorStoreAlias={
                  setInputValidationErrorStoreAlias
                }
              />
              <AddressInputComponent
                setStoreAddress={setStoreAddress}
                storeAddressInputRef={storeAddressInputRef}
                setInputValidationErrorStoreAddress={
                  setInputValidationErrorStoreAddress
                }
              />
              <InsertStoreButton
                validationError={
                  inputValidationErrorStoreName &&
                  inputValidationErrorStoreAlias &&
                  inputValidationErrorStoreAddress
                }
                storeName={storeName}
                storeAlias={storeAlias}
                storeAddress={storeAddress}
                setAddStoreModalIsVisible={setAddStoreModalIsVisible}
              />
            </ScrollView>
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
    justifyContent: 'flex-end',
  },
  modalContainerBase: {
    backgroundColor: '#EFECFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 10,
    width: '100%',
  },
});

import React, { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import stylesBase from '../../../../constants/TransactionBalance/Styles';
import InputValidation from '../../../../utils/InputValidation';

export default function AddressInputComponent({
  setStoreAddress,
  storeAddressInputRef,
  setInputValidationErrorStoreAddress,
}) {
  const [inputValue, setInputValue] = useState();
  const [validation, setValidation] = useState({ valid: true, error: '' });

  const handleOnBlur = () => {
    const result = InputValidation({ value: inputValue, maxLength: 8 });
    setValidation(result);
    setInputValidationErrorStoreAddress(result.valid);
  };

  return (
    <View testID="Address">
      <Text
        style={
          validation.valid
            ? stylesBase.textInputLabelBase
            : stylesBase.textInputLabelValidationError
        }
      >
        Dirección
      </Text>
      <TextInput
        style={
          validation.valid
            ? [stylesBase.textInputBase, { height: 90 }]
            : [stylesBase.textInputBaseValidationError, { height: 90 }]
        }
        onChangeText={(text) => {
          setInputValue(text);
          setStoreAddress(text);
          setInputValidationErrorStoreAddress(false);
        }}
        multiline={true}
        numberOfLines={2}
        blurOnSubmit={true}
        returnKeyLabel="Done"
        onBlur={handleOnBlur}
        ref={storeAddressInputRef}
      />
      {!validation.valid && (
        <Text style={stylesBase.textInputErrorValidationError}>
          {validation.error}
        </Text>
      )}
    </View>
  );
}

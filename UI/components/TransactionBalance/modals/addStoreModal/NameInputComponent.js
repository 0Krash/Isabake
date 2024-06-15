import React, { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import stylesBase from '../../../../constants/TransactionBalance/Styles';
import InputValidation from '../../../../utils/InputValidation';

export default function NameInputComponent({
  setStoreName,
  storeNameInputRef,
  storeAliasInputRef,
  setInputValidationErrorStoreName,
}) {
  const [inputValue, setInputValue] = useState();
  const [validation, setValidation] = useState({ valid: true, error: '' });

  const handleOnBlur = () => {
    const result = InputValidation({ value: inputValue, maxLength: 0 });
    setValidation(result);
    setInputValidationErrorStoreName(result.valid);
  };

  return (
    <View testID="description">
      <Text
        style={
          validation.valid
            ? stylesBase.textInputLabelBase
            : stylesBase.textInputLabelValidationError
        }
      >
        Nombre
      </Text>
      <TextInput
        style={
          validation.valid
            ? [stylesBase.textInputBase, { height: 50 }]
            : [stylesBase.textInputBaseValidationError, { height: 50 }]
        }
        onSubmitEditing={() => {
          storeAliasInputRef.current.focus();
        }}
        onChangeText={(text) => {
          setInputValue(text);
          setStoreName(text);
          setInputValidationErrorStoreName(false);
        }}
        multiline={false}
        blurOnSubmit={true}
        returnKeyLabel="Done"
        onBlur={handleOnBlur}
        ref={storeNameInputRef}
      />
      {!validation.valid && (
        <Text style={stylesBase.textInputErrorValidationError}>
          {validation.error}
        </Text>
      )}
    </View>
  );
}

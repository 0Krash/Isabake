import React, { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import useTransactionBalanceStyles from '../../../../hooks/TransactionBalance/useTransactionBalanceStyles';
import InputValidation from '../../../../utils/InputValidation';

export default function AliasInputComponent({
  setStoreAlias,
  storeAliasInputRef,
  storeAddressInputRef,
  setInputValidationErrorStoreAlias,
}) {
  const { stylesBase } = useTransactionBalanceStyles();
  const [inputValue, setInputValue] = useState();
  const [validation, setValidation] = useState({ valid: true, error: '' });

  const handleOnBlur = () => {
    const result = InputValidation({ value: inputValue, maxLength: 0 });
    setValidation(result);
    setInputValidationErrorStoreAlias(result.valid);
  };

  return (
    <View testID="Alias">
      <Text
        style={
          validation.valid
            ? stylesBase.textInputLabelBase
            : stylesBase.textInputLabelValidationError
        }
      >
        Alias (Así veras tu tienda en la lista)
      </Text>
      <TextInput
        style={
          validation.valid
            ? [stylesBase.textInputBase, { height: 50 }]
            : [stylesBase.textInputBaseValidationError, { height: 50 }]
        }
        onSubmitEditing={() => {
          storeAddressInputRef.current.focus();
        }}
        onChangeText={(text) => {
          setInputValue(text);
          setStoreAlias(text);
          setInputValidationErrorStoreAlias(false);
        }}
        multiline={false}
        blurOnSubmit={true}
        returnKeyLabel="Done"
        onBlur={handleOnBlur}
        ref={storeAliasInputRef}
      />
      {!validation.valid && (
        <Text style={stylesBase.textInputErrorValidationError}>
          {validation.error}
        </Text>
      )}
    </View>
  );
}

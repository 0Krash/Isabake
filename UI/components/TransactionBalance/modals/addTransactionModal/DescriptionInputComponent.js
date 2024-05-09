import React, { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import stylesBase from '../../../../constants/TransactionBalance/Styles';
import InputValidation from '../../../../utils/InputValidation';

export default function DescriptionInputComponent({
  category,
  setDescription,
  quantityInputRef,
  showCategoryInput,
  itemQuantityInputRef,
  setValidationErrorDescription,
}) {
  const [inputValue, setInputValue] = useState();
  const [validation, setValidation] = useState({ valid: true, error: '' });

  const handleOnBlur = () => {
    const result = InputValidation({ value: inputValue, maxLength: 8 });
    setValidation(result);
    setValidationErrorDescription(result.valid);
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
        Descripción
      </Text>
      <TextInput
        style={
          validation.valid
            ? [stylesBase.textInputBase, { height: 70 }]
            : [stylesBase.textInputBaseValidationError, { height: 70 }]
        }
        onSubmitEditing={() => {
          showCategoryInput && category === '1'
            ? itemQuantityInputRef.current.focus()
            : quantityInputRef.current.focus();
        }}
        onChangeText={(text) => {
          setInputValue(text);
          setDescription(text);
          setValidationErrorDescription(false);
        }}
        multiline={true}
        numberOfLines={2}
        blurOnSubmit={true}
        returnKeyLabel="Done"
        onBlur={handleOnBlur}
      />
      {!validation.valid && (
        <Text style={stylesBase.textInputErrorValidationError}>
          {validation.error}
        </Text>
      )}
    </View>
  );
}

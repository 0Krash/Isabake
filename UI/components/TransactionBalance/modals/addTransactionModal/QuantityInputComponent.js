import React, { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import stylesBase from '../../../../constants/TransactionBalance/Styles';
import InputValidation from '../../../../utils/InputValidation';

export default function QuantityInputComponent({
  category,
  quantity,
  setQuantity,
  amountInputRef,
  quantityInputRef,
  showCategoryInput,
  setValidationErrorQuantity,
}) {
  const [inputValue, setInputValue] = useState();
  const [validation, setValidation] = useState({ valid: true, error: '' });

  const handleOnBlur = () => {
    const result = InputValidation({
      value: parseFloat(inputValue),
    });
    setValidation(result);
    setValidationErrorQuantity(result.valid);
    isNaN(parseFloat(inputValue))
      ? setQuantity('')
      : setQuantity(parseFloat(inputValue).toString().trim());
  };

  return (
    <View testID="quantity">
      <Text
        style={
          validation.valid
            ? stylesBase.textInputLabelBase
            : stylesBase.textInputLabelValidationError
        }
      >
        {showCategoryInput && category === '1'
          ? 'Contenido neto'
          : 'Cantidad total'}
      </Text>
      <TextInput
        keyboardType="numeric"
        onChangeText={(text) => {
          setInputValue(text);
          setQuantity(text);
          setValidationErrorQuantity(false);
        }}
        onFocus={() => setQuantity(inputValue)}
        onSubmitEditing={() => amountInputRef.current.focus()}
        ref={quantityInputRef}
        style={
          validation.valid
            ? [stylesBase.textInputBase, { width: 150 }]
            : [stylesBase.textInputBaseValidationError, { width: 150 }]
        }
        value={quantity}
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

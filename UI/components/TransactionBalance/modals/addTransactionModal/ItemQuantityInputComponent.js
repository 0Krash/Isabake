import React, { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import useTransactionBalanceStyles from '../../../../hooks/TransactionBalance/useTransactionBalanceStyles';
import InputValidation from '../../../../utils/InputValidation';

export default function ItemQuantityInputComponent({
  itemQuantity,
  setItemQuantity,
  quantityInputRef,
  itemQuantityInputRef,
  setValidationErrorItemQuantity,
}) {
  const { stylesBase } = useTransactionBalanceStyles();
  const [inputValue, setInputValue] = useState();
  const [validation, setValidation] = useState({ valid: true, error: '' });

  const handleOnBlur = () => {
    const result = InputValidation({
      value: parseFloat(inputValue),
    });
    setValidation(result);
    setValidationErrorItemQuantity(result.valid);
    isNaN(parseFloat(inputValue))
      ? setItemQuantity('')
      : setItemQuantity(parseFloat(inputValue).toString().trim());
  };
  return (
    <View
      testID="quantity"
      style={{
        width: '100%',
        alignItems: 'center',
      }}
    >
      <Text
        style={
          validation.valid
            ? [stylesBase.textInputLabelBase, { left: -3 }]
            : stylesBase.textInputLabelValidationError
        }
      >
        Cantidad de Articulos
      </Text>
      <TextInput
        keyboardType="numeric"
        onChangeText={(text) => {
          setInputValue(text);
          setItemQuantity(text);
          setValidationErrorItemQuantity(false);
        }}
        onFocus={() => setItemQuantity(inputValue)}
        onSubmitEditing={() => quantityInputRef.current.focus()}
        ref={itemQuantityInputRef}
        style={
          validation.valid
            ? [stylesBase.textInputBase, { width: 200 }]
            : [stylesBase.textInputBaseValidationError, { width: 200 }]
        }
        value={itemQuantity}
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

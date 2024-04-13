import React, { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import stylesBase from '../../../constants/TransactionBalance/Styles';
import InputValidation from '../../../utils/InputValidation';

export default function AmountInputComponent({
  transactionType,
  amount,
  setAmount,
  amountInputRef,
  setValidationErrorAmount,
}) {
  const [inputValue, setInputValue] = useState();
  const [validation, setValidation] = useState({ valid: true, error: '' });

  const handleOnBlur = () => {
    const result = InputValidation({
      value: parseFloat(inputValue),
    });
    setValidation(result);
    setValidationErrorAmount(result.valid);
    isNaN(parseFloat(inputValue)) ? setAmount('') : formatInputValue();
  };

  const formatInputValue = () => {
    setAmount(
      parseFloat(inputValue)
        .toLocaleString('es-MX', {
          style: 'currency',
          currency: 'MXN',
          currencyDisplay: 'symbol',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
        .replace(/\s?MXN/g, '')
        .trim()
    );
  };

  return (
    <View testID="amount">
      <Text
        style={
          validation.valid
            ? stylesBase.textInputLabelBase
            : stylesBase.textInputLabelValidationError
        }
      >
        {transactionType === 'Gastos' ? 'Costo' : 'Precio total'}
      </Text>
      <TextInput
        autoCorrect={false}
        keyboardType="numeric"
        onBlur={handleOnBlur}
        onChangeText={(text) => {
          setInputValue(text);
          setAmount(text);
          setValidationErrorAmount(false);
        }}
        onFocus={() => setAmount(inputValue)}
        placeholder="$0.00"
        ref={amountInputRef}
        style={
          validation.valid
            ? [stylesBase.textInputBase, { width: 150 }]
            : [stylesBase.textInputBaseValidationError, { width: 150 }]
        }
        value={amount}
      />
      {!validation.valid && (
        <Text style={stylesBase.textInputErrorValidationError}>
          {validation.error}
        </Text>
      )}
    </View>
  );
}

import React from 'react';
import { Text, TextInput, View } from 'react-native';

import stylesBase from '../../../constants/TransactionBalance/Styles';

export default function AmountInputComponent({
  selectedTab,
  amount,
  setAmount,
  amountInputRef,
}) {
  const amountHandleBlur = () => {
    const numericValue = amount.replace(/[^0-9.]/g, '');
    if (numericValue !== '' && numericValue !== 0) {
      const formattedValue = parseFloat(numericValue)
        .toLocaleString('es-MX', {
          style: 'currency',
          currency: 'MXN',
          currencyDisplay: 'symbol',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
        .replace(/\s?MXN/g, '')
        .trim();
      setAmount(`${formattedValue}`);
    } else {
      setAmount('');
    }
  };

  return (
    <View testID="amount">
      <Text style={[stylesBase.textInputLabelBase]}>
        {selectedTab === 'Gastos' ? 'Costo' : 'Precio'}
      </Text>
      <TextInput
        autoCorrect={false}
        keyboardType="numeric"
        onBlur={amountHandleBlur}
        onChangeText={setAmount}
        onFocus={() => setAmount('')}
        placeholder="$0.00"
        ref={amountInputRef}
        style={[stylesBase.textInputBase, { width: 150 }]}
        value={amount}
      />
    </View>
  );
}

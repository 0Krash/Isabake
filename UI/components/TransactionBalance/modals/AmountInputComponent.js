import React from 'react';
import { Text, TextInput, View } from 'react-native';

import stylesBase from '../../../constants/TransactionBalance/Styles';

export default function AmountInputComponent({
  selectedTab,
  amount,
  setAmount,
  amountInput,
  amountHandleBlur,
}) {
  return (
    <View testID="amount">
      {/* <Text style={[stylesBase.textInputLabelBase, { width: 150 }]}> */}
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
        ref={amountInput}
        style={[stylesBase.textInputBase, { width: 150 }]}
        value={amount}
      />
    </View>
  );
}

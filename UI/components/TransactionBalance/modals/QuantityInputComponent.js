import React from 'react';
import { Text, TextInput, View } from 'react-native';

import stylesBase from '../../../constants/TransactionBalance/Styles';

export default function QuantityInputComponent({
  quantity,
  setQuantity,
  quantityInput,
  amountInput,
}) {
  return (
    <View testID="quantity">
      {/* <Text style={[stylesBase.textInputLabelBase, { width: 150 }]}> */}
      <Text style={[stylesBase.textInputLabelBase]}>Cantidad</Text>
      <TextInput
        keyboardType="numeric"
        onChangeText={setQuantity}
        onFocus={() => setQuantity('')}
        onSubmitEditing={() => amountInput.current.focus()}
        ref={quantityInput}
        style={[stylesBase.textInputBase, { width: 150 }]}
        value={quantity}
      />
    </View>
  );
}

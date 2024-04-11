import React from 'react';
import { Text, TextInput, View } from 'react-native';

import stylesBase from '../../../constants/TransactionBalance/Styles';

export default function QuantityInputComponent({
  showCategoryInput,
  selectedValue,
  quantity,
  setQuantity,
  quantityInputRef,
  amountInputRef,
}) {
  return (
    <View testID="quantity">
      <Text style={[stylesBase.textInputLabelBase]}>
        {showCategoryInput && selectedValue === '1' ? 'Contenido' : 'Cantidad'}
      </Text>
      <TextInput
        keyboardType="numeric"
        onChangeText={setQuantity}
        onFocus={() => setQuantity('')}
        onSubmitEditing={() =>
          showCategoryInput && selectedValue === '1'
            ? null
            : amountInputRef.current.focus()
        }
        ref={quantityInputRef}
        style={[stylesBase.textInputBase, { width: 150 }]}
        value={quantity}
      />
    </View>
  );
}

import React from 'react';
import { Text, TextInput, View } from 'react-native';

import stylesBase from '../../../constants/TransactionBalance/Styles';

export default function QuantityInputComponent({
  showCategoryInput,
  category,
  quantity,
  setQuantity,
  quantityInputRef,
  amountInputRef,
}) {
  return (
    <View testID="quantity">
      <Text style={[stylesBase.textInputLabelBase]}>
        {showCategoryInput && category === '1' ? 'Contenido' : 'Cantidad'}
      </Text>
      <TextInput
        keyboardType="numeric"
        onChangeText={setQuantity}
        onFocus={() => setQuantity('')}
        onSubmitEditing={() =>
          showCategoryInput && category === '1'
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

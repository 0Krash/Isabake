import React from 'react';
import { Text, TextInput, View } from 'react-native';

import stylesBase from '../../../constants/TransactionBalance/Styles';

export default function ItemQuantityInputComponent({
  itemQuantity,
  setItemQuantity,
  itemQuantityInputRef,
  quantityInputRef,
}) {
  return (
    <View
      testID="quantity"
      style={{
        width: '100%',
        alignItems: 'center',
      }}
    >
      <Text style={[stylesBase.textInputLabelBase, { left: -4 }]}>
        Cantidad de Articulos
      </Text>
      <TextInput
        keyboardType="numeric"
        onChangeText={setItemQuantity}
        onFocus={() => setItemQuantity('')}
        onSubmitEditing={() => quantityInputRef.current.focus()}
        ref={itemQuantityInputRef}
        style={[stylesBase.textInputBase, { width: 200 }]}
        value={itemQuantity}
      />
    </View>
  );
}

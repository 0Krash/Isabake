import React from 'react';
import { Text, TextInput, View } from 'react-native';

import stylesBase from '../../../constants/TransactionBalance/Styles';

export default function DescriptionInputComponent({
  itemQuantityInputRef,
  quantityInputRef,
  showCategoryInput,
  selectedValue,
}) {
  return (
    <View testID="description">
      <Text style={stylesBase.textInputLabelBase}>Descripción</Text>
      <TextInput
        style={[stylesBase.textInputBase, { height: 70 }]}
        onSubmitEditing={() =>
          showCategoryInput && selectedValue === '1'
            ? itemQuantityInputRef.current.focus()
            : quantityInputRef.current.focus()
        }
        multiline={true}
        numberOfLines={2}
        blurOnSubmit={true}
        returnKeyLabel="Done"
      />
    </View>
  );
}

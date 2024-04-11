import React from 'react';
import { Text, TextInput, View } from 'react-native';

import stylesBase from '../../../constants/TransactionBalance/Styles';

export default function DescriptionInputComponent({
  itemQuantityInputRef,
  quantityInputRef,
  setDescription,
  showCategoryInput,
  category,
}) {
  return (
    <View testID="description">
      <Text style={stylesBase.textInputLabelBase}>Descripción</Text>
      <TextInput
        style={[stylesBase.textInputBase, { height: 70 }]}
        onSubmitEditing={() =>
          showCategoryInput && category === '1'
            ? itemQuantityInputRef.current.focus()
            : quantityInputRef.current.focus()
        }
        onChangeText={setDescription}
        multiline={true}
        numberOfLines={2}
        blurOnSubmit={true}
        returnKeyLabel="Done"
      />
    </View>
  );
}

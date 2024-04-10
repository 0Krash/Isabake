import React from 'react';
import { Text, TextInput, View } from 'react-native';

import stylesBase from '../../../constants/TransactionBalance/Styles';

export default function DescriptionInputComponent({ quantityInput }) {
  return (
    <View testID="description">
      <Text style={stylesBase.textInputLabelBase}>Descripción</Text>
      <TextInput
        style={stylesBase.textInputBase}
        onSubmitEditing={() => quantityInput.current.focus()}
      />
    </View>
  );
}

import React from 'react';
import { Text, View } from 'react-native';
import RNPickerSelect from 'react-native-picker-select';

import useTransactionBalanceStyles from '../../../../hooks/TransactionBalance/useTransactionBalanceStyles';

const options = [
  { label: 'Materia prima (ingredientes básicos)', value: '1' },
  { label: 'Insumos (materiales para elavoración)', value: '2' },
  { label: 'Formación (desarrollo de habilidades)', value: '3' },
  { label: 'Operativo (gastos del negocio)', value: '4' },
];

export default function CategoryInputComponent({ category, setCategory }) {
  const { colors, stylesBase } = useTransactionBalanceStyles();

  return (
    <View testID="category">
      <Text style={stylesBase.textInputLabelBase}>Categoria</Text>
      <View
        style={[
          stylesBase.textInputBase,
          { justifyContent: 'center', textAlign: 'center' },
        ]}
      >
        <RNPickerSelect
          placeholder={{}}
          items={options}
          onValueChange={setCategory}
          value={category}
          style={{
            inputIOS: { color: colors.textPrimary },
            inputAndroid: { color: colors.textPrimary },
          }}
        />
      </View>
    </View>
  );
}

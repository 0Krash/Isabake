import React from 'react';
import { Text, View } from 'react-native';
import RNPickerSelect from 'react-native-picker-select';

import useTransactionBalanceStyles from '../../../../hooks/TransactionBalance/useTransactionBalanceStyles';

const options = [
  { label: 'Pzs', value: '0' },
  { label: 'Paq', value: '1' },
  { label: 'g', value: '2' },
  { label: 'Kg', value: '3' },
  { label: 'L', value: '4' },
  { label: 'ml', value: '5' },
];

export default function UOMInputComponent({ unitValue, setUnitValue }) {
  const { colors, stylesBase } = useTransactionBalanceStyles();

  return (
    <View testID="UOM" style={{ width: 165 }}>
      <Text style={stylesBase.textInputLabelBase}>Unidad</Text>
      <View
        style={[
          stylesBase.textInputBase,
          { justifyContent: 'center', textAlign: 'center' },
        ]}
      >
        <RNPickerSelect
          placeholder={{}}
          items={options}
          onValueChange={setUnitValue}
          value={unitValue}
          style={{
            inputIOS: { color: colors.textPrimary },
            inputAndroid: { color: colors.textPrimary },
          }}
        />
      </View>
    </View>
  );
}

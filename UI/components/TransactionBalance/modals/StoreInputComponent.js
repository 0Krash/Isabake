import React from 'react';
import { View, Text } from 'react-native';
import { SelectList } from 'react-native-dropdown-select-list';

import stylesBase from '../../../constants/TransactionBalance/Styles';

const data = [
  { key: '0', value: 'Agregar tienda...' },
  { key: '1', value: 'La Concepcion (Consti)' },
  { key: '2', value: 'La Super Cremeria (Consti)' },
  { key: '3', value: 'La Alpina (Tepeyac)' },
  { key: '4', value: 'Diary Products' },
  { key: '5', value: 'Diary Products' },
  { key: '6', value: 'Diary Products' },
  { key: '7', value: 'Diary Products' },
  { key: '8', value: 'Diary Products' },
  { key: '9', value: 'Diary Products' },
  { key: '10', value: 'Diary Products' },
  { key: '11', value: 'Diary Products' },
  { key: '12', value: 'Diary Products' },
  { key: '13', value: 'Diary Products' },
  { key: '14', value: 'Drinks' },
];

export default function StoreInputComponent({ setSelected, onSelectHandler }) {
  return (
    <View testID="store">
      <Text style={stylesBase.textInputLabelBase}>Tienda</Text>
      <SelectList
        setSelected={setSelected}
        placeholder={'Seleccione una opción...'}
        data={data}
        save="key"
        notFoundText={'Tienda no existe...'}
        onSelect={onSelectHandler}
        boxStyles={[stylesBase.textInputBase, { borderColor: 'white' }]}
        inputStyles={{
          marginTop: 0,
          fontSize: 18,
          marginLeft: 9,
          fontWeight: '400',
        }}
        dropdownStyles={{
          backgroundColor: '#FEFCFF',
          borderRadius: 15,
          margin: 10,
          textAlign: 'center',
          borderColor: 'white',
        }}
        dropdownTextStyles={{ fontWeight: '400', fontSize: 16 }}
      />
    </View>
  );
}

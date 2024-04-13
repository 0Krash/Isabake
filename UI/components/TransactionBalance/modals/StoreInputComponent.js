import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { SelectList } from 'react-native-dropdown-select-list';

import stylesBase from '../../../constants/TransactionBalance/Styles';

const data = [
  { key: '0', value: 'Agregar tienda...' },
  { key: '1', value: 'La Concepcion (Consti)' },
  { key: '2', value: 'La Super Cremeria (Consti)' },
  { key: '3', value: 'La Alpina (Tepeyac)' },
];

export default function StoreInputComponent({
  setSelected,
  setValidationErrorStore,
}) {
  const onSelectHandler = () => {
    setValidationErrorStore(true);
  };

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

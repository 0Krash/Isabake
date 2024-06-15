import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { SelectList } from 'react-native-dropdown-select-list';

import stylesBase from '../../../../constants/TransactionBalance/Styles';
import storeService from '../../../../services/TransactionBalance/API/storeService';

const convertArray = (array) => {
  return array.reduce(
    (result, obj, index) => {
      if (obj.name && obj.alias) {
        result.push({ key: `${index + 1}`, value: `${obj.alias}` });
      }
      return result;
    },
    [{ key: '0', value: 'Agregar tienda...' }]
  );
};

export default function StoreInputComponent({
  selected,
  setSelected,
  setAddStoreModalIsVisible,
  setValidationErrorStore,
  transactionType,
}) {
  const [data, setData] = useState([]);
  const [store, setStore] = useState('');

  useEffect(() => {
    async function fetchDataStores() {
      try {
        setData(convertArray(await storeService.getAllStores()));
      } catch (error) {
        console.error(
          'Error al obtener transacciones desde StoreInputComponent: ',
          error
        );
      }
    }

    if (transactionType === 'Gastos' && data.length === 0) {
      fetchDataStores();
    }
  }, [transactionType, data]);

  const onSelectHandler = () => {
    if (selected === '0') setAddStoreModalIsVisible(true);
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

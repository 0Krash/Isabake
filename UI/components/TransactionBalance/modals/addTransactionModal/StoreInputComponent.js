import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { SelectList } from 'react-native-dropdown-select-list';

import { createStylesBase } from '../../../../constants/TransactionBalance/Styles';
import typography from '../../../../constants/TransactionBalance/Typography';
import { useTransactionBalanceTheme } from '../../../../context/TransactionBalanceThemeContext';
import storeService from '../../../../services/TransactionBalance/API/storeService';

const convertArray = (array) => {
  return array.reduce(
    (result, obj, index) => {
      if (obj.name && obj.alias) {
        result.push({ key: `${index + 1}`, value: `${obj.alias}` });
      }
      return result;
    },
    [{ key: '0', value: 'Agregar tienda...' }],
  );
};

export default function StoreInputComponent({
  selected,
  setSelected,
  setAddStoreModalIsVisible,
  setValidationErrorStore,
  transactionType,
}) {
  const { colors } = useTransactionBalanceTheme();
  const stylesBase = createStylesBase(colors);
  const [data, setData] = useState([]);
  const [store, setStore] = useState('');

  useEffect(() => {
    async function fetchDataStores() {
      try {
        setData(convertArray(await storeService.getAllStores()));
      } catch (error) {
        console.error(
          'Error al obtener transacciones desde StoreInputComponent: ',
          error,
        );
      }
    }

    if (transactionType === 'Gastos' && data.length === 0) {
      fetchDataStores();
    }
  }, [transactionType, data]);

  const onSelectHandler = () => {
    if (selected === '0') {
      setAddStoreModalIsVisible(true);
    } else {
      setValidationErrorStore(true);
    }
  };

  // Function to add the new store to the list and select it
  const addNewStore = (newStoreAlias) => {
    const newStore = { key: `${data.length}`, value: newStoreAlias };
    setData([...data, newStore]);
    setSelected(newStore.key);
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
        boxStyles={[stylesBase.textInputBase, { borderColor: colors.border }]}
        inputStyles={{
          color: colors.textPrimary,
          marginTop: 0,
          fontSize: typography.sizes.body,
          marginLeft: 9,
          fontWeight: typography.weights.regular,
        }}
        dropdownStyles={{
          backgroundColor: colors.surface,
          borderRadius: 15,
          margin: 10,
          textAlign: 'center',
          borderColor: colors.border,
        }}
        dropdownTextStyles={{
          color: colors.textPrimary,
          fontSize: typography.sizes.body,
          fontWeight: typography.weights.regular,
        }}
      />
    </View>
  );
}

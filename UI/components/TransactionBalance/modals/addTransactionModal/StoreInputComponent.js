import React, { useEffect, useState } from 'react';
import { Keyboard, StyleSheet, View, Text } from 'react-native';
import { SelectList } from 'react-native-dropdown-select-list';

import { createStylesBase } from '../../../../constants/TransactionBalance/Styles';
import typography from '../../../../constants/TransactionBalance/Typography';
import { useTransactionBalanceTheme } from '../../../../context/TransactionBalanceThemeContext';
import storeService from '../../../../services/TransactionBalance/API/storeService';

const convertArray = (array) => {
  return array.reduce((result, obj) => {
    const alias = obj.Alias || obj.alias;
    const storeId = obj.storeId;

    if (storeId && alias) {
      result.push({ key: `${storeId}`, value: `${alias}` });
    }
    return result;
  }, []);
};

export default function StoreInputComponent({
  setSelected,
  setValidationErrorStore,
  transactionType,
}) {
  const { colors } = useTransactionBalanceTheme();
  const stylesBase = createStylesBase(colors);
  const [data, setData] = useState([]);
  const [hasLoadedStores, setHasLoadedStores] = useState(false);

  useEffect(() => {
    async function fetchDataStores() {
      try {
        setData(convertArray(await storeService.getAllStores()));
      } catch (error) {
        console.error(
          'Error al obtener transacciones desde StoreInputComponent: ',
          error
        );
      } finally {
        setHasLoadedStores(true);
      }
    }

    if (transactionType === 'Gastos' && !hasLoadedStores) {
      fetchDataStores();
    }
  }, [transactionType, hasLoadedStores]);

  const onSelectHandler = () => {
    setValidationErrorStore(true);
    Keyboard.dismiss();
  };

  return (
    <View testID="store">
      <Text style={stylesBase.textInputLabelBase}>Tienda</Text>
      <SelectList
        setSelected={setSelected}
        placeholder={'Seleccione una opción...'}
        data={data}
        save="key"
        search={false}
        notFoundText={'No hay tiendas registradas'}
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
      {hasLoadedStores && data.length === 0 && (
        <Text style={[styles.helperText, { color: colors.textMuted }]}>
          Administra tus tiendas desde Configuracion &gt; Tiendas.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  helperText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.regular,
    lineHeight: 17,
    marginHorizontal: 15,
    marginTop: -4,
  },
});

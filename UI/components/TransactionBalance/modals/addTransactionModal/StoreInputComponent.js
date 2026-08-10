import React, { useEffect, useMemo, useState } from 'react';
import { Keyboard, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import SelectionPickerModal from '../../SelectionPickerModal';
import { createStylesBase } from '../../../../constants/TransactionBalance/Styles';
import typography from '../../../../constants/TransactionBalance/Typography';
import { useTransactionBalanceTheme } from '../../../../context/TransactionBalanceThemeContext';
import useStoresLocal from '../../../../hooks/Stores/useStoresLocal';

const getStoreId = (store) => store.storeId || store.id;
const getStoreName = (store) => store.Alias || store.alias || store.Name || '';
const getStoreSummary = (store) => store.Name || store.name || 'Sin detalle';

const filterStores = (stores, search) => {
  const normalizedSearch = search.trim().toLowerCase();

  if (!normalizedSearch) {
    return stores;
  }

  return stores.filter((store) =>
    [getStoreName(store), getStoreSummary(store)]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(normalizedSearch),
  );
};

export default function StoreInputComponent({
  onOpenStoreManager,
  setSelected,
  setValidationErrorStore,
  transactionType,
}) {
  const { colors } = useTransactionBalanceTheme();
  const stylesBase = createStylesBase(colors);
  const { loading, refreshStores, stores } = useStoresLocal({
    autoLoad: false,
  });
  const [pickerVisible, setPickerVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [selectedStoreName, setSelectedStoreName] = useState('');
  const availableStores = useMemo(
    () =>
      filterStores(
        stores.filter((store) => getStoreId(store) && getStoreName(store)),
        search,
      ),
    [stores, search],
  );

  useEffect(() => {
    if (transactionType !== 'Gastos') {
      return;
    }

    refreshStores().catch((error) => {
      console.error(
        'Error al obtener tiendas desde StoreInputComponent: ',
        error,
      );
    });
  }, [refreshStores, transactionType]);

  const selectStore = (store) => {
    const storeId = `${getStoreId(store)}`;

    setSelected(storeId);
    setSelectedStoreId(storeId);
    setSelectedStoreName(getStoreName(store));
    setValidationErrorStore(true);
    setPickerVisible(false);
    setSearch('');
    Keyboard.dismiss();
  };

  return (
    <View style={styles.container} testID="store">
      <Text style={stylesBase.textInputLabelBase}>Tienda</Text>
      <TouchableOpacity
        accessibilityLabel="Seleccionar tienda"
        accessibilityRole="button"
        activeOpacity={0.75}
        onPress={() => {
          Keyboard.dismiss();
          setPickerVisible(true);
        }}
        style={[
          stylesBase.textInputBase,
          styles.selectBox,
          {
            backgroundColor: colors.fieldBackground,
            borderColor: selectedStoreName ? colors.primary : colors.border,
          },
        ]}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.selectTitle,
            { color: selectedStoreName ? colors.textPrimary : colors.textMuted },
          ]}
        >
          {selectedStoreName || 'Seleccionar tienda registrada'}
        </Text>
      </TouchableOpacity>
      <SelectionPickerModal
        emptyText="No hay tiendas registradas."
        getOptionDescription={getStoreSummary}
        getOptionKey={getStoreId}
        getOptionTitle={getStoreName}
        isLoading={loading}
        isVisible={pickerVisible}
        loadingText="Cargando tiendas..."
        managerLabel={onOpenStoreManager ? 'Ir a tiendas' : undefined}
        noResultsText="No encontramos tiendas con ese criterio."
        onClose={() => {
          setPickerVisible(false);
          setSearch('');
        }}
        onOpenManager={onOpenStoreManager}
        onSearchChange={setSearch}
        onSelect={selectStore}
        options={availableStores}
        searchPlaceholder="Buscar tienda..."
        searchValue={search}
        selectedKey={selectedStoreId}
        title="Seleccionar tienda"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'stretch',
  },
  selectBox: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginHorizontal: 10,
    paddingHorizontal: 14,
  },
  selectTitle: {
    flex: 1,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.regular,
  },
});

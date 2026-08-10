import React, { useEffect, useMemo, useState } from 'react';
import { Keyboard, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import SelectionPickerModal from '../../SelectionPickerModal';
import { createStylesBase } from '../../../../constants/TransactionBalance/Styles';
import typography from '../../../../constants/TransactionBalance/Typography';
import { useTransactionBalanceTheme } from '../../../../context/TransactionBalanceThemeContext';
import useClientsLocal from '../../../../hooks/Clients/useClientsLocal';

const getClientId = (client) => client.clientId || client.id;

const getClientSummary = (client) =>
  [client.phone, client.email].filter(Boolean).join(' · ') || 'Sin contacto';

const filterClients = (clients, search) => {
  const normalizedSearch = search.trim().toLowerCase();

  if (!normalizedSearch) {
    return clients;
  }

  return clients.filter((client) =>
    [client.name, client.phone, client.email]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(normalizedSearch),
  );
};

export default function ClientInputComponent({
  helperText = 'Selecciona a quien se le registra esta venta.',
  label = 'Cliente de la venta',
  onOpenClientManager,
  setSelectedClient,
  setValidationErrorClient,
}) {
  const { colors } = useTransactionBalanceTheme();
  const stylesBase = createStylesBase(colors);
  const { clients, loading, refreshClients } = useClientsLocal({
    autoLoad: false,
  });
  const [pickerVisible, setPickerVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedClientName, setSelectedClientName] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const availableClients = useMemo(
    () =>
      filterClients(
        clients.filter((client) => getClientId(client) && client.name),
        search,
      ),
    [clients, search],
  );

  useEffect(() => {
    refreshClients().catch((error) => {
      console.error('Error al cargar clientes para venta:', error);
    });
  }, [refreshClients]);

  const selectClient = (selectedClient) => {
    const clientId = getClientId(selectedClient);

    setSelectedClient({
      clientId,
      email: selectedClient.email || '',
      name: selectedClient.name || '',
      phone: selectedClient.phone || '',
    });
    setSelectedClientId(`${clientId}`);
    setSelectedClientName(selectedClient.name || '');
    setValidationErrorClient(true);
    setPickerVisible(false);
    setSearch('');
    Keyboard.dismiss();
  };

  return (
    <View style={styles.container} testID="client">
      <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
      {helperText ? (
        <Text style={[styles.fieldHint, { color: colors.textMuted }]}>
          {helperText}
        </Text>
      ) : null}
      <TouchableOpacity
        accessibilityLabel="Seleccionar cliente"
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
            borderColor: selectedClientName ? colors.primary : colors.border,
          },
        ]}
      >
        <View style={styles.selectCopy}>
          <Text
            numberOfLines={1}
            style={[
              styles.selectTitle,
              {
                color: selectedClientName
                  ? colors.textPrimary
                  : colors.textMuted,
              },
            ]}
          >
            {selectedClientName || 'Sin cliente seleccionado'}
          </Text>
          {!selectedClientName ? (
            <Text style={[styles.selectHint, { color: colors.textMuted }]}>
              Toca para seleccionar uno registrado
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
      <SelectionPickerModal
        emptyText="No hay clientes registrados."
        getOptionDescription={getClientSummary}
        getOptionKey={getClientId}
        getOptionTitle={(client) => client.name}
        isLoading={loading}
        isVisible={pickerVisible}
        loadingText="Cargando clientes..."
        managerLabel={onOpenClientManager ? 'Ir a clientes' : undefined}
        noResultsText="No encontramos clientes con ese criterio."
        onClose={() => {
          setPickerVisible(false);
          setSearch('');
        }}
        onOpenManager={onOpenClientManager}
        onSearchChange={setSearch}
        onSelect={selectClient}
        options={availableClients}
        searchPlaceholder="Buscar cliente..."
        searchValue={search}
        selectedKey={selectedClientId}
        title="Seleccionar cliente"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'stretch',
  },
  fieldHint: {
    fontSize: typography.sizes.caption,
    lineHeight: 17,
    marginBottom: 2,
    marginTop: 4,
  },
  label: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  selectBox: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 66,
    justifyContent: 'center',
    marginHorizontal: 0,
    marginVertical: 10,
    paddingHorizontal: 14,
  },
  selectCopy: {
    flex: 1,
  },
  selectHint: {
    fontSize: typography.sizes.caption,
    lineHeight: 17,
    marginTop: 3,
  },
  selectTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
});

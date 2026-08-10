import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

import AppIcon from '../../components/icons/AppIcon';
import AppCard from '../../components/layout/AppCard';
import AppHeader from '../../components/layout/AppHeader';
import AppScreen from '../../components/layout/AppScreen';
import {
  APP_HORIZONTAL_PADDING,
  getSystemNavigationClearance,
} from '../../components/layout/layoutMetrics';
import FilterChips from '../../components/TransactionBalance/FilterChips';
import DeleteConfirmationModal from '../../components/TransactionBalance/DeleteConfirmationModal';
import ManagedOptionPickerModal from '../../components/TransactionBalance/ManagedOptionPickerModal';
import typography from '../../constants/TransactionBalance/Typography';
import { useTransactionBalanceTheme } from '../../context/TransactionBalanceThemeContext';
import useClientTypesLocal from '../../hooks/Clients/useClientTypesLocal';
import useClientsLocal from '../../hooks/Clients/useClientsLocal';
import useBottomSheet from '../../hooks/useBottomSheet';
import useKeyboardBottomInset from '../../hooks/useKeyboardBottomInset';
import {
  fetchAddressFromCoordinates,
  fetchPlaceSuggestions,
  getPlaceAutocompleteBaseUrl,
} from '../../services/places/placeAutocompleteService';
import { capitalizeUserEntry } from '../../utils/textEntryFormat';

const emptyForm = {
  address: '',
  email: '',
  latitude: null,
  longitude: null,
  name: '',
  notes: '',
  phone: '',
  type: '',
};

const getClientId = (client) => client?.clientId || client?.id || '';

const getClientPhoneDigits = (client) =>
  String(client?.phone || '').replace(/[^\d+]/g, '');

const getClientCoordinate = (client, key) => {
  const value = client?.[key] ?? client?.[key[0].toUpperCase() + key.slice(1)];

  if (value === null || value === undefined || value === '') {
    return null;
  }

  const coordinate = Number(value);

  return Number.isFinite(coordinate) ? coordinate : null;
};

const hasClientMapLocation = (client) =>
  Boolean(
    client?.address?.trim() &&
      getClientCoordinate(client, 'latitude') !== null &&
      getClientCoordinate(client, 'longitude') !== null,
  );

const formatClientDate = (value = null) => {
  if (!value) {
    return 'Sin fecha registrada';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Sin fecha registrada';
  }

  return date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getInitialForm = (client) =>
  client
    ? {
        address: client.address || '',
        email: client.email || '',
        latitude: getClientCoordinate(client, 'latitude'),
        longitude: getClientCoordinate(client, 'longitude'),
        name: client.name || '',
        notes: client.notes || '',
        phone: client.phone || '',
        type: client.type || '',
      }
    : emptyForm;

const DEFAULT_MAP_CENTER = {
  latitude: 20.6767,
  longitude: -103.3475,
};

const buildMapPickerHtml = ({ latitude, longitude }) => `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="initial-scale=1, maximum-scale=1, user-scalable=no, width=device-width"
    />
    <link
      rel="stylesheet"
      href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    />
    <style>
      html, body, #map {
        height: 100%;
        margin: 0;
        width: 100%;
      }
      .leaflet-control-attribution {
        font-size: 10px;
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      const center = [${latitude}, ${longitude}];
      const map = L.map('map', { zoomControl: true }).setView(center, 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(map);
      let marker = L.marker(center).addTo(map);

      function sendPoint(latlng) {
        marker.setLatLng(latlng);
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'pointSelected',
          latitude: latlng.lat,
          longitude: latlng.lng
        }));
      }

      window.setSelectedPoint = function(latitude, longitude) {
        const latlng = L.latLng(latitude, longitude);
        marker.setLatLng(latlng);
        map.setView(latlng, 17);
      };

      map.on('click', function(event) {
        sendPoint(event.latlng);
      });
    </script>
  </body>
</html>
`;

export default function ClientsScreen({ onBack, onMapFullscreenChange } = {}) {
  const { colors } = useTransactionBalanceTheme();
  const {
    clients,
    createClient,
    deleteClient,
    loading,
    refreshClients,
    updateClient,
  } = useClientsLocal();
  const {
    clientTypes,
    createClientType,
    deleteClientType,
    isLoadingClientTypes,
    refreshClientTypes,
    setClientTypes,
  } = useClientTypesLocal();
  const [clientToDelete, setClientToDelete] = useState(null);
  const [activeClientMenuId, setActiveClientMenuId] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [editingClient, setEditingClient] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [mapSelection, setMapSelection] = useState(null);
  const [mapSelectionLoading, setMapSelectionLoading] = useState(false);
  const [mapSelectionMessage, setMapSelectionMessage] = useState('');
  const [clientTypePickerIsVisible, setClientTypePickerIsVisible] =
    useState(false);
  const [message, setMessage] = useState('');
  const [newClientType, setNewClientType] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedClientTypeFilter, setSelectedClientTypeFilter] = useState('');
  const clientCardPositions = useRef({});
  const scrollRef = useRef(null);
  const clientsMatchingSearch = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return clients;
    }

    return clients.filter((client) =>
      [client.name, client.phone, client.email, client.address, client.type]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [clients, search]);
  const filteredClients = useMemo(() => {
    const normalizedTypeFilter = selectedClientTypeFilter.trim();

    return clientsMatchingSearch.filter((client) => {
      if (!normalizedTypeFilter) {
        return true;
      }

      return (client.type || '') === normalizedTypeFilter;
    });
  }, [clientsMatchingSearch, selectedClientTypeFilter]);
  const clientTypeFilters = useMemo(() => {
    const types = new Set(['']);
    const countsByType = {
      '': clientsMatchingSearch.length,
    };

    clients.forEach((client) => {
      if (client.type) {
        types.add(client.type);
      }
    });

    clientsMatchingSearch.forEach((client) => {
      if (client.type) {
        countsByType[client.type] = (countsByType[client.type] || 0) + 1;
      }
    });

    clientTypes.forEach((type) => {
      if (type.name) {
        types.add(type.name);
      }
    });

    return [...types]
      .sort((typeA, typeB) => {
        if (!typeA) return -1;
        if (!typeB) return 1;

        return typeA.localeCompare(typeB, 'es', {
          sensitivity: 'base',
        });
      })
      .map((type) => ({
        count: countsByType[type] || 0,
        type,
      }));
  }, [clientTypes, clients, clientsMatchingSearch]);
  const formIsValid = form.name.trim().length > 0;

  const scrollToPosition = (position) => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo?.({
        animated: true,
        y: Math.max(Number(position || 0) - 10, 0),
      });
    });
  };

  const scrollToClient = (client) => {
    const position = clientCardPositions.current[getClientId(client)];

    if (typeof position === 'number') {
      scrollToPosition(position);
    }
  };

  const refreshClientsScreen = async () => {
    await Promise.all([refreshClients(), refreshClientTypes()]);
  };

  const resetForm = () => {
    setEditingClient(null);
    setForm(emptyForm);
    setFormModalOpen(false);
  };

  const openCreateModal = () => {
    setMessage('');
    setEditingClient(null);
    setForm(emptyForm);
    setNewClientType('');
    setClientTypePickerIsVisible(false);
    setFormModalOpen(true);
  };

  const cancelEdit = () => {
    const clientBeingEdited = editingClient;

    resetForm();

    if (clientBeingEdited) {
      scrollToClient(clientBeingEdited);
    }
  };

  const setField = (field, value) => {
    setMessage('');
    setForm((currentForm) => ({
      ...currentForm,
      [field]:
        field === 'name' || field === 'address'
          ? capitalizeUserEntry(value)
          : value,
      ...(field === 'address'
        ? {
            latitude: null,
            longitude: null,
          }
        : {}),
    }));
  };

  const startEdit = (client) => {
    setMessage('');
    setActiveClientMenuId(null);
    setEditingClient(client);
    setForm(getInitialForm(client));
    setNewClientType('');
    setClientTypePickerIsVisible(false);
    setFormModalOpen(true);
  };

  const openMapPicker = () => {
    Keyboard.dismiss();
    setMapSelection(
      form.address && form.latitude != null && form.longitude != null
        ? {
            address: form.address,
            latitude: Number(form.latitude),
            longitude: Number(form.longitude),
          }
        : null,
    );
    setMapSelectionLoading(false);
    setMapSelectionMessage('');
    setMapPickerOpen(true);
  };

  const closeMapPicker = () => {
    setMapSelectionLoading(false);
    setMapPickerOpen(false);
  };

  const selectMapAddress = () => {
    if (!mapSelection?.address) {
      return;
    }

    setForm((currentForm) => ({
      ...currentForm,
      address: capitalizeUserEntry(mapSelection.address),
      latitude: mapSelection.latitude ?? null,
      longitude: mapSelection.longitude ?? null,
    }));
    setMessage('');
    setMapPickerOpen(false);
  };

  const handleMapPointSelected = async (point) => {
    if (point.address) {
      setMapSelection(point);
      setMapSelectionMessage('');
      return;
    }

    setMapSelectionLoading(true);
    setMapSelectionMessage('Buscando dirección...');

    try {
      const address = await fetchAddressFromCoordinates(point);
      const fallbackAddress = `${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`;

      setMapSelection({
        ...point,
        address: address || fallbackAddress,
      });
      setMapSelectionMessage(
        address ? '' : 'No se encontró dirección. Se usarán las coordenadas.',
      );
    } catch (error) {
      console.warn('Error al obtener dirección del mapa:', error);
      setMapSelection({
        ...point,
        address: `${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`,
      });
      setMapSelectionMessage(
        'No se pudo obtener la dirección. Se usarán las coordenadas.',
      );
    } finally {
      setMapSelectionLoading(false);
    }
  };

  useEffect(() => {
    onMapFullscreenChange?.(mapPickerOpen);

    return () => {
      onMapFullscreenChange?.(false);
    };
  }, [mapPickerOpen, onMapFullscreenChange]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (mapPickerOpen) {
          closeMapPicker();
          return true;
        }

        if (activeClientMenuId) {
          setActiveClientMenuId(null);
          return true;
        }

        if (clientTypePickerIsVisible) {
          setClientTypePickerIsVisible(false);
          return true;
        }

        if (formModalOpen) {
          cancelEdit();
          return true;
        }

        if (selectedClient) {
          setSelectedClient(null);
          return true;
        }

        if (search.trim()) {
          setSearch('');
          return true;
        }

        onBack?.();
        return true;
      },
    );

    return () => {
      subscription.remove();
    };
  }, [
    activeClientMenuId,
    clientTypePickerIsVisible,
    editingClient,
    formModalOpen,
    mapPickerOpen,
    onBack,
    search,
    selectedClient,
  ]);

  const selectClientType = (typeName) => {
    setField('type', typeName);
    setClientTypePickerIsVisible(false);
  };

  const addClientType = async () => {
    const type = capitalizeUserEntry(newClientType);

    if (!type) {
      return;
    }

    try {
      const createdType = await createClientType({ name: type });

      setClientTypes((currentTypes) => {
        const nextTypes = currentTypes.filter(
          (currentType) =>
            currentType.normalizedName !== createdType.normalizedName,
        );

        return [...nextTypes, createdType].sort((typeA, typeB) =>
          typeA.name.localeCompare(typeB.name, 'es', {
            sensitivity: 'base',
          }),
        );
      });
      selectClientType(createdType.name);
      setNewClientType('');
    } catch (error) {
      console.error('Error al guardar tipo de cliente:', error);
      setMessage('No se pudo guardar el tipo de cliente.');
    }
  };

  const removeClientType = async (typeToDelete) => {
    if (!typeToDelete?.clientTypeId) {
      return;
    }

    try {
      await deleteClientType(typeToDelete.clientTypeId);
      if (form.type === typeToDelete.name) {
        setField('type', '');
      }
      setSelectedClientTypeFilter((currentType) =>
        currentType === typeToDelete.name ? '' : currentType,
      );
    } catch (error) {
      console.error('Error al eliminar tipo de cliente:', error);
      setMessage('No se pudo eliminar el tipo de cliente.');
    }
  };

  const saveClient = async () => {
    if (!formIsValid || saving) {
      setMessage('Agrega el nombre del cliente.');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const clientBeingEdited = editingClient;

      const payload = {
        ...form,
        address: form.address.trim(),
        email: form.email.trim(),
        latitude: form.latitude ?? null,
        longitude: form.longitude ?? null,
        name: form.name.trim(),
        notes: form.notes.trim(),
        phone: form.phone.trim(),
        type: form.type,
      };

      if (editingClient) {
        await updateClient(getClientId(editingClient), payload);
      } else {
        await createClient(payload);
      }

      resetForm();
      if (clientBeingEdited) {
        scrollToClient(clientBeingEdited);
      }
    } catch (error) {
      console.error('Error al guardar cliente:', error);
      setMessage('No se pudo guardar el cliente.');
    } finally {
      setSaving(false);
    }
  };

  const requestRemoveClient = (client) => {
    setMessage('');
    setActiveClientMenuId(null);
    setClientToDelete(client);
  };

  const removeClient = async () => {
    if (!clientToDelete) {
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      await deleteClient(getClientId(clientToDelete));
      if (getClientId(editingClient) === getClientId(clientToDelete)) {
        resetForm();
      }
      setClientToDelete(null);
    } catch (error) {
      console.error('Error al eliminar cliente:', error);
      setMessage('No se pudo eliminar el cliente.');
    } finally {
      setSaving(false);
    }
  };

  if (mapPickerOpen) {
    return (
      <MapPickerScreen
        colors={colors}
        isLoading={mapSelectionLoading}
        message={mapSelectionMessage}
        initialPoint={
          form.latitude != null && form.longitude != null
            ? {
                latitude: Number(form.latitude),
                longitude: Number(form.longitude),
              }
            : null
        }
        initialSearch={form.address}
        onBack={closeMapPicker}
        onConfirm={selectMapAddress}
        onPointSelected={handleMapPointSelected}
        selectedAddress={mapSelection?.address || ''}
      />
    );
  }

  return (
    <AppScreen contentContainerStyle={styles.screenContent} scroll={false}>
      <View
        onStartShouldSetResponderCapture={() => {
          if (activeClientMenuId) {
            setActiveClientMenuId(null);
          }

          return false;
        }}
        style={[
          styles.stickySearchHeader,
          { backgroundColor: colors.screenBackground },
        ]}
      >
        <AppHeader
          actionLabel="+ Crear"
          onAction={() => {
            setActiveClientMenuId(null);
            openCreateModal();
          }}
          subtitle="Para ventas más claras."
          title="Clientes registrados"
        />
        <TextInput
          onChangeText={(value) => {
            setActiveClientMenuId(null);
            setSearch(value);
          }}
          onFocus={() => setActiveClientMenuId(null)}
          placeholder="Buscar cliente..."
          placeholderTextColor={colors.textMuted}
          style={[
            styles.searchInput,
            {
              backgroundColor: colors.fieldBackground,
              borderColor: colors.border,
              color: colors.textPrimary,
            },
          ]}
          value={search}
        />
        <FilterChips
          colors={colors}
          contentContainerStyle={styles.clientFilterChipsContent}
          filters={clientTypeFilters}
          getAccessibilityLabel={({ count, type }) =>
            `Filtrar clientes por ${type || 'todos'}: ${count} clientes`
          }
          getKey={({ type }) => type}
          getLabel={({ type }) => type || 'Todos'}
          getValue={({ count }) => count}
          inactiveTextColor={colors.textMuted}
          onSelect={({ type }) => setSelectedClientTypeFilter(type)}
          selectedKey={selectedClientTypeFilter}
        />
      </View>

      {message ? (
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          {message}
        </Text>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.clientsListContent}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={() => setActiveClientMenuId(null)}
        ref={scrollRef}
        refreshControl={
          <RefreshControl
            onRefresh={refreshClientsScreen}
            refreshing={Boolean(loading || isLoadingClientTypes)}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        style={styles.clientsList}
      >
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : filteredClients.length === 0 ? (
          <AppCard>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              Sin clientes
            </Text>
            <Text style={[styles.helper, { color: colors.textMuted }]}>
              Agrega un cliente para poder seleccionarlo en tus ventas.
            </Text>
          </AppCard>
        ) : (
          filteredClients.map((client, index) => (
            <ClientCard
              client={client}
              colors={colors}
              isEditing={getClientId(editingClient) === getClientId(client)}
              key={getClientId(client)}
              menuActive={Boolean(activeClientMenuId)}
              menuOpen={activeClientMenuId === getClientId(client)}
              menuOpensUpward={
                filteredClients.length > 1 &&
                index === filteredClients.length - 1
              }
              onLayout={(event) => {
                clientCardPositions.current[getClientId(client)] =
                  event.nativeEvent.layout.y;
              }}
              onCloseMenu={() => setActiveClientMenuId(null)}
              onDelete={() => requestRemoveClient(client)}
              onDismissMenu={() => setActiveClientMenuId(null)}
              onEdit={() => startEdit(client)}
              onOpenMenu={() => setActiveClientMenuId(getClientId(client))}
              onSelect={() => setSelectedClient(client)}
              saving={saving}
            />
          ))
        )}
        {activeClientMenuId ? (
          <Pressable
            accessibilityLabel="Cerrar menu de cliente"
            onPress={() => setActiveClientMenuId(null)}
            style={styles.clientListDismissSpacer}
          />
        ) : null}
      </ScrollView>
      <ClientPresentationModal
        client={selectedClient}
        colors={colors}
        onClose={() => setSelectedClient(null)}
      />
      <ClientFormModal
        colors={colors}
        editingClient={editingClient}
        form={form}
        formIsValid={formIsValid}
        message={message}
        onCancel={cancelEdit}
        onOpenClientTypePicker={() => setClientTypePickerIsVisible(true)}
        onSelectAddress={(suggestion) => {
          setForm((currentForm) => ({
            ...currentForm,
            address: capitalizeUserEntry(suggestion.description),
            latitude: suggestion.latitude ?? null,
            longitude: suggestion.longitude ?? null,
          }));
          setMessage('');
        }}
        onSelectMap={openMapPicker}
        onSave={saveClient}
        saving={saving}
        setField={setField}
        visible={formModalOpen}
      />
      <ManagedOptionPickerModal
        canManage
        colors={colors}
        deleteAccessibilityLabel={(type) => `Eliminar tipo ${type.name}`}
        emptyLabel="Sin tipo"
        isVisible={clientTypePickerIsVisible}
        newValue={newClientType}
        newValuePlaceholder="Nuevo tipo de cliente"
        onAdd={addClientType}
        onChangeNewValue={setNewClientType}
        onClose={() => setClientTypePickerIsVisible(false)}
        onDelete={removeClientType}
        onSelect={selectClientType}
        options={clientTypes}
        selectedValue={form.type}
        title="Tipo de cliente"
      />
      <DeleteConfirmationModal
        confirmLabel="Eliminar"
        isProcessing={saving}
        message={`Se eliminará ${clientToDelete?.name || 'este cliente'} de tus clientes registrados.`}
        onCancel={() => setClientToDelete(null)}
        onConfirm={removeClient}
        title="Eliminar cliente"
        visible={Boolean(clientToDelete)}
      />
    </AppScreen>
  );
}

function ClientPresentationModal({ client, colors, onClose }) {
  const phone = getClientPhoneDigits(client);
  const hasPhone = Boolean(phone);
  const hasMapLocation = hasClientMapLocation(client);
  const latitude = getClientCoordinate(client, 'latitude');
  const longitude = getClientCoordinate(client, 'longitude');

  if (!client) {
    return null;
  }

  const openCall = () => {
    if (hasPhone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const openWhatsApp = () => {
    if (hasPhone) {
      Linking.openURL(`whatsapp://send?phone=${phone}`);
    }
  };

  const openMap = () => {
    if (hasMapLocation) {
      Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
      );
    }
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={Boolean(client)}
    >
      <View style={styles.presentationModalRoot}>
        <View
          style={[styles.modalBackdrop, { backgroundColor: colors.backdrop }]}
        >
          <Pressable onPress={onClose} style={StyleSheet.absoluteFill} />
        </View>
        <View pointerEvents="box-none" style={styles.presentationCardWrap}>
          <View
            style={[
              styles.clientPresentationSheet,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[styles.presentationHero, { borderColor: colors.border }]}
            >
              <View style={styles.clientPresentationHeader}>
                <View style={styles.clientPresentationCopy}>
                  <Text
                    numberOfLines={2}
                    style={[
                      styles.presentationTitle,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {client.name || 'Cliente sin nombre'}
                  </Text>
                </View>
              </View>
            </View>

            <Text
              style={[
                styles.presentationSectionTitle,
                { color: colors.textPrimary },
              ]}
            >
              Información de contacto
            </Text>
            <View style={styles.presentationDetails}>
              <ClientInfoLine
                colors={colors}
                label="Tipo"
                value={client.type || 'Sin tipo'}
              />
              <ClientInfoLine
                colors={colors}
                label="Teléfono"
                value={client.phone || 'Sin teléfono'}
              />
              <ClientInfoLine
                colors={colors}
                label="Email"
                value={client.email || 'Sin email'}
              />
              <ClientInfoLine
                colors={colors}
                label="Dirección"
                value={client.address || 'Sin dirección'}
              />
              <ClientInfoLine
                colors={colors}
                label="Creación"
                value={formatClientDate(client.createdAt)}
              />
              <ClientInfoLine
                colors={colors}
                label="Notas"
                lineStyle={styles.clientNotesLine}
                value={client.notes || 'Sin notas'}
              />
            </View>

            <View style={styles.presentationActions}>
              <Pressable
                accessibilityLabel="Enviar WhatsApp al cliente"
                accessibilityRole="button"
                disabled={!hasPhone}
                onPress={openWhatsApp}
                style={[
                  styles.presentationActionButton,
                  {
                    backgroundColor: colors.primaryMuted,
                    borderColor: colors.primaryMuted,
                  },
                  !hasPhone ? styles.disabledAction : null,
                ]}
              >
                <AppIcon
                  color={hasPhone ? colors.primaryText : colors.inactiveText}
                  decorative
                  name="contact-whatsapp"
                  size={22}
                />
              </Pressable>
              <Pressable
                accessibilityLabel="Llamar al cliente"
                accessibilityRole="button"
                disabled={!hasPhone}
                onPress={openCall}
                style={[
                  styles.presentationActionButton,
                  {
                    backgroundColor: colors.primaryMuted,
                    borderColor: colors.primaryMuted,
                  },
                  !hasPhone ? styles.disabledAction : null,
                ]}
              >
                <AppIcon
                  color={hasPhone ? colors.primaryText : colors.inactiveText}
                  decorative
                  name="contact-phone"
                  size={21}
                />
              </Pressable>
              <Pressable
                accessibilityLabel="Abrir dirección en mapa"
                accessibilityRole="button"
                disabled={!hasMapLocation}
                onPress={openMap}
                style={[
                  styles.presentationActionButton,
                  {
                    backgroundColor: colors.primaryMuted,
                    borderColor: colors.primaryMuted,
                  },
                  !hasMapLocation ? styles.disabledAction : null,
                ]}
              >
                <AppIcon
                  color={
                    hasMapLocation ? colors.primaryText : colors.inactiveText
                  }
                  decorative
                  name="contact-map-pin"
                  size={21}
                />
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ClientInfoLine({ colors, label, lineStyle, value }) {
  return (
    <View style={[styles.clientInfoLine, lineStyle]}>
      <Text style={[styles.presentationInfoLabel, { color: colors.textMuted }]}>
        {label}
      </Text>
      <Text style={[styles.clientInfoValue, { color: colors.textPrimary }]}>
        {value}
      </Text>
    </View>
  );
}

function ClientFormModal({
  colors,
  editingClient,
  form,
  formIsValid,
  message,
  onCancel,
  onOpenClientTypePicker,
  onSelectAddress,
  onSelectMap,
  onSave,
  saving,
  setField,
  visible,
}) {
  const { height: windowHeight } = useWindowDimensions();
  const formSheet = useBottomSheet(visible, onCancel);
  const sheetBottomInset = useKeyboardBottomInset();
  const formScrollRef = useRef(null);
  const [addressFocused, setAddressFocused] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [addressSuggestionsLoading, setAddressSuggestionsLoading] =
    useState(false);
  const addressRequestId = useRef(0);
  const canSearchAddresses = Boolean(getPlaceAutocompleteBaseUrl());
  const addressSuggestionsVisible =
    addressFocused &&
    canSearchAddresses &&
    (addressSuggestionsLoading || addressSuggestions.length > 0);
  const showAddressConfigHint =
    __DEV__ && addressFocused && !canSearchAddresses;

  useEffect(() => {
    if (!visible || !addressFocused || form.address.trim().length < 3) {
      addressRequestId.current += 1;
      setAddressSuggestions([]);
      setAddressSuggestionsLoading(false);
      return undefined;
    }

    const requestId = addressRequestId.current + 1;
    addressRequestId.current = requestId;
    setAddressSuggestionsLoading(true);

    const searchTimer = setTimeout(() => {
      fetchPlaceSuggestions(form.address)
        .then((suggestions) => {
          if (addressRequestId.current === requestId) {
            setAddressSuggestions(suggestions.slice(0, 5));
          }
        })
        .catch((error) => {
          if (addressRequestId.current === requestId) {
            setAddressSuggestions([]);
          }
          console.warn('Error al buscar sugerencias de dirección:', error);
        })
        .finally(() => {
          if (addressRequestId.current === requestId) {
            setAddressSuggestionsLoading(false);
          }
        });
    }, 350);

    return () => {
      clearTimeout(searchTimer);
    };
  }, [addressFocused, canSearchAddresses, form.address, visible]);

  if (!visible) {
    return null;
  }

  return (
    <Modal
      animationType="none"
      onRequestClose={formSheet.closeBottomSheet}
      transparent
      visible={visible}
    >
      <View style={styles.modalRoot}>
        <Animated.View
          style={[
            styles.modalBackdrop,
            { backgroundColor: colors.backdrop },
            formSheet.backdropStyle,
          ]}
        >
          <Pressable
            onPress={() => {
              Keyboard.dismiss();
              formSheet.closeBottomSheet();
            }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <KeyboardAvoidingView
          pointerEvents="box-none"
          style={[
            styles.modalKeyboardWrapper,
            { paddingBottom: sheetBottomInset },
          ]}
        >
          <Animated.View
            style={[
              styles.formSheet,
              {
                backgroundColor: colors.screenBackground,
                borderColor: colors.border,
                maxHeight: windowHeight - sheetBottomInset - 24,
              },
              formSheet.sheetStyle,
            ]}
            {...formSheet.sheetPanHandlers}
          >
            <View
              style={styles.dragHandleArea}
              {...formSheet.handlePanHandlers}
            >
              <View
                style={[styles.dragHandle, { backgroundColor: colors.border }]}
              />
            </View>
            <ScrollView
              contentContainerStyle={[
                styles.formSheetContent,
                addressSuggestionsVisible
                  ? styles.formSheetContentWithSuggestions
                  : null,
              ]}
              keyboardShouldPersistTaps="handled"
              onScroll={formSheet.onScroll}
              ref={formScrollRef}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.formHeader}>
                <Text
                  style={[styles.sectionTitle, { color: colors.textPrimary }]}
                >
                  {editingClient ? 'Editar cliente' : 'Nuevo cliente'}
                </Text>
                {editingClient ? (
                  <View
                    style={[
                      styles.editingBadge,
                      { backgroundColor: colors.primaryMuted },
                    ]}
                  >
                    <Text
                      style={[
                        styles.editingBadgeText,
                        { color: colors.primaryText },
                      ]}
                    >
                      En edición
                    </Text>
                  </View>
                ) : null}
              </View>
              <ClientField
                colors={colors}
                label="Nombre"
                onChangeText={(value) => setField('name', value)}
                placeholder="Nombre del cliente"
                value={form.name}
              />
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.textMuted }]}>
                  Tipo de cliente
                </Text>
                <Pressable
                  onPress={() => {
                    Keyboard.dismiss();
                    onOpenClientTypePicker();
                  }}
                  style={[
                    styles.selectField,
                    {
                      backgroundColor: colors.fieldBackground,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.selectFieldText,
                      {
                        color: form.type
                          ? colors.textPrimary
                          : colors.textMuted,
                      },
                    ]}
                  >
                    {form.type || 'Seleccionar tipo de cliente'}
                  </Text>
                  <Text
                    style={[
                      styles.selectFieldAction,
                      { color: colors.primaryText },
                    ]}
                  >
                    Cambiar
                  </Text>
                </Pressable>
              </View>
              <View style={styles.twoColumns}>
                <ClientField
                  colors={colors}
                  keyboardType="phone-pad"
                  label="Telefono"
                  onChangeText={(value) => setField('phone', value)}
                  placeholder="Telefono"
                  value={form.phone}
                />
                <ClientField
                  autoCapitalize="none"
                  colors={colors}
                  keyboardType="email-address"
                  label="Email"
                  onChangeText={(value) => setField('email', value)}
                  placeholder="correo@cliente.com"
                  value={form.email}
                />
              </View>
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.textMuted }]}>
                  Direccion
                </Text>
                <View
                  style={[
                    styles.addressInputWrap,
                    {
                      backgroundColor: colors.fieldBackground,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <TextInput
                    autoCapitalize="sentences"
                    onBlur={() => {
                      setTimeout(() => setAddressFocused(false), 120);
                    }}
                    onChangeText={(value) => setField('address', value)}
                    onFocus={() => {
                      setAddressFocused(true);
                      setTimeout(() => {
                        formScrollRef.current?.scrollToEnd?.({
                          animated: true,
                        });
                      }, 160);
                    }}
                    placeholder="Direccion de entrega o referencia"
                    placeholderTextColor={colors.textMuted}
                    style={[
                      styles.addressInput,
                      { color: colors.textPrimary },
                    ]}
                    value={form.address}
                  />
                  <Pressable
                    accessibilityLabel="Elegir dirección en el mapa"
                    accessibilityRole="button"
                    onPress={() => {
                      Keyboard.dismiss();
                      setAddressFocused(false);
                      setAddressSuggestions([]);
                      onSelectMap();
                    }}
                    style={[
                      styles.mapPickerInlineButton,
                      { backgroundColor: colors.primaryMuted },
                    ]}
                  >
                    <AppIcon
                      color={colors.primaryText}
                      decorative
                      name="contact-map-pin"
                      size={17}
                    />
                    <Text
                      style={[
                        styles.mapPickerInlineText,
                        { color: colors.primaryText },
                      ]}
                    >
                      Mapa
                    </Text>
                  </Pressable>
                </View>
              </View>
              <AddressSuggestions
                colors={colors}
                isLoading={addressSuggestionsLoading}
                onSelect={(suggestion) => {
                  onSelectAddress(suggestion);
                  setAddressFocused(false);
                  setAddressSuggestions([]);
                  Keyboard.dismiss();
                }}
                suggestions={
                  addressFocused && canSearchAddresses ? addressSuggestions : []
                }
              />
              {showAddressConfigHint ? (
                <Text
                  style={[
                    styles.addressSuggestionHelper,
                    { color: colors.textMuted },
                  ]}
                >
                  No se pudo cargar el buscador de direcciones.
                </Text>
              ) : null}
              <ClientField
                colors={colors}
                label="Notas"
                multiline
                onChangeText={(value) => setField('notes', value)}
                placeholder="Preferencias, horarios o detalles utiles"
                value={form.notes}
              />
              {message ? (
                <Text style={[styles.message, { color: colors.textSecondary }]}>
                  {message}
                </Text>
              ) : null}
              <View style={styles.actions}>
                <Pressable
                  disabled={saving}
                  onPress={() => {
                    Keyboard.dismiss();
                    formSheet.closeBottomSheet();
                  }}
                  style={[
                    styles.secondaryButton,
                    { borderColor: colors.border },
                  ]}
                >
                  <Text
                    style={[
                      styles.secondaryText,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {editingClient ? 'Cancelar edición' : 'Cancelar'}
                  </Text>
                </Pressable>
                <Pressable
                  disabled={!formIsValid || saving}
                  onPress={() => {
                    Keyboard.dismiss();
                    onSave();
                  }}
                  style={[
                    styles.primaryButton,
                    {
                      backgroundColor: formIsValid
                        ? colors.primary
                        : colors.border,
                    },
                  ]}
                >
                  {saving ? (
                    <ActivityIndicator
                      color={colors.textInverse}
                      size="small"
                    />
                  ) : (
                    <Text
                      style={[
                        styles.primaryText,
                        { color: colors.textInverse },
                      ]}
                    >
                      Guardar
                    </Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function ClientField({
  autoCapitalize = 'sentences',
  colors,
  keyboardType = 'default',
  label,
  multiline = false,
  onBlur,
  onChangeText,
  onFocus,
  placeholder,
  value,
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      <TextInput
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        multiline={multiline}
        onBlur={onBlur}
        onChangeText={onChangeText}
        onFocus={onFocus}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          multiline ? styles.multilineInput : null,
          {
            backgroundColor: colors.fieldBackground,
            borderColor: colors.border,
            color: colors.textPrimary,
          },
        ]}
        textAlignVertical={multiline ? 'top' : 'center'}
        value={value}
      />
    </View>
  );
}

function AddressSuggestions({ colors, isLoading, onSelect, suggestions }) {
  if (!isLoading && suggestions.length === 0) {
    return null;
  }

  return (
    <View
      style={[
        styles.addressSuggestions,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      {isLoading ? (
        <Text
          style={[styles.addressSuggestionHelper, { color: colors.textMuted }]}
        >
          Buscando direcciones...
        </Text>
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          style={styles.addressSuggestionList}
        >
          {suggestions.map((suggestion, index) => (
            <Pressable
              accessibilityLabel={`Seleccionar dirección ${suggestion.description}`}
              accessibilityRole="button"
              key={`${suggestion.id}-${suggestion.description}-${index}`}
              onPress={() => onSelect(suggestion)}
              style={styles.addressSuggestionRow}
            >
              <Text
                numberOfLines={2}
                style={[
                  styles.addressSuggestionText,
                  { color: colors.textPrimary },
                ]}
              >
                {suggestion.description}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function MapPickerScreen({
  colors,
  initialPoint,
  initialSearch = '',
  isLoading,
  message,
  onBack,
  onConfirm,
  onPointSelected,
  selectedAddress,
}) {
  const mapRef = useRef(null);
  const searchRequestId = useRef(0);
  const [search, setSearch] = useState(initialSearch);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const mapHtml = useMemo(
    () => buildMapPickerHtml(initialPoint || DEFAULT_MAP_CENTER),
    [initialPoint],
  );

  useEffect(() => {
    const normalizedSearch = search.trim();

    if (normalizedSearch.length < 3) {
      searchRequestId.current += 1;
      setSuggestions([]);
      setSuggestionsLoading(false);
      return undefined;
    }

    const requestId = searchRequestId.current + 1;
    searchRequestId.current = requestId;
    setSuggestionsLoading(true);

    const searchTimer = setTimeout(() => {
      fetchPlaceSuggestions(normalizedSearch, { limit: 6 })
        .then((nextSuggestions) => {
          if (searchRequestId.current === requestId) {
            setSuggestions(nextSuggestions);
          }
        })
        .catch((error) => {
          if (searchRequestId.current === requestId) {
            setSuggestions([]);
          }
          console.warn('Error al buscar negocios en el mapa:', error);
        })
        .finally(() => {
          if (searchRequestId.current === requestId) {
            setSuggestionsLoading(false);
          }
        });
    }, 350);

    return () => {
      clearTimeout(searchTimer);
    };
  }, [search]);

  const selectSuggestion = (suggestion) => {
    if (suggestion.latitude == null || suggestion.longitude == null) {
      return;
    }

    Keyboard.dismiss();
    setSearch(suggestion.description);
    setSuggestions([]);
    mapRef.current?.injectJavaScript?.(`
      window.setSelectedPoint(${suggestion.latitude}, ${suggestion.longitude});
      true;
    `);
    onPointSelected({
      address: suggestion.description,
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
    });
  };

  return (
    <AppScreen contentContainerStyle={styles.mapScreenContent} scroll={false}>
      <AppHeader
        subtitle="Busca una ubicación real o toca el mapa."
        title="Elegir ubicación"
      />
      <View style={styles.mapSearchBlock}>
        <View
          style={[
            styles.mapSearchInputWrap,
            {
              backgroundColor: colors.fieldBackground,
              borderColor: colors.border,
            },
          ]}
        >
          <TextInput
            onChangeText={setSearch}
            placeholder="Buscar negocio o dirección"
            placeholderTextColor={colors.textMuted}
            style={[styles.mapSearchInput, { color: colors.textPrimary }]}
            value={search}
          />
          {search.trim() ? (
            <Pressable
              accessibilityLabel="Limpiar búsqueda de ubicación"
              accessibilityRole="button"
              hitSlop={10}
              onPress={() => {
                setSearch('');
                setSuggestions([]);
                setSuggestionsLoading(false);
              }}
              style={styles.mapSearchClearButton}
            >
              <AppIcon
                color={colors.textMuted}
                decorative
                name="close"
                size={18}
              />
            </Pressable>
          ) : null}
        </View>
        <AddressSuggestions
          colors={colors}
          isLoading={suggestionsLoading}
          onSelect={selectSuggestion}
          suggestions={suggestions}
        />
      </View>
      <View style={[styles.mapScreenFrame, { borderColor: colors.border }]}>
        <WebView
          javaScriptEnabled
          onMessage={(event) => {
            try {
              const payload = JSON.parse(event.nativeEvent.data || '{}');

              if (payload.type === 'pointSelected') {
                onPointSelected({
                  latitude: Number(payload.latitude),
                  longitude: Number(payload.longitude),
                });
              }
            } catch (error) {
              console.warn('No se pudo leer la ubicación del mapa:', error);
            }
          }}
          originWhitelist={['*']}
          ref={mapRef}
          source={{ html: mapHtml }}
          style={styles.mapWebView}
        />
      </View>
      <View style={styles.mapScreenFooter}>
        {isLoading || selectedAddress || message ? (
          <View
            style={[
              styles.mapBottomPanel,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            {isLoading || selectedAddress ? (
              <View style={styles.mapResultBox}>
                {isLoading ? (
                  <ActivityIndicator color={colors.primary} size="small" />
                ) : (
                  <Text
                    numberOfLines={2}
                    style={[
                      styles.mapResultText,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {selectedAddress}
                  </Text>
                )}
              </View>
            ) : null}
            {message ? (
              <Text style={[styles.message, { color: colors.textMuted }]}>
                {message}
              </Text>
            ) : null}
          </View>
        ) : null}
        <View style={styles.mapScreenActions}>
          <Pressable
            onPress={onBack}
            style={[styles.secondaryButton, { borderColor: colors.border }]}
          >
            <Text style={[styles.secondaryText, { color: colors.textPrimary }]}>
              Cancelar
            </Text>
          </Pressable>
          <Pressable
            disabled={!selectedAddress || isLoading}
            onPress={onConfirm}
            style={[
              styles.primaryButton,
              {
                backgroundColor:
                  selectedAddress && !isLoading
                    ? colors.primary
                    : colors.border,
              },
            ]}
          >
            <Text style={[styles.primaryText, { color: colors.textInverse }]}>
              Usar dirección
            </Text>
          </Pressable>
        </View>
      </View>
    </AppScreen>
  );
}

function ClientCard({
  client,
  colors,
  isEditing,
  menuActive,
  menuOpen,
  menuOpensUpward,
  onCloseMenu,
  onDelete,
  onDismissMenu,
  onEdit,
  onLayout,
  onOpenMenu,
  onSelect,
  saving,
}) {
  const [editingBadgeVisible, setEditingBadgeVisible] = useState(isEditing);
  const editingBadgeOpacity = useRef(new Animated.Value(isEditing ? 1 : 0))
    .current;

  useEffect(() => {
    let isMounted = true;

    if (isEditing) {
      setEditingBadgeVisible(true);
      Animated.timing(editingBadgeOpacity, {
        duration: 120,
        toValue: 1,
        useNativeDriver: true,
      }).start();
      return () => {
        isMounted = false;
      };
    }

    Animated.timing(editingBadgeOpacity, {
      duration: 120,
      toValue: 0,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && isMounted) {
        setEditingBadgeVisible(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [editingBadgeOpacity, isEditing]);

  const showMenu = !editingBadgeVisible;

  return (
    <View
      style={[
        styles.clientCardWrap,
        menuOpen ? styles.clientCardMenuOpen : null,
      ]}
      onLayout={onLayout}
    >
      <AppCard
        style={[
          styles.clientCard,
          {
            borderColor: isEditing ? colors.primary : colors.border,
          },
          isEditing && { backgroundColor: colors.surface },
        ]}
      >
        <Pressable
          onPress={() => {
            if (menuActive) {
              onDismissMenu();
              return;
            }

            onSelect();
          }}
          style={styles.clientCardButton}
        >
          <View style={styles.clientCopy}>
            <Text style={[styles.clientName, { color: colors.textPrimary }]}>
              {client.name}
            </Text>
            <Text
              numberOfLines={1}
              style={[styles.clientDetail, { color: colors.textMuted }]}
            >
              {client.phone || 'Sin teléfono registrado'}
            </Text>
          </View>
          <View style={styles.clientCardActions}>
            {editingBadgeVisible ? (
              <Animated.View
                style={[
                  styles.editingBadge,
                  { backgroundColor: colors.primaryMuted },
                  { opacity: editingBadgeOpacity },
                ]}
              >
                <Text
                  style={[
                    styles.editingBadgeText,
                    { color: colors.primaryText },
                  ]}
                >
                  En edición
                </Text>
              </Animated.View>
            ) : null}
            {showMenu ? (
              <Pressable
                disabled={saving}
                onPress={(event) => {
                  event.stopPropagation();
                  menuOpen ? onCloseMenu() : onOpenMenu();
                }}
                style={styles.overflowButton}
              >
                <AppIcon
                  accessibilityLabel="Acciones del cliente"
                  color={colors.textPrimary}
                  name="dots-vertical"
                  size={20}
                />
              </Pressable>
            ) : null}
          </View>
        </Pressable>
      </AppCard>
      {showMenu && menuOpen ? (
        <View
          style={[
            styles.clientOverflowMenu,
            menuOpensUpward ? styles.clientOverflowMenuUpward : null,
            {
              backgroundColor: colors.screenBackground || colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              onCloseMenu();
              onEdit();
            }}
            style={styles.clientMenuAction}
          >
            <Text style={[styles.secondaryText, { color: colors.textPrimary }]}>
              Editar
            </Text>
          </Pressable>
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              onCloseMenu();
              onDelete();
            }}
            style={styles.clientMenuAction}
          >
            <Text style={[styles.secondaryText, { color: colors.danger }]}>
              Eliminar
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  addressSuggestionHelper: {
    fontSize: typography.sizes.bodySmall,
    lineHeight: 20,
    padding: 12,
  },
  addressSuggestionList: {
    maxHeight: 176,
  },
  addressSuggestionRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addressSuggestionText: {
    fontSize: typography.sizes.bodySmall,
    lineHeight: 20,
  },
  addressSuggestions: {
    borderRadius: 8,
    borderWidth: 1,
    marginTop: -6,
    overflow: 'hidden',
  },
  addressInput: {
    flex: 1,
    fontSize: typography.sizes.bodySmall,
    minHeight: 46,
    minWidth: 0,
    paddingLeft: 12,
    paddingRight: 8,
  },
  addressInputWrap: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 46,
    paddingRight: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  clientCardButton: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  clientCard: {
    borderWidth: 1,
    position: 'relative',
  },
  clientCardActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  clientCopy: {
    flex: 1,
    minWidth: 0,
  },
  clientDetail: {
    fontSize: typography.sizes.label,
    marginTop: 4,
  },
  clientName: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  clientCardMenuOpen: {
    zIndex: 50,
  },
  clientCardWrap: {
    position: 'relative',
    zIndex: 1,
  },
  clientInfoLine: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
  },
  clientInfoValue: {
    flex: 1,
    fontSize: typography.sizes.label,
    lineHeight: 20,
  },
  clientListDismissSpacer: {
    minHeight: 160,
  },
  clientNotesLine: {
    minHeight: 48,
  },
  clientFilterChipsContent: {
    paddingHorizontal: 0,
  },
  clientsList: {
    flex: 1,
  },
  clientsListContent: {
    gap: 10,
    paddingBottom: 14,
    paddingTop: 0,
  },
  dragHandle: {
    alignSelf: 'center',
    borderRadius: 3,
    height: 5,
    width: 44,
  },
  dragHandleArea: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 32,
    paddingBottom: 8,
    paddingTop: 8,
  },
  emptyTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  editingBadge: {
    alignItems: 'center',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: 10,
  },
  editingBadgeText: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
  },
  field: {
    flex: 1,
    gap: 6,
  },
  formHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  formSheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    maxHeight: '78%',
    padding: 18,
    paddingTop: 0,
    width: '100%',
  },
  formSheetContent: {
    gap: 14,
    paddingBottom: 26,
  },
  formSheetContentWithSuggestions: {
    paddingBottom: 84,
  },
  helper: {
    fontSize: typography.sizes.bodySmall,
    lineHeight: 20,
    marginTop: 6,
  },
  input: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: typography.sizes.bodySmall,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  label: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
  },
  message: {
    fontSize: typography.sizes.bodySmall,
    marginTop: 2,
  },
  mapBottomPanel: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  mapPickerInlineButton: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: 10,
  },
  mapPickerInlineText: {
    fontSize: typography.sizes.bodySmall,
    fontWeight: typography.weights.semibold,
  },
  mapResultBox: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  mapResultText: {
    fontSize: typography.sizes.bodySmall,
    lineHeight: 20,
    textAlign: 'center',
  },
  mapScreenActions: {
    flexDirection: 'row',
    gap: 10,
  },
  mapScreenContent: {
    flex: 1,
    gap: 12,
    paddingBottom:
      Math.max(
        getSystemNavigationClearance({ platform: Platform.OS }) - 34,
        24,
      ) + 66,
  },
  mapScreenFooter: {
    bottom: Math.max(
      getSystemNavigationClearance({ platform: Platform.OS }) - 34,
      24,
    ),
    gap: 10,
    left: APP_HORIZONTAL_PADDING,
    position: 'absolute',
    right: APP_HORIZONTAL_PADDING,
  },
  mapScreenFrame: {
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  mapSearchBlock: {
    gap: 8,
    zIndex: 2,
  },
  mapSearchClearButton: {
    alignItems: 'center',
    borderRadius: 8,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  mapSearchInput: {
    flex: 1,
    fontSize: typography.sizes.body,
    minHeight: 52,
    paddingLeft: 12,
    paddingRight: 4,
  },
  mapSearchInputWrap: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 52,
    paddingRight: 8,
  },
  mapWebView: {
    flex: 1,
  },
  modalBackdrop: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  modalKeyboardWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  clientMenuAction: {
    minWidth: 120,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  clientOverflowMenu: {
    borderRadius: 8,
    borderWidth: 1,
    elevation: 6,
    position: 'absolute',
    right: 0,
    top: 46,
    zIndex: 60,
  },
  clientOverflowMenuUpward: {
    bottom: 46,
    top: undefined,
  },
  clientPresentationCopy: {
    flex: 1,
    minWidth: 0,
  },
  clientPresentationHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  clientPresentationSheet: {
    borderCurve: 'continuous',
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    maxWidth: 420,
    overflow: 'hidden',
    padding: 18,
    paddingTop: 20,
    width: '100%',
  },
  multilineInput: {
    minHeight: 82,
    paddingTop: 12,
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryText: {
    fontSize: typography.sizes.bodySmall,
    fontWeight: typography.weights.semibold,
  },
  disabledAction: {
    opacity: 0.55,
  },
  overflowButton: {
    alignItems: 'center',
    borderRadius: 8,
    height: 34,
    justifyContent: 'center',
    marginRight: -6,
    width: 26,
  },
  searchInput: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: typography.sizes.bodySmall,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  selectField: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  selectFieldAction: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
  },
  selectFieldText: {
    flex: 1,
    fontSize: typography.sizes.bodySmall,
    minWidth: 0,
  },
  presentationActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  presentationActionButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  presentationCardWrap: {
    paddingHorizontal: 22,
    width: '100%',
  },
  presentationDetails: {
    gap: 10,
  },
  presentationHero: {
    borderBottomWidth: 1,
    marginHorizontal: -2,
    paddingBottom: 14,
    paddingHorizontal: 2,
  },
  presentationInfoLabel: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.medium,
    lineHeight: 20,
    textTransform: 'uppercase',
    width: 92,
  },
  presentationModalRoot: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 24,
  },
  presentationSectionTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    lineHeight: 22,
    marginBottom: 4,
    marginTop: 0,
  },
  presentationTitle: {
    fontSize: typography.sizes.bodyLarge,
    fontWeight: typography.weights.bold,
    lineHeight: 24,
  },
  screenContent: {
    flex: 1,
    gap: 0,
    paddingBottom: 4,
    position: 'relative',
  },
  stickySearchHeader: {
    gap: 12,
    paddingBottom: 0,
    paddingTop: 0,
  },
  secondaryButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
  },
  secondaryText: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
  },
  sectionTitle: {
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.bold,
  },
  twoColumns: {
    flexDirection: 'row',
    gap: 10,
  },
});

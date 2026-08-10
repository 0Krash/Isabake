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
import DeleteConfirmationModal from '../../components/TransactionBalance/DeleteConfirmationModal';
import typography from '../../constants/TransactionBalance/Typography';
import { useTransactionBalanceTheme } from '../../context/TransactionBalanceThemeContext';
import useStoresLocal from '../../hooks/Stores/useStoresLocal';
import useBottomSheet from '../../hooks/useBottomSheet';
import useKeyboardBottomInset from '../../hooks/useKeyboardBottomInset';
import {
  fetchAddressFromCoordinates,
  fetchPlaceSuggestions,
  getPlaceAutocompleteBaseUrl,
} from '../../services/places/placeAutocompleteService';
import { capitalizeUserEntry } from '../../utils/textEntryFormat';

const emptyForm = {
  Address: '',
  Alias: '',
  Latitude: null,
  Longitude: null,
  Name: '',
};

const getStoreId = (store) => store?.storeId || store?.id || '';

const getStoreValue = (store, key) =>
  store?.[key] || store?.[key.toLowerCase()] || '';

const getInitialForm = (store) =>
  store
    ? {
        Address: getStoreValue(store, 'Address'),
        Alias: getStoreValue(store, 'Alias'),
        Latitude: getStoreValue(store, 'Latitude') || null,
        Longitude: getStoreValue(store, 'Longitude') || null,
        Name: getStoreValue(store, 'Name'),
      }
    : emptyForm;

const getStoreTitle = (store) =>
  getStoreValue(store, 'Alias') || getStoreValue(store, 'Name') || 'Tienda';

const hasRealStoreAddress = (store) => {
  const address = getStoreValue(store, 'Address').trim();

  return Boolean(address && address.toLowerCase() !== 'sin dirección');
};

const getStoreCoordinate = (store, key) => {
  const value = store?.[key] ?? store?.[key.toLowerCase()];

  if (value === null || value === undefined || value === '') {
    return null;
  }

  const coordinate = Number(value);

  return Number.isFinite(coordinate) ? coordinate : null;
};

const getStoreSubtitle = (store) =>
  getStoreValue(store, 'Name') || 'Sin nombre registrado';

const getStoreDescription = (store) =>
  getStoreValue(store, 'Address') || 'Sin dirección registrada';

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

export default function StoresScreen({ onBack, onMapFullscreenChange } = {}) {
  const { colors } = useTransactionBalanceTheme();
  const {
    createStore,
    deleteStore,
    loading,
    refreshStores,
    stores,
    updateStore,
  } = useStoresLocal();
  const [activeStoreMenuId, setActiveStoreMenuId] = useState(null);
  const [editingStore, setEditingStore] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [mapSelection, setMapSelection] = useState(null);
  const [mapSelectionLoading, setMapSelectionLoading] = useState(false);
  const [mapSelectionMessage, setMapSelectionMessage] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedStore, setSelectedStore] = useState(null);
  const [storeToDelete, setStoreToDelete] = useState(null);
  const scrollRef = useRef(null);
  const storeCardPositions = useRef({});
  const filteredStores = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return stores;
    }

    return stores.filter((store) =>
      [
        getStoreValue(store, 'Alias'),
        getStoreValue(store, 'Name'),
        getStoreValue(store, 'Address'),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [search, stores]);
  const formIsValid =
    form.Name.trim().length > 0 && form.Alias.trim().length > 0;

  const scrollToPosition = (position) => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo?.({
        animated: true,
        y: Math.max(Number(position || 0) - 10, 0),
      });
    });
  };

  const scrollToStore = (store) => {
    const position = storeCardPositions.current[getStoreId(store)];

    if (typeof position === 'number') {
      scrollToPosition(position);
    }
  };

  const resetForm = () => {
    setEditingStore(null);
    setForm(emptyForm);
    setFormModalOpen(false);
  };

  const openCreateModal = () => {
    setActiveStoreMenuId(null);
    setEditingStore(null);
    setForm(emptyForm);
    setMessage('');
    setFormModalOpen(true);
  };

  const cancelEdit = () => {
    const storeBeingEdited = editingStore;

    resetForm();

    if (storeBeingEdited) {
      scrollToStore(storeBeingEdited);
    }
  };

  const setField = (field, value) => {
    setMessage('');
    setForm((currentForm) => ({
      ...currentForm,
      [field]:
        field === 'Name' || field === 'Address'
          ? capitalizeUserEntry(value)
          : value,
      ...(field === 'Address'
        ? {
            Latitude: null,
            Longitude: null,
          }
        : {}),
    }));
  };

  const startEdit = (store) => {
    setActiveStoreMenuId(null);
    setEditingStore(store);
    setForm(getInitialForm(store));
    setMessage('');
    setFormModalOpen(true);
  };

  const openMapPicker = () => {
    Keyboard.dismiss();
    setMapSelection(
      form.Address && form.Latitude != null && form.Longitude != null
        ? {
            address: form.Address,
            latitude: Number(form.Latitude),
            longitude: Number(form.Longitude),
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
      Address: capitalizeUserEntry(mapSelection.address),
      Latitude: mapSelection.latitude ?? null,
      Longitude: mapSelection.longitude ?? null,
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

        if (activeStoreMenuId) {
          setActiveStoreMenuId(null);
          return true;
        }

        if (formModalOpen) {
          cancelEdit();
          return true;
        }

        if (selectedStore) {
          setSelectedStore(null);
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
    activeStoreMenuId,
    formModalOpen,
    mapPickerOpen,
    onBack,
    search,
    selectedStore,
  ]);

  const saveStore = async () => {
    if (!formIsValid || saving) {
      setMessage('Agrega nombre y alias de la tienda.');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const storeBeingEdited = editingStore;
      const payload = {
        Address: form.Address.trim() || 'Sin dirección',
        Alias: form.Alias.trim(),
        Latitude: form.Latitude ?? null,
        Longitude: form.Longitude ?? null,
        Name: form.Name.trim(),
      };

      if (editingStore) {
        await updateStore(getStoreId(editingStore), payload);
      } else {
        await createStore(payload);
      }

      resetForm();
      if (storeBeingEdited) {
        scrollToStore(storeBeingEdited);
      }
    } catch (error) {
      console.error('Error al guardar tienda:', error);
      setMessage('No se pudo guardar la tienda.');
    } finally {
      setSaving(false);
    }
  };

  const requestRemoveStore = (store) => {
    setActiveStoreMenuId(null);
    setMessage('');
    setStoreToDelete(store);
  };

  const removeStore = async () => {
    if (!storeToDelete) {
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      await deleteStore(getStoreId(storeToDelete));
      if (getStoreId(editingStore) === getStoreId(storeToDelete)) {
        resetForm();
      }
      setStoreToDelete(null);
    } catch (error) {
      console.error('Error al eliminar tienda:', error);
      setMessage('No se pudo eliminar la tienda.');
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
          form.Latitude != null && form.Longitude != null
            ? {
                latitude: Number(form.Latitude),
                longitude: Number(form.Longitude),
              }
            : null
        }
        initialSearch={form.Address}
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
          if (activeStoreMenuId) {
            setActiveStoreMenuId(null);
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
          onAction={openCreateModal}
          subtitle="Para surtir tus materiales."
          title="Tiendas registradas"
        />
        <TextInput
          onChangeText={(value) => {
            setActiveStoreMenuId(null);
            setSearch(value);
          }}
          onFocus={() => setActiveStoreMenuId(null)}
          placeholder="Buscar tienda..."
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
      </View>

      {message ? (
        <Text style={[styles.message, { color: colors.textSecondary }]}>
          {message}
        </Text>
      ) : null}

      <ScrollView
        contentContainerStyle={styles.storesListContent}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={() => setActiveStoreMenuId(null)}
        ref={scrollRef}
        refreshControl={
          <RefreshControl
            onRefresh={refreshStores}
            refreshing={Boolean(loading)}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        style={styles.storesList}
      >
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : filteredStores.length === 0 ? (
          <AppCard>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              Sin tiendas
            </Text>
            <Text style={[styles.helper, { color: colors.textMuted }]}>
              Agrega una tienda para seleccionarla al registrar compras o lotes.
            </Text>
          </AppCard>
        ) : (
          filteredStores.map((store, index) => (
            <StoreCard
              colors={colors}
              isEditing={getStoreId(editingStore) === getStoreId(store)}
              key={getStoreId(store)}
              menuActive={Boolean(activeStoreMenuId)}
              menuOpen={activeStoreMenuId === getStoreId(store)}
              menuOpensUpward={
                filteredStores.length > 1 && index === filteredStores.length - 1
              }
              onDelete={() => requestRemoveStore(store)}
              onDismissMenu={() => setActiveStoreMenuId(null)}
              onEdit={() => startEdit(store)}
              onLayout={(event) => {
                storeCardPositions.current[getStoreId(store)] =
                  event.nativeEvent.layout.y;
              }}
              onOpenMenu={() => setActiveStoreMenuId(getStoreId(store))}
              onSelect={() => setSelectedStore(store)}
              saving={saving}
              store={store}
            />
          ))
        )}
        {activeStoreMenuId ? (
          <Pressable
            accessibilityLabel="Cerrar menu de tienda"
            onPress={() => setActiveStoreMenuId(null)}
            style={styles.storeListDismissSpacer}
          />
        ) : null}
      </ScrollView>
      <StorePresentationModal
        colors={colors}
        onClose={() => setSelectedStore(null)}
        store={selectedStore}
      />
      <StoreFormModal
        colors={colors}
        editingStore={editingStore}
        form={form}
        formIsValid={formIsValid}
        message={message}
        onCancel={cancelEdit}
        onSave={saveStore}
        onSelectMap={openMapPicker}
        saving={saving}
        setField={setField}
        visible={formModalOpen}
      />
      <DeleteConfirmationModal
        confirmLabel="Eliminar"
        isProcessing={saving}
        message={`Se eliminará ${getStoreTitle(storeToDelete || {})} de tus tiendas registradas.`}
        onCancel={() => setStoreToDelete(null)}
        onConfirm={removeStore}
        title="Eliminar tienda"
        visible={Boolean(storeToDelete)}
      />
    </AppScreen>
  );
}

function StorePresentationModal({ colors, onClose, store }) {
  const hasAddress = hasRealStoreAddress(store);
  const latitude = getStoreCoordinate(store, 'Latitude');
  const longitude = getStoreCoordinate(store, 'Longitude');
  const hasCoordinates = latitude !== null && longitude !== null;
  const hasMapLocation = hasCoordinates || hasAddress;

  if (!store) {
    return null;
  }

  const openMap = () => {
    const address = getStoreValue(store, 'Address');

    if (hasCoordinates) {
      Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
      );
      return;
    }

    if (address) {
      Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          address,
        )}`,
      );
    }
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={Boolean(store)}
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
              styles.storePresentationSheet,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[styles.presentationHero, { borderColor: colors.border }]}
            >
              <Text
                numberOfLines={2}
                style={[
                  styles.presentationTitle,
                  { color: colors.textPrimary },
                ]}
              >
                {getStoreTitle(store)}
              </Text>
            </View>

            <Text
              style={[
                styles.presentationSectionTitle,
                { color: colors.textPrimary },
              ]}
            >
              Información de Tienda
            </Text>
            <View style={styles.presentationDetails}>
              <StoreInfoLine
                colors={colors}
                label="Nombre"
                value={getStoreValue(store, 'Name') || 'Sin nombre'}
              />
              <StoreInfoLine
                colors={colors}
                label="Alias"
                value={getStoreValue(store, 'Alias') || 'Sin alias'}
              />
              <StoreInfoLine
                colors={colors}
                label="Dirección"
                lineStyle={styles.storeAddressLine}
                value={getStoreValue(store, 'Address') || 'Sin dirección'}
              />
            </View>

            <View style={styles.presentationActions}>
              <Pressable
                accessibilityLabel="Abrir dirección de tienda en mapa"
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
                <Text
                  style={[
                    styles.presentationActionText,
                    {
                      color: hasMapLocation
                        ? colors.primaryText
                        : colors.inactiveText,
                    },
                  ]}
                >
                  Abrir en mapa
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function StoreInfoLine({ colors, label, lineStyle, value }) {
  return (
    <View style={[styles.storeInfoLine, lineStyle]}>
      <Text style={[styles.presentationInfoLabel, { color: colors.textMuted }]}>
        {label}
      </Text>
      <Text style={[styles.storeInfoValue, { color: colors.textPrimary }]}>
        {value}
      </Text>
    </View>
  );
}

function StoreFormModal({
  colors,
  editingStore,
  form,
  formIsValid,
  message,
  onCancel,
  onSave,
  onSelectMap,
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
    if (!visible || !addressFocused || form.Address.trim().length < 3) {
      addressRequestId.current += 1;
      setAddressSuggestions([]);
      setAddressSuggestionsLoading(false);
      return undefined;
    }

    const requestId = addressRequestId.current + 1;
    addressRequestId.current = requestId;
    setAddressSuggestionsLoading(true);

    const searchTimer = setTimeout(() => {
      fetchPlaceSuggestions(form.Address)
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
  }, [addressFocused, canSearchAddresses, form.Address, visible]);

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
                  {editingStore ? 'Editar tienda' : 'Nueva tienda'}
                </Text>
                {editingStore ? (
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
              <StoreField
                colors={colors}
                label="Nombre"
                onChangeText={(value) => setField('Name', value)}
                placeholder="Nombre completo de la tienda"
                value={form.Name}
              />
              <StoreField
                autoCapitalize="characters"
                colors={colors}
                label="Alias"
                onChangeText={(value) => setField('Alias', value)}
                placeholder="Nombre corto para listas"
                value={form.Alias}
              />
              <View style={styles.field}>
                <Text style={[styles.label, { color: colors.textMuted }]}>
                  Dirección
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
                    onChangeText={(value) => setField('Address', value)}
                    onFocus={() => {
                      setAddressFocused(true);
                      setTimeout(() => {
                        formScrollRef.current?.scrollToEnd?.({
                          animated: true,
                        });
                      }, 160);
                    }}
                    placeholder="Dirección o referencia"
                    placeholderTextColor={colors.textMuted}
                    style={[
                      styles.addressInput,
                      { color: colors.textPrimary },
                    ]}
                    value={form.Address}
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
                  setForm((currentForm) => ({
                    ...currentForm,
                    Address: capitalizeUserEntry(suggestion.description),
                    Latitude: suggestion.latitude ?? null,
                    Longitude: suggestion.longitude ?? null,
                  }));
                  setMessage('');
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
                    {editingStore ? 'Cancelar edición' : 'Cancelar'}
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

function StoreField({
  autoCapitalize = 'sentences',
  colors,
  label,
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
        onBlur={onBlur}
        onChangeText={onChangeText}
        onFocus={onFocus}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          {
            backgroundColor: colors.fieldBackground,
            borderColor: colors.border,
            color: colors.textPrimary,
          },
        ]}
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
        subtitle="Busca una tienda real o toca el mapa."
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

function StoreCard({
  colors,
  isEditing,
  menuActive,
  menuOpen,
  menuOpensUpward,
  onDelete,
  onDismissMenu,
  onEdit,
  onLayout,
  onOpenMenu,
  onSelect,
  saving,
  store,
}) {
  const [editingBadgeVisible, setEditingBadgeVisible] = useState(isEditing);
  const editingBadgeOpacity = useRef(
    new Animated.Value(isEditing ? 1 : 0),
  ).current;

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
      onLayout={onLayout}
      style={[styles.storeCardWrap, menuOpen ? styles.storeCardMenuOpen : null]}
    >
      <Pressable
        accessibilityLabel={`Ver tienda ${getStoreTitle(store)}`}
        accessibilityRole="button"
        onPress={() => {
          if (menuActive) {
            onDismissMenu();
            return;
          }

          onSelect();
        }}
        style={[
          styles.storeCard,
          {
            backgroundColor: colors.surface,
            borderColor: isEditing ? colors.primary : colors.border,
          },
        ]}
      >
        <View style={styles.storeCardCopy}>
          <Text
            numberOfLines={1}
            style={[styles.storeName, { color: colors.textPrimary }]}
          >
            {getStoreTitle(store)}
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.storeAddress, { color: colors.textMuted }]}
          >
            {getStoreDescription(store)}
          </Text>
        </View>
        {editingBadgeVisible ? (
          <Animated.View
            style={[
              styles.editingBadge,
              {
                backgroundColor: colors.primaryMuted,
                opacity: editingBadgeOpacity,
              },
            ]}
          >
            <Text
              style={[styles.editingBadgeText, { color: colors.primaryText }]}
            >
              En edición
            </Text>
          </Animated.View>
        ) : null}
        {showMenu ? (
          <Pressable
            accessibilityLabel={`Abrir acciones de ${getStoreTitle(store)}`}
            accessibilityRole="button"
            disabled={saving}
            hitSlop={12}
            onPress={(event) => {
              event.stopPropagation();
              if (menuOpen) {
                onDismissMenu();
                return;
              }
              onOpenMenu();
            }}
            style={styles.storeMenuButton}
          >
            <AppIcon
              accessibilityLabel="Acciones de la tienda"
              color={colors.textPrimary}
              name="dots-vertical"
              size={20}
            />
          </Pressable>
        ) : null}
      </Pressable>
      {menuOpen ? (
        <View
          style={[
            styles.storeOverflowMenu,
            menuOpensUpward ? styles.storeOverflowMenuUpward : null,
            {
              backgroundColor: colors.screenBackground || colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Pressable
            onPress={() => {
              onDismissMenu();
              onEdit();
            }}
            style={styles.storeOverflowAction}
          >
            <Text
              style={[
                styles.storeOverflowActionText,
                { color: colors.textPrimary },
              ]}
            >
              Editar
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              onDismissMenu();
              onDelete();
            }}
            style={styles.storeOverflowAction}
          >
            <Text
              style={[styles.storeOverflowActionText, { color: colors.danger }]}
            >
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
    marginTop: 16,
  },
  disabledAction: {
    opacity: 0.45,
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
    minHeight: 30,
    paddingBottom: 8,
  },
  editingBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  editingBadgeText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  emptyTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    marginBottom: 6,
  },
  field: {
    gap: 6,
  },
  formHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  formSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
    width: '100%',
  },
  formSheetContent: {
    gap: 12,
    paddingBottom: 36,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  formSheetContentWithSuggestions: {
    paddingBottom: 84,
  },
  helper: {
    fontSize: typography.sizes.bodySmall,
    lineHeight: 20,
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
    lineHeight: 20,
    marginHorizontal: 2,
  },
  mapBottomPanel: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 12,
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
  mapScreenActions: {
    flexDirection: 'row',
    gap: 10,
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
  mapPickerInlineButton: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
    minHeight: 36,
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
  },
  presentationActionButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    flex: 1,
    gap: 8,
    height: 52,
    justifyContent: 'center',
  },
  presentationActionText: {
    fontSize: typography.sizes.bodySmall,
    fontWeight: typography.weights.bold,
  },
  presentationActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  presentationCardWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  presentationDetails: {
    gap: 14,
    marginTop: 14,
  },
  presentationHero: {
    borderBottomWidth: 1,
    paddingBottom: 18,
  },
  presentationInfoLabel: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
  },
  presentationModalRoot: {
    flex: 1,
  },
  presentationSectionTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    marginTop: 20,
  },
  presentationTitle: {
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.bold,
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    minHeight: 52,
    justifyContent: 'center',
  },
  primaryText: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  screenContent: {
    flex: 1,
    gap: 14,
    paddingBottom: 0,
  },
  searchInput: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: typography.sizes.bodySmall,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  secondaryButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 52,
    justifyContent: 'center',
  },
  secondaryText: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  sectionTitle: {
    fontSize: typography.sizes.bodyLarge,
    fontWeight: typography.weights.semibold,
  },
  stickySearchHeader: {
    gap: 12,
    paddingTop: 0,
    zIndex: 4,
  },
  storeAddress: {
    fontSize: typography.sizes.bodySmall,
    lineHeight: 20,
    marginTop: 4,
  },
  storeAddressLine: {
    minHeight: 70,
  },
  storeCard: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 76,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  storeCardCopy: {
    flex: 1,
    minWidth: 0,
  },
  storeCardMenuOpen: {
    zIndex: 10,
  },
  storeCardWrap: {
    position: 'relative',
    zIndex: 1,
  },
  storeInfoLine: {
    gap: 4,
  },
  storeInfoValue: {
    fontSize: typography.sizes.body,
    lineHeight: 22,
  },
  storeListDismissSpacer: {
    height: 76,
    marginTop: -76,
  },
  storeMenuButton: {
    alignItems: 'center',
    borderRadius: 8,
    height: 34,
    justifyContent: 'center',
    marginRight: -6,
    width: 26,
  },
  storeName: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  storeOverflowAction: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  storeOverflowActionText: {
    fontSize: typography.sizes.bodySmall,
    fontWeight: typography.weights.semibold,
  },
  storeOverflowMenu: {
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 132,
    overflow: 'hidden',
    position: 'absolute',
    right: 8,
    top: 58,
    zIndex: 20,
  },
  storeOverflowMenuUpward: {
    bottom: 58,
    top: 'auto',
  },
  storePresentationSheet: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
  },
  storesList: {
    flex: 1,
    marginTop: -2,
  },
  storesListContent: {
    gap: 10,
    paddingBottom: 120,
  },
});

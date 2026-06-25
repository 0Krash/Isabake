import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Keyboard,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import typography from '../../../../constants/TransactionBalance/Typography';
import { useTransactionBalanceTheme } from '../../../../context/TransactionBalanceThemeContext';
import useStoresLocal from '../../../../hooks/Stores/useStoresLocal';

const emptyForm = {
  Address: '',
  Alias: '',
  Name: '',
};

const getStoreValue = (store, key) =>
  store?.[key] || store?.[key.toLowerCase()] || '';
const SCREEN_HEIGHT = Dimensions.get('screen').height;

const StoreFormField = ({
  autoCapitalize,
  colors: fieldColors,
  helperText,
  label,
  onChangeText,
  placeholder,
  returnKeyType,
  value,
}) => (
  <View style={styles.formField}>
    <Text style={[styles.formLabel, { color: fieldColors.textMuted }]}>
      {label}
    </Text>
    <TextInput
      accessibilityLabel={label}
      autoCapitalize={autoCapitalize}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={fieldColors.textMuted}
      returnKeyType={returnKeyType}
      style={[
        styles.textInput,
        {
          backgroundColor: fieldColors.fieldBackground,
          color: fieldColors.textPrimary,
        },
      ]}
      value={value}
    />
    {!!helperText && (
      <Text style={[styles.fieldHelperText, { color: fieldColors.textMuted }]}>
        {helperText}
      </Text>
    )}
  </View>
);

export default function AddStoreModal({
  AddStoreModalIsVisible,
  onStoresChanged,
  setAddStoreModalIsVisible,
}) {
  const { colors } = useTransactionBalanceTheme();
  const sheetTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const keyboardTranslateY = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const scrollOffsetY = useRef(0);
  const {
    createStore,
    deleteStore,
    loading: storesAreLoading,
    refreshStores,
    stores,
    updateStore,
  } = useStoresLocal({ autoLoad: false });
  const [form, setForm] = useState(emptyForm);
  const [editingStore, setEditingStore] = useState(null);
  const [mode, setMode] = useState('list');
  const [storeSearchText, setStoreSearchText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [storeToDelete, setStoreToDelete] = useState(null);
  const [isDeletingStore, setIsDeletingStore] = useState(false);
  const [discardDialogIsVisible, setDiscardDialogIsVisible] = useState(false);
  const [discardAction, setDiscardAction] = useState('list');
  const [isSavingStore, setIsSavingStore] = useState(false);
  const sheetHeight = SCREEN_HEIGHT * 0.82;
  const isFormValid =
    form.Name.trim().length > 0 &&
    form.Alias.trim().length > 0;
  const initialForm = editingStore
    ? {
        Address: getStoreValue(editingStore, 'Address'),
        Alias: getStoreValue(editingStore, 'Alias'),
        Name: getStoreValue(editingStore, 'Name'),
      }
    : emptyForm;
  const formHasChanges =
    mode !== 'list' &&
    (form.Name !== initialForm.Name ||
      form.Alias !== initialForm.Alias ||
      form.Address !== initialForm.Address);
  const filteredStores = useMemo(() => {
    const normalizedSearch = storeSearchText.trim().toLowerCase();

    if (!normalizedSearch) {
      return stores;
    }

    return stores.filter((store) =>
      [
        getStoreValue(store, 'Name'),
        getStoreValue(store, 'Alias'),
        getStoreValue(store, 'Address'),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [storeSearchText, stores]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingStore(null);
    setMode('list');
    setDiscardDialogIsVisible(false);
  };

  const fetchStores = useCallback(async () => {
    setErrorMessage('');

    try {
      await refreshStores();
    } catch (error) {
      console.error('Error al obtener tiendas desde StoreManagerModal:', error);
      setErrorMessage('No se pudieron cargar las tiendas. Intenta de nuevo.');
    }
  }, [refreshStores]);

  const handleModalOnClose = useCallback(() => {
    setAddStoreModalIsVisible(false);
    resetForm();
    setStoreSearchText('');
    setErrorMessage('');
    setSuccessMessage('');
    setStoreToDelete(null);
    setDiscardDialogIsVisible(false);
    setDiscardAction('list');
  }, [setAddStoreModalIsVisible]);

  const resetSwipePosition = useCallback(() => {
    Animated.spring(sheetTranslateY, {
      damping: 18,
      stiffness: 180,
      toValue: 0,
      useNativeDriver: true,
    }).start();
  }, [sheetTranslateY]);

  const dismissBottomSheet = useCallback(() => {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(sheetTranslateY, {
        duration: 190,
        toValue: SCREEN_HEIGHT,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        duration: 190,
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start(handleModalOnClose);
  }, [backdropOpacity, handleModalOnClose, sheetTranslateY]);

  const closeBottomSheet = useCallback(() => {
    if (formHasChanges) {
      setDiscardAction('close');
      setDiscardDialogIsVisible(true);
      resetSwipePosition();
      return;
    }

    dismissBottomSheet();
  }, [dismissBottomSheet, formHasChanges, resetSwipePosition]);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return undefined;
    }

    const keyboardShowListener = Keyboard.addListener('keyboardDidShow', (event) => {
      Animated.timing(keyboardTranslateY, {
        duration: 120,
        toValue: Math.min(event.endCoordinates.height, SCREEN_HEIGHT * 0.28),
        useNativeDriver: true,
      }).start();
    });
    const keyboardHideListener = Keyboard.addListener('keyboardDidHide', () => {
      Animated.timing(keyboardTranslateY, {
        duration: 120,
        toValue: 0,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      keyboardShowListener.remove();
      keyboardHideListener.remove();
    };
  }, [keyboardTranslateY]);

  useEffect(() => {
    if (AddStoreModalIsVisible) {
      fetchStores();
      sheetTranslateY.setValue(SCREEN_HEIGHT);
      backdropOpacity.setValue(0);

      Animated.parallel([
        Animated.timing(sheetTranslateY, {
          duration: 240,
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          duration: 180,
          toValue: 1,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [
    AddStoreModalIsVisible,
    backdropOpacity,
    fetchStores,
    sheetTranslateY,
  ]);

  const shouldCaptureSheetSwipe = (_, gestureState) =>
    scrollOffsetY.current <= 0 &&
    gestureState.dy > 8 &&
    Math.abs(gestureState.dy) > Math.abs(gestureState.dx);

  const sheetPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: shouldCaptureSheetSwipe,
        onMoveShouldSetPanResponderCapture: shouldCaptureSheetSwipe,
        onPanResponderMove: (_, gestureState) => {
          sheetTranslateY.setValue(Math.max(0, gestureState.dy));
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 120 || gestureState.vy > 1.1) {
            closeBottomSheet();
            return;
          }

          resetSwipePosition();
        },
        onPanResponderTerminate: resetSwipePosition,
      }),
    [closeBottomSheet, resetSwipePosition, sheetTranslateY]
  );

  const handlePanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          gestureState.dy > 6 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onMoveShouldSetPanResponderCapture: (_, gestureState) =>
          gestureState.dy > 6 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderMove: (_, gestureState) => {
          sheetTranslateY.setValue(Math.max(0, gestureState.dy));
        },
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dy > 90 || gestureState.vy > 0.9) {
            closeBottomSheet();
            return;
          }

          resetSwipePosition();
        },
        onPanResponderTerminate: resetSwipePosition,
      }),
    [closeBottomSheet, resetSwipePosition, sheetTranslateY]
  );

  const updateFormValue = (key, value) => {
    setForm((currentForm) => ({
      ...currentForm,
      [key]: value,
    }));
  };

  const handleCreateStore = () => {
    setErrorMessage('');
    setSuccessMessage('');
    setForm(emptyForm);
    setEditingStore(null);
    setMode('create');
  };

  const handleEditStore = (store) => {
    setErrorMessage('');
    setSuccessMessage('');
    setEditingStore(store);
    setForm({
      Address: getStoreValue(store, 'Address'),
      Alias: getStoreValue(store, 'Alias'),
      Name: getStoreValue(store, 'Name'),
    });
    setMode('edit');
  };

  const handleSaveStore = async () => {
    if (!isFormValid || isSavingStore) {
      return;
    }

    setIsSavingStore(true);
    setErrorMessage('');
    setSuccessMessage('');
    const isEditing = mode === 'edit';
    const payload = {
      Address: form.Address.trim() || 'Sin dirección',
      Alias: form.Alias.trim(),
      Name: form.Name.trim(),
    };

    try {
      if (isEditing) {
        await updateStore(editingStore.storeId, payload);
      } else {
        await createStore(payload);
      }

      onStoresChanged?.();
      resetForm();
      setSuccessMessage(isEditing ? 'Tienda actualizada' : 'Tienda creada');
    } catch (error) {
      console.error('Error al guardar tienda desde StoreManagerModal:', error);
      setErrorMessage('No se pudo guardar la tienda. Intenta de nuevo.');
    } finally {
      setIsSavingStore(false);
    }
  };

  const handleDeleteStore = (store) => {
    setErrorMessage('');
    setSuccessMessage('');
    setStoreToDelete(store);
  };

  const confirmDeleteStore = async () => {
    if (!storeToDelete || isDeletingStore) {
      return;
    }

    setIsDeletingStore(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      await deleteStore(storeToDelete.storeId);
      onStoresChanged?.();
      setSuccessMessage('Tienda eliminada');
      setStoreToDelete(null);
    } catch (error) {
      console.error('Error al eliminar tienda desde StoreManagerModal:', error);
      setErrorMessage('No se pudo eliminar la tienda. Intenta de nuevo.');
    } finally {
      setIsDeletingStore(false);
    }
  };

  const handleCancelForm = () => {
    Keyboard.dismiss();

    if (formHasChanges) {
      setDiscardAction('list');
      setDiscardDialogIsVisible(true);
      return;
    }

    resetForm();
  };

  const discardFormChanges = () => {
    Keyboard.dismiss();
    resetForm();

    if (discardAction === 'close') {
      dismissBottomSheet();
    }
  };

  const renderStoreList = () => {
    if (storesAreLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="small" />
          <Text style={[styles.helperText, { color: colors.textMuted }]}>
            Cargando tiendas...
          </Text>
        </View>
      );
    }

    if (stores.length === 0) {
      return (
        <View style={[styles.emptyState, { borderColor: colors.border }]}>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            No hay tiendas registradas
          </Text>
          <Text style={[styles.helperText, { color: colors.textMuted }]}>
            Agrega la primera tienda para usarla en tus gastos.
          </Text>
        </View>
      );
    }

    if (filteredStores.length === 0) {
      return (
        <View style={[styles.emptyState, { borderColor: colors.border }]}>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            No encontramos tiendas
          </Text>
          <Text style={[styles.helperText, { color: colors.textMuted }]}>
            Prueba con otro nombre, alias o dirección.
          </Text>
        </View>
      );
    }

    return filteredStores.map((store) => (
      <View
        key={store.storeId}
        style={[
          styles.storeCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={styles.storeHeader}>
          <View style={styles.storeInfo}>
            <Text style={[styles.storeName, { color: colors.textPrimary }]}>
              {getStoreValue(store, 'Name')}
            </Text>
            <Text style={[styles.storeAlias, { color: colors.primary }]}>
              {getStoreValue(store, 'Alias')}
            </Text>
          </View>
        </View>
        <Text style={[styles.storeAddress, { color: colors.textSecondary }]}>
          {getStoreValue(store, 'Address')}
        </Text>
        <View style={styles.storeActions}>
          <TouchableOpacity
            accessibilityLabel={`Editar tienda ${getStoreValue(store, 'Alias')}`}
            accessibilityRole="button"
            activeOpacity={0.75}
            onPress={() => {
              Keyboard.dismiss();
              handleEditStore(store);
            }}
            style={[styles.secondaryButton, { borderColor: colors.border }]}
          >
            <Text
              style={[
                styles.secondaryButtonText,
                { color: colors.textPrimary },
              ]}
            >
              Editar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityLabel={`Eliminar tienda ${getStoreValue(store, 'Alias')}`}
            accessibilityRole="button"
            activeOpacity={0.75}
            onPress={(event) => {
              event.stopPropagation();
              Keyboard.dismiss();
              handleDeleteStore(store);
            }}
            style={[styles.secondaryButton, { borderColor: colors.danger }]}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.danger }]}>
              Eliminar
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    ));
  };

  const renderStoreForm = () => (
    <View style={styles.formContainer}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        {mode === 'edit' ? 'Editar tienda' : 'Nueva tienda'}
      </Text>
      <StoreFormField
        colors={colors}
        helperText="Úsalo para identificar la tienda internamente."
        label="Nombre completo"
        onChangeText={(value) => updateFormValue('Name', value)}
        placeholder="Ej. Walmart Express Centro"
        returnKeyType="next"
        value={form.Name}
      />
      <StoreFormField
        autoCapitalize="characters"
        colors={colors}
        helperText="Este nombre corto aparece en listas, gastos e inventario."
        label="Alias corto para listas"
        onChangeText={(value) => updateFormValue('Alias', value)}
        placeholder="Ej. WALMART CENTRO"
        returnKeyType="next"
        value={form.Alias}
      />
      <StoreFormField
        colors={colors}
        helperText="Opcional. Si no la conoces, se guardará como “Sin dirección”."
        label="Dirección o referencia"
        onChangeText={(value) => updateFormValue('Address', value)}
        placeholder="Ej. Av. Centro 123"
        returnKeyType="done"
        value={form.Address}
      />
      <View style={styles.formActions}>
        <TouchableOpacity
          accessibilityLabel="Cancelar edición de tienda"
          accessibilityRole="button"
          activeOpacity={0.75}
          onPress={handleCancelForm}
          style={[styles.cancelButton, { borderColor: colors.border }]}
        >
          <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
            Cancelar
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityLabel="Guardar tienda"
          accessibilityRole="button"
          accessibilityState={{ disabled: !isFormValid || isSavingStore }}
          activeOpacity={0.75}
          disabled={!isFormValid || isSavingStore}
          onPress={() => {
            Keyboard.dismiss();
            handleSaveStore();
          }}
          style={[
            styles.saveButton,
            { backgroundColor: isFormValid ? colors.primary : colors.primaryMuted },
          ]}
        >
          {isSavingStore ? (
            <ActivityIndicator color={colors.textInverse} size="small" />
          ) : (
            <Text style={[styles.saveButtonText, { color: colors.textInverse }]}>
              Guardar
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal
      animationType="none"
      onRequestClose={closeBottomSheet}
      transparent={true}
      visible={AddStoreModalIsVisible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <View style={styles.mainContainer}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.backdrop,
              {
                backgroundColor: colors.backdrop,
                opacity: backdropOpacity,
              },
            ]}
          />
          <Pressable style={styles.backdropPressable} onPress={closeBottomSheet} />
          <Animated.View
            {...sheetPanResponder.panHandlers}
            style={[
              styles.modalContainerBase,
              {
                backgroundColor: colors.screenBackground,
                height: sheetHeight,
                transform: [
                  {
                    translateY: Animated.add(
                      sheetTranslateY,
                      keyboardTranslateY
                    ),
                  },
                ],
              },
            ]}
          >
            <View
              style={styles.dragHandleArea}
              {...handlePanResponder.panHandlers}
            >
              <View
                style={[styles.dragHandle, { backgroundColor: colors.border }]}
              />
            </View>
            <View style={styles.titleContainer}>
              <View>
                <Text style={[styles.title, { color: colors.textPrimary }]}>
                  Administrar tiendas
                </Text>
                <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                  Consulta, agrega y actualiza tus puntos de venta.
                </Text>
              </View>
              {mode === 'list' && (
                <TouchableOpacity
                  accessibilityLabel="Agregar tienda"
                  accessibilityRole="button"
                  activeOpacity={0.75}
                  onPress={() => {
                    Keyboard.dismiss();
                    handleCreateStore();
                  }}
                  style={[styles.addButton, { backgroundColor: colors.primary }]}
                >
                  <Text style={[styles.addButtonText, { color: colors.textInverse }]}>
                    +
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            {!!errorMessage && (
              <View
                style={[
                  styles.messageBox,
                  {
                    backgroundColor: colors.dangerSurface,
                    borderColor: colors.danger,
                  },
                ]}
              >
                <Text style={[styles.messageText, { color: colors.danger }]}>
                  {errorMessage}
                </Text>
                {mode === 'list' && (
                  <TouchableOpacity
                    accessibilityLabel="Reintentar cargar tiendas"
                    accessibilityRole="button"
                    activeOpacity={0.75}
                    onPress={fetchStores}
                  >
                    <Text
                      style={[
                        styles.messageActionText,
                        { color: colors.danger },
                      ]}
                    >
                      Reintentar
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            {!!successMessage && (
              <View
                style={[
                  styles.messageBox,
                  {
                    backgroundColor: colors.primaryMuted,
                    borderColor: colors.primary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    { color: colors.primaryText },
                  ]}
                >
                  {successMessage}
                </Text>
              </View>
            )}
            {mode === 'list' && (
              <View style={styles.searchContainer}>
                <TextInput
                  accessibilityLabel="Buscar tienda"
                  onChangeText={setStoreSearchText}
                  placeholder="Buscar tienda, alias o dirección..."
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.searchInput,
                    {
                      backgroundColor: colors.fieldBackground,
                      borderColor: colors.border,
                      color: colors.textPrimary,
                    },
                  ]}
                  value={storeSearchText}
                />
                {storeSearchText.length > 0 && (
                  <Pressable
                    accessibilityLabel="Limpiar búsqueda de tiendas"
                    accessibilityRole="button"
                    onPress={() => {
                      Keyboard.dismiss();
                      setStoreSearchText('');
                    }}
                    style={[
                      styles.clearButton,
                      { backgroundColor: colors.surfaceMuted },
                    ]}
                  >
                    <Text
                      style={[
                        styles.clearButtonText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      x
                    </Text>
                  </Pressable>
                )}
                <Text style={[styles.helperText, { color: colors.textMuted }]}>
                  {filteredStores.length} de {stores.length} tienda
                  {stores.length === 1 ? '' : 's'}
                </Text>
              </View>
            )}
            <ScrollView
              contentContainerStyle={[
                styles.scrollViewContent,
                mode !== 'list' && styles.formScrollViewContent,
              ]}
              keyboardShouldPersistTaps="handled"
              onScroll={(event) => {
                scrollOffsetY.current = event.nativeEvent.contentOffset.y;
              }}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={false}
            >
              {mode === 'list' ? renderStoreList() : renderStoreForm()}
            </ScrollView>
          </Animated.View>
          {!!storeToDelete && (
            <View style={styles.dialogRoot}>
              <Pressable
                accessibilityLabel="Cancelar eliminación de tienda"
                onPress={() => {
                  if (!isDeletingStore) {
                    setStoreToDelete(null);
                  }
                }}
                style={[
                  styles.dialogBackdrop,
                  { backgroundColor: colors.softBackdrop },
                ]}
              />
              <View
                style={[
                  styles.dialogCard,
                  {
                    backgroundColor: colors.screenBackground,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[styles.dialogTitle, { color: colors.textPrimary }]}
                >
                  Eliminar tienda
                </Text>
                <Text
                  style={[styles.dialogMessage, { color: colors.textMuted }]}
                >
                  Se eliminará {getStoreValue(storeToDelete, 'Alias')} (
                  {getStoreValue(storeToDelete, 'Name')}). Dirección:{' '}
                  {getStoreValue(storeToDelete, 'Address') || 'Sin dirección'}.
                </Text>
                <Text
                  style={[styles.dialogMessage, { color: colors.textMuted }]}
                >
                  ¿Seguro que deseas eliminar esta tienda?
                </Text>
                <View style={styles.dialogActions}>
                  <TouchableOpacity
                    accessibilityLabel="Cancelar eliminación"
                    accessibilityRole="button"
                    activeOpacity={0.75}
                    disabled={isDeletingStore}
                    onPress={() => setStoreToDelete(null)}
                    style={[styles.cancelButton, { borderColor: colors.border }]}
                  >
                    <Text
                      style={[
                        styles.cancelButtonText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Cancelar
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityLabel="Confirmar eliminación de tienda"
                    accessibilityRole="button"
                    activeOpacity={0.75}
                    disabled={isDeletingStore}
                    onPress={confirmDeleteStore}
                    style={[
                      styles.saveButton,
                      {
                        backgroundColor: isDeletingStore
                          ? colors.surfaceMuted
                          : colors.danger,
                      },
                    ]}
                  >
                    {isDeletingStore ? (
                      <ActivityIndicator color={colors.inactiveText} size="small" />
                    ) : (
                      <Text
                        style={[
                          styles.saveButtonText,
                          { color: colors.textInverse },
                        ]}
                      >
                        Eliminar
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          {discardDialogIsVisible && (
            <View style={styles.dialogRoot}>
              <Pressable
                accessibilityLabel="Continuar editando tienda"
                onPress={() => setDiscardDialogIsVisible(false)}
                style={[
                  styles.dialogBackdrop,
                  { backgroundColor: colors.softBackdrop },
                ]}
              />
              <View
                style={[
                  styles.dialogCard,
                  {
                    backgroundColor: colors.screenBackground,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[styles.dialogTitle, { color: colors.textPrimary }]}
                >
                  Descartar cambios
                </Text>
                <Text
                  style={[styles.dialogMessage, { color: colors.textMuted }]}
                >
                  Tienes cambios sin guardar en esta tienda.
                </Text>
                <View style={styles.dialogActions}>
                  <TouchableOpacity
                    accessibilityLabel="Seguir editando tienda"
                    accessibilityRole="button"
                    activeOpacity={0.75}
                    onPress={() => setDiscardDialogIsVisible(false)}
                    style={[styles.cancelButton, { borderColor: colors.border }]}
                  >
                    <Text
                      style={[
                        styles.cancelButtonText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Seguir editando
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityLabel="Descartar cambios de tienda"
                    accessibilityRole="button"
                    activeOpacity={0.75}
                    onPress={discardFormChanges}
                    style={[
                      styles.saveButton,
                      { backgroundColor: colors.danger },
                    ]}
                  >
                    <Text
                      style={[
                        styles.saveButtonText,
                        { color: colors.textInverse },
                      ]}
                    >
                      Descartar
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  addButton: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  addButtonText: {
    fontSize: typography.sizes.amount,
    fontWeight: typography.weights.regular,
    lineHeight: 28,
  },
  backdrop: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  backdropPressable: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  clearButton: {
    alignItems: 'center',
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    position: 'absolute',
    right: 10,
    top: 10,
    width: 28,
  },
  clearButtonText: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    lineHeight: 20,
  },
  cancelButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    height: 48,
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
  },
  dragHandle: {
    alignSelf: 'center',
    borderRadius: 3,
    height: 5,
    width: 44,
  },
  dialogActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  dialogBackdrop: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  dialogCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginHorizontal: 18,
    padding: 18,
    width: '90%',
  },
  dialogMessage: {
    fontSize: typography.sizes.label,
    lineHeight: 19,
    marginTop: 8,
  },
  dialogRoot: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  dialogTitle: {
    fontSize: typography.sizes.bodyLarge,
    fontWeight: typography.weights.bold,
  },
  dragHandleArea: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    paddingBottom: 10,
    paddingTop: 8,
  },
  emptyState: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
  },
  emptyTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    marginBottom: 6,
  },
  formActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  formContainer: {
    gap: 10,
  },
  formField: {
    gap: 6,
  },
  fieldHelperText: {
    fontSize: typography.sizes.caption,
    lineHeight: 17,
    marginTop: -2,
  },
  formLabel: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.medium,
  },
  helperText: {
    fontSize: typography.sizes.caption,
    lineHeight: 17,
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 28,
  },
  mainContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainerBase: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 14,
    width: '100%',
  },
  messageActionText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
  },
  messageBox: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  messageText: {
    flex: 1,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    lineHeight: 17,
  },
  saveButton: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    height: 48,
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
  },
  searchContainer: {
    gap: 6,
    marginBottom: 12,
  },
  searchInput: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: typography.sizes.body,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingRight: 48,
  },
  scrollViewContent: {
    paddingBottom: 18,
  },
  formScrollViewContent: {
    paddingBottom: 96,
  },
  secondaryButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    height: 38,
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  sectionTitle: {
    fontSize: typography.sizes.bodyLarge,
    fontWeight: typography.weights.semibold,
    marginBottom: 4,
  },
  storeActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  storeAddress: {
    fontSize: typography.sizes.caption,
    lineHeight: 17,
    marginTop: 6,
  },
  storeAlias: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    marginTop: 3,
  },
  storeCard: {
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
    padding: 12,
  },
  storeHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  storeId: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.medium,
  },
  storeInfo: {
    flex: 1,
    paddingRight: 10,
  },
  storeName: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  subtitle: {
    fontSize: typography.sizes.caption,
    lineHeight: 17,
    marginTop: 4,
  },
  textInput: {
    borderRadius: 8,
    fontSize: typography.sizes.body,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  title: {
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.semibold,
  },
  titleContainer: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
});

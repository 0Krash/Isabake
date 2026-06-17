import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
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
import storeService from '../../../../services/TransactionBalance/API/storeService';

const emptyForm = {
  Address: '',
  Alias: '',
  Name: '',
};

const getStoreValue = (store, key) => store?.[key] || store?.[key.toLowerCase()] || '';
const SCREEN_HEIGHT = Dimensions.get('screen').height;

export default function AddStoreModal({
  AddStoreModalIsVisible,
  setAddStoreModalIsVisible,
}) {
  const { colors } = useTransactionBalanceTheme();
  const sheetTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const keyboardTranslateY = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const scrollOffsetY = useRef(0);
  const [stores, setStores] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingStore, setEditingStore] = useState(null);
  const [mode, setMode] = useState('list');
  const [isLoadingStores, setIsLoadingStores] = useState(false);
  const [isSavingStore, setIsSavingStore] = useState(false);
  const sheetHeight = SCREEN_HEIGHT * 0.82;
  const isFormValid =
    form.Name.trim().length > 0 &&
    form.Alias.trim().length > 0 &&
    form.Address.trim().length > 0;

  const resetForm = () => {
    setForm(emptyForm);
    setEditingStore(null);
    setMode('list');
  };

  const fetchStores = useCallback(async () => {
    setIsLoadingStores(true);

    try {
      setStores(await storeService.getAllStores());
    } catch (error) {
      console.error('Error al obtener tiendas desde StoreManagerModal:', error);
    } finally {
      setIsLoadingStores(false);
    }
  }, []);

  const handleModalOnClose = useCallback(() => {
    setAddStoreModalIsVisible(false);
    resetForm();
  }, [setAddStoreModalIsVisible]);

  const resetSwipePosition = useCallback(() => {
    Animated.spring(sheetTranslateY, {
      damping: 18,
      stiffness: 180,
      toValue: 0,
      useNativeDriver: true,
    }).start();
  }, [sheetTranslateY]);

  const closeBottomSheet = useCallback(() => {
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

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return undefined;
    }

    const keyboardShowListener = Keyboard.addListener('keyboardDidShow', (event) => {
      Animated.timing(keyboardTranslateY, {
        duration: 120,
        toValue: event.endCoordinates.height,
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
    setForm(emptyForm);
    setEditingStore(null);
    setMode('create');
  };

  const handleEditStore = (store) => {
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
    const payload = {
      Address: form.Address.trim(),
      Alias: form.Alias.trim(),
      Name: form.Name.trim(),
    };

    try {
      if (mode === 'edit') {
        await storeService.updateStoreById(editingStore.storeId, payload);
      } else {
        await storeService.postStore(payload);
      }

      await fetchStores();
      resetForm();
    } catch (error) {
      console.error('Error al guardar tienda desde StoreManagerModal:', error);
    } finally {
      setIsSavingStore(false);
    }
  };

  const handleDeleteStore = (store) => {
    Alert.alert(
      'Eliminar tienda',
      `Esta accion eliminara ${getStoreValue(store, 'Alias')}.`,
      [
        { style: 'cancel', text: 'Cancelar' },
        {
          onPress: async () => {
            try {
              await storeService.deleteStoreById(store.storeId);
              await fetchStores();
            } catch (error) {
              console.error(
                'Error al eliminar tienda desde StoreManagerModal:',
                error
              );
            }
          },
          style: 'destructive',
          text: 'Eliminar',
        },
      ]
    );
  };

  const renderStoreList = () => {
    if (isLoadingStores) {
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

    return stores.map((store) => (
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
          <Text style={[styles.storeId, { color: colors.textMuted }]}>
            #{store.storeId}
          </Text>
        </View>
        <Text style={[styles.storeAddress, { color: colors.textSecondary }]}>
          {getStoreValue(store, 'Address')}
        </Text>
        <View style={styles.storeActions}>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => handleEditStore(store)}
            style={[styles.secondaryButton, { borderColor: colors.border }]}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>
              Editar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => handleDeleteStore(store)}
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
      <TextInput
        onChangeText={(value) => updateFormValue('Name', value)}
        placeholder="Nombre"
        placeholderTextColor={colors.textMuted}
        returnKeyType="next"
        style={[
          styles.textInput,
          { backgroundColor: colors.fieldBackground, color: colors.textPrimary },
        ]}
        value={form.Name}
      />
      <TextInput
        autoCapitalize="characters"
        onChangeText={(value) => updateFormValue('Alias', value)}
        placeholder="Alias"
        placeholderTextColor={colors.textMuted}
        returnKeyType="next"
        style={[
          styles.textInput,
          { backgroundColor: colors.fieldBackground, color: colors.textPrimary },
        ]}
        value={form.Alias}
      />
      <TextInput
        onChangeText={(value) => updateFormValue('Address', value)}
        placeholder="Direccion"
        placeholderTextColor={colors.textMuted}
        returnKeyType="done"
        style={[
          styles.textInput,
          { backgroundColor: colors.fieldBackground, color: colors.textPrimary },
        ]}
        value={form.Address}
      />
      <View style={styles.formActions}>
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={resetForm}
          style={[styles.cancelButton, { borderColor: colors.border }]}
        >
          <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
            Cancelar
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.75}
          disabled={!isFormValid || isSavingStore}
          onPress={handleSaveStore}
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
      <View style={styles.keyboardView}>
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
                  activeOpacity={0.75}
                  onPress={handleCreateStore}
                  style={[styles.addButton, { backgroundColor: colors.primary }]}
                >
                  <Text style={[styles.addButtonText, { color: colors.textInverse }]}>
                    +
                  </Text>
                </TouchableOpacity>
              )}
            </View>
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
        </View>
      </View>
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
    flexDirection: 'row',
    gap: 8,
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

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Animated,
  BackHandler,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import TransactionMenu, {
  TransactionMenuButton,
} from '../../components/TransactionBalance/TransactionMenu';
import AddStoreModal from '../../components/TransactionBalance/modals/addStoreModal/AddStoreModal';
import DatePickerComponent from '../../components/TransactionBalance/modals/addTransactionModal/DatePickerComponent';
import typography from '../../constants/TransactionBalance/Typography';
import { useTransactionBalanceTheme } from '../../context/TransactionBalanceThemeContext';
import useInventoryData, {
  normalizeInventoryItem,
  toApiInventoryItem,
} from '../../hooks/Inventory/useInventoryData';
import inventoryService from '../../services/TransactionBalance/API/inventoryService';
import storeService from '../../services/TransactionBalance/API/storeService';

const ingredientUnits = [
  { description: 'Gramos', key: 'g' },
  { description: 'Kilogramos', key: 'kg' },
  { description: 'Mililitros', key: 'ml' },
  { description: 'Litros', key: 'l' },
  { description: 'Piezas', key: 'pza' },
  { description: 'Cucharadas', key: 'cda' },
  { description: 'Cucharaditas', key: 'cdta' },
];

const getIngredientUnitLabel = (unitKey) =>
  ingredientUnits.find((unit) => unit.key === unitKey)?.description || 'Unidad';

const unitGroups = {
  cda: 'spoon',
  cdta: 'spoon',
  g: 'weight',
  kg: 'weight',
  l: 'volume',
  ml: 'volume',
  pza: 'piece',
};

const emptyInventoryForm = {
  category: '',
  minimumStock: '',
  name: '',
  notes: '',
  storage: '',
};

const emptyLotForm = {
  brand: '',
  cost: '',
  expiryDate: '',
  expiryApplies: false,
  purchaseDate: '',
  quality: 4,
  quantity: '',
  supplier: '',
  supplierId: null,
  taxApplies: false,
  taxRate: '',
  unit: 'g',
};

const hasLotFormChanges = (lotForm) =>
  lotForm.brand.trim() !== emptyLotForm.brand ||
  String(lotForm.cost).trim() !== emptyLotForm.cost ||
  lotForm.expiryDate !== emptyLotForm.expiryDate ||
  lotForm.expiryApplies !== emptyLotForm.expiryApplies ||
  String(lotForm.purchaseDate).trim() !== emptyLotForm.purchaseDate ||
  Number(lotForm.quality) !== Number(emptyLotForm.quality) ||
  String(lotForm.quantity).trim() !== emptyLotForm.quantity ||
  String(lotForm.supplier).trim() !== emptyLotForm.supplier ||
  lotForm.supplierId !== emptyLotForm.supplierId ||
  lotForm.taxApplies !== emptyLotForm.taxApplies ||
  String(lotForm.taxRate).trim() !== emptyLotForm.taxRate ||
  lotForm.unit !== emptyLotForm.unit;

const allowedUnits = ['g', 'kg', 'ml', 'l', 'pza', 'cda', 'cdta'];

const normalizeUnit = (unit) => {
  const normalizedUnit = String(unit || 'g')
    .trim()
    .toLowerCase();
  return allowedUnits.includes(normalizedUnit) ? normalizedUnit : 'g';
};

const normalizeQuality = (quality) => {
  const normalizedQuality = Number(quality || 3);

  if (Number.isNaN(normalizedQuality)) {
    return 3;
  }

  return Math.min(Math.max(normalizedQuality, 1), 5);
};

const getStoreValue = (store, key) =>
  store?.[key] || store?.[key.toLowerCase()] || '';

const formatDateForApi = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const inventoryDateToSelected = (dateValue) => {
  if (!dateValue) {
    return '';
  }

  const date = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear().toString().slice(-2);
  const month = date.toLocaleString('es-MX', { month: 'short' }).toLowerCase();
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${day}-${month}-${year}`;
};

const toBaseQuantity = (quantity, unit) => {
  if (unit === 'kg' || unit === 'l') {
    return quantity * 1000;
  }

  return quantity;
};

const formatQuantity = (quantity, group) => {
  if (group === 'weight') {
    return quantity >= 1000
      ? `${(quantity / 1000).toFixed(2)} kg`
      : `${quantity.toFixed(0)} g`;
  }

  if (group === 'volume') {
    return quantity >= 1000
      ? `${(quantity / 1000).toFixed(2)} l`
      : `${quantity.toFixed(0)} ml`;
  }

  if (group === 'spoon') {
    return `${quantity.toFixed(0)} cda/cdta`;
  }

  return `${quantity.toFixed(0)} pza`;
};

const formatDate = (dateValue) => {
  if (!dateValue) {
    return 'No aplica';
  }

  return new Date(`${dateValue}T00:00:00`).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatCurrencyInput = (value) => {
  const numericValue = Number(String(value || '').replace(/[^0-9.]/g, ''));

  if (!String(value || '').trim() || Number.isNaN(numericValue)) {
    return '';
  }

  return new Intl.NumberFormat('es-MX', {
    currency: 'MXN',
    style: 'currency',
  }).format(numericValue);
};

const formatPercentageInput = (value) => {
  const numericValue = Number(String(value || '').replace(/[^0-9.]/g, ''));

  if (!String(value || '').trim() || Number.isNaN(numericValue)) {
    return '';
  }

  const normalizedValue = Number.isInteger(numericValue)
    ? numericValue
    : Number(numericValue.toFixed(2));

  return `${normalizedValue}%`;
};

const getDaysUntilExpiry = (dateValue) => {
  if (!dateValue) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(`${dateValue}T00:00:00`);
  const diff = expiry.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const getIngredientSummary = (item) => {
  const lots = item.lots || [];
  const availableLots = lots.filter((lot) => {
    const daysUntilExpiry = getDaysUntilExpiry(lot.expiryDate);
    return daysUntilExpiry === null || daysUntilExpiry > 0;
  });
  const totals = availableLots.reduce((result, lot) => {
    const group = unitGroups[lot.unit] || lot.unit;
    result[group] =
      (result[group] || 0) + toBaseQuantity(lot.quantity, lot.unit);
    return result;
  }, {});
  const totalText =
    Object.entries(totals)
      .map(([group, quantity]) => formatQuantity(quantity, group))
      .join(' + ') || '0';
  const expiringLots = lots.filter((lot) => !!lot.expiryDate);
  const nextExpiry = expiringLots.reduce(
    (nearest, lot) =>
      !nearest || lot.expiryDate < nearest.expiryDate ? lot : nearest,
    null,
  );

  return {
    nextExpiry,
    totalText,
  };
};

const getInitials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

function useBottomSheet(isVisible, onClose) {
  const { height: windowHeight } = useWindowDimensions();
  const sheetTranslateY = useRef(new Animated.Value(windowHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const scrollOffsetY = useRef(0);

  const resetSwipePosition = useCallback(() => {
    Animated.spring(sheetTranslateY, {
      damping: 18,
      stiffness: 180,
      toValue: 0,
      useNativeDriver: true,
    }).start();
  }, [sheetTranslateY]);

  const closeBottomSheet = useCallback(() => {
    Animated.parallel([
      Animated.timing(sheetTranslateY, {
        duration: 190,
        toValue: windowHeight,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        duration: 190,
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start(onClose);
  }, [backdropOpacity, onClose, sheetTranslateY, windowHeight]);

  useEffect(() => {
    if (isVisible) {
      sheetTranslateY.setValue(windowHeight);
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
  }, [backdropOpacity, isVisible, sheetTranslateY, windowHeight]);

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
    [closeBottomSheet, resetSwipePosition, sheetTranslateY],
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
    [closeBottomSheet, resetSwipePosition, sheetTranslateY],
  );

  const handleScroll = useCallback((event) => {
    scrollOffsetY.current = event.nativeEvent.contentOffset.y;
  }, []);

  return {
    backdropStyle: { opacity: backdropOpacity },
    closeBottomSheet,
    handlePanHandlers: handlePanResponder.panHandlers,
    onScroll: handleScroll,
    sheetPanHandlers: sheetPanResponder.panHandlers,
    sheetStyle: { transform: [{ translateY: sheetTranslateY }] },
  };
}

export default function InventoryScreen() {
  const { colors } = useTransactionBalanceTheme();
  const {
    inventoryItems,
    isLoadingInventory,
    refreshInventory,
    setInventoryItems,
  } = useInventoryData();
  const [addStoreModalIsVisible, setAddStoreModalIsVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [deleteIsProcessing, setDeleteIsProcessing] = useState(false);
  const [menuIsVisible, setMenuIsVisible] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [formIsVisible, setFormIsVisible] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [inventoryForm, setInventoryForm] = useState(emptyInventoryForm);
  const [storeRefreshKey, setStoreRefreshKey] = useState(0);
  const keyboardIsVisibleRef = useRef(false);

  const selectedItem = useMemo(
    () => inventoryItems.find((item) => item.id === selectedItemId),
    [inventoryItems, selectedItemId],
  );

  const filteredItems = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    if (!normalizedSearch) {
      return inventoryItems;
    }

    return inventoryItems.filter((item) =>
      `${item.name} ${item.category} ${item.storage}`
        .toLowerCase()
        .includes(normalizedSearch),
    );
  }, [inventoryItems, searchText]);

  useEffect(() => {
    const keyboardShowListener = Keyboard.addListener('keyboardDidShow', () => {
      keyboardIsVisibleRef.current = true;
    });
    const keyboardHideListener = Keyboard.addListener('keyboardDidHide', () => {
      keyboardIsVisibleRef.current = false;
    });

    return () => {
      keyboardShowListener.remove();
      keyboardHideListener.remove();
    };
  }, []);

  useEffect(() => {
    const backSubscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        const canClearInventorySearch =
          searchText.trim().length > 0 &&
          !keyboardIsVisibleRef.current &&
          !addStoreModalIsVisible &&
          !formIsVisible &&
          !menuIsVisible &&
          !selectedItemId;

        if (canClearInventorySearch) {
          setSearchText('');
          return true;
        }

        return false;
      },
    );

    return () => {
      backSubscription.remove();
    };
  }, [
    addStoreModalIsVisible,
    formIsVisible,
    menuIsVisible,
    searchText,
    selectedItemId,
  ]);

  const handleOpenStoreManager = () => {
    setMenuIsVisible(false);
    setTimeout(() => {
      setAddStoreModalIsVisible(true);
    }, 90);
  };

  const openCreateForm = () => {
    setEditingItemId(null);
    setInventoryForm(emptyInventoryForm);
    setFormIsVisible(true);
  };

  const openEditForm = (item) => {
    setEditingItemId(item.id);
    setInventoryForm({
      category: item.category,
      minimumStock: `${item.minimumStock || ''}`,
      name: item.name,
      notes: item.notes,
      storage: item.storage,
    });
    setFormIsVisible(true);
  };

  const closeForm = () => {
    setFormIsVisible(false);
    setEditingItemId(null);
    setInventoryForm(emptyInventoryForm);
  };

  const saveInventoryItem = async () => {
    const name = inventoryForm.name.trim();

    if (!name) {
      Alert.alert('Nombre requerido', 'Agrega el nombre del ingrediente.');
      return;
    }

    const currentItem = inventoryItems.find(
      (item) => item.id === editingItemId,
    );
    const payload = {
      ...currentItem,
      ...inventoryForm,
      lots: currentItem?.lots || [],
      minimumStock: Number(inventoryForm.minimumStock || 0),
      name,
    };

    try {
      if (currentItem) {
        const response = await inventoryService.updateInventoryItemById(
          currentItem.inventoryId,
          toApiInventoryItem(payload),
        );
        const updatedItem = normalizeInventoryItem(response.data.inventoryItem);
        setInventoryItems((items) =>
          items.map((item) =>
            item.id === updatedItem.id ? updatedItem : item,
          ),
        );
      } else {
        const response = await inventoryService.postInventoryItem(
          toApiInventoryItem(payload),
        );
        const createdItem = normalizeInventoryItem(response.data.inventoryItem);
        setInventoryItems((items) => [createdItem, ...items]);
        setSelectedItemId(createdItem.id);
      }

      refreshInventory();
      closeForm();
    } catch (error) {
      console.warn('Error al guardar ingrediente:', error);
      Alert.alert(
        'No se pudo guardar',
        'Revisa la conexion con el backend e intenta nuevamente.',
      );
    }
  };

  const persistInventoryItem = async (itemToUpdate) => {
    const response = await inventoryService.updateInventoryItemById(
      itemToUpdate.inventoryId,
      toApiInventoryItem(itemToUpdate),
    );
    const updatedItem = normalizeInventoryItem(response.data.inventoryItem);
    setInventoryItems((items) =>
      items.map((item) => (item.id === updatedItem.id ? updatedItem : item)),
    );
    setSelectedItemId(updatedItem.id);
    refreshInventory();
  };

  const addLotToSelectedItem = async (lotForm, lotIdToUpdate = null) => {
    if (!selectedItem) {
      return false;
    }

    const brand = lotForm.brand.trim();
    const quantity = Number(lotForm.quantity || 0);

    if (!brand || !quantity || !lotForm.supplier) {
      Alert.alert(
        'Datos incompletos',
        'Agrega marca, cantidad y proveedor para el lote.',
      );
      return false;
    }

    if (lotForm.expiryApplies && !lotForm.expiryDate) {
      Alert.alert(
        'Caducidad requerida',
        'Selecciona la fecha de caducidad o indica que no aplica.',
      );
      return false;
    }

    const nextLot = {
      ...lotForm,
      cost: lotForm.cost || '0',
      expiryDate: lotForm.expiryApplies ? lotForm.expiryDate : '',
      id: lotIdToUpdate || `lot-${Date.now()}`,
      quality: normalizeQuality(lotForm.quality),
      quantity,
      taxRate: lotForm.taxApplies ? lotForm.taxRate : '',
      unit: normalizeUnit(lotForm.unit),
    };

    try {
      const nextLots = lotIdToUpdate
        ? selectedItem.lots.map((lot) =>
            lot.id === lotIdToUpdate ? nextLot : lot,
          )
        : [...selectedItem.lots, nextLot];

      await persistInventoryItem({
        ...selectedItem,
        lots: nextLots,
      });
      return nextLot;
    } catch (error) {
      console.warn('Error al guardar lote:', error);
      Alert.alert(
        'No se pudo guardar el lote',
        'Revisa la conexion con el backend e intenta nuevamente.',
      );
      return false;
    }
  };

  const removeLotFromSelectedItem = async (lotId) => {
    if (!selectedItem) {
      return;
    }

    try {
      await persistInventoryItem({
        ...selectedItem,
        lots: selectedItem.lots.filter((lot) => lot.id !== lotId),
      });
    } catch (error) {
      console.warn('Error al eliminar lote:', error);
      Alert.alert(
        'No se pudo eliminar el lote',
        'Revisa la conexion con el backend e intenta nuevamente.',
      );
    }
  };

  const requestDeleteConfirmation = (dialog) => {
    setDeleteDialog(dialog);
  };

  const closeDeleteDialog = () => {
    if (!deleteIsProcessing) {
      setDeleteDialog(null);
    }
  };

  const confirmDeleteDialog = async () => {
    if (!deleteDialog || deleteIsProcessing) {
      return;
    }

    setDeleteIsProcessing(true);

    try {
      await deleteDialog.onConfirm();
      setDeleteDialog(null);
    } finally {
      setDeleteIsProcessing(false);
    }
  };

  const confirmDeleteInventoryItem = (item) => {
    requestDeleteConfirmation({
      confirmLabel: 'Eliminar',
      message: `Se eliminara ${item.name} y todos sus lotes del inventario.`,
      onConfirm: async () => {
        try {
          await inventoryService.deleteInventoryItemById(item.inventoryId);
          setInventoryItems((items) =>
            items.filter((currentItem) => currentItem.id !== item.id),
          );
          setSelectedItemId(null);
          refreshInventory();
        } catch (error) {
          console.warn('Error al eliminar ingrediente:', error);
          Alert.alert(
            'No se pudo eliminar',
            'Revisa la conexion con el backend e intenta nuevamente.',
          );
        }
      },
      title: 'Eliminar ingrediente',
    });
  };

  return (
    <View
      style={[
        styles.mainContainer,
        { backgroundColor: colors.screenBackground },
      ]}
    >
      <View style={styles.headerContainer}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Inventario
        </Text>
        <TransactionMenuButton
          isOpen={menuIsVisible}
          onPress={() => {
            Keyboard.dismiss();
            setMenuIsVisible(true);
          }}
        />
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          onChangeText={setSearchText}
          placeholder="Buscar ingrediente..."
          placeholderTextColor={colors.textMuted}
          style={[
            styles.searchInput,
            {
              backgroundColor: colors.fieldBackground,
              borderColor: colors.border,
              color: colors.textPrimary,
            },
          ]}
          value={searchText}
        />
        {searchText.length > 0 && (
          <Pressable
            onPress={() => {
              Keyboard.dismiss();
              setSearchText('');
            }}
            style={[
              styles.clearButton,
              { backgroundColor: colors.surfaceMuted },
            ]}
          >
            <Text
              style={[styles.clearButtonText, { color: colors.textSecondary }]}
            >
              x
            </Text>
          </Pressable>
        )}
      </View>

      <FlatList
        contentContainerStyle={styles.inventoryList}
        data={filteredItems}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const summary = getIngredientSummary(item);

          return (
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => {
                Keyboard.dismiss();
                setSelectedItemId(item.id);
              }}
              style={[
                styles.inventoryCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View
                style={[
                  styles.ingredientInitials,
                  { backgroundColor: colors.primaryMuted },
                ]}
              >
                <Text
                  style={[
                    styles.ingredientInitialsText,
                    { color: colors.primaryText },
                  ]}
                >
                  {getInitials(item.name)}
                </Text>
              </View>
              <View style={styles.ingredientInfo}>
                <Text
                  style={[styles.ingredientName, { color: colors.textPrimary }]}
                >
                  {item.name}
                </Text>
                <Text
                  style={[styles.ingredientMeta, { color: colors.textMuted }]}
                >
                  {item.lots.length} marcas/lotes
                </Text>
              </View>
              <Text
                style={[
                  styles.inventoryQuantity,
                  { color: colors.textPrimary },
                ]}
              >
                {summary.totalText}
              </Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={[styles.emptyState, { borderColor: colors.border }]}>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              {isLoadingInventory ? 'Cargando inventario' : 'Sin ingredientes'}
            </Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {isLoadingInventory
                ? 'Estamos consultando la base de datos.'
                : 'Agrega un ingrediente o prueba con otro criterio de busqueda.'}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => {
          Keyboard.dismiss();
          openCreateForm();
        }}
        style={[styles.addButton, { backgroundColor: colors.primary }]}
      >
        <Text style={[styles.addButtonText, { color: colors.textInverse }]}>
          +
        </Text>
      </TouchableOpacity>

      <TransactionMenu
        isVisible={menuIsVisible}
        onClose={() => setMenuIsVisible(false)}
        onOpenStoreManager={handleOpenStoreManager}
      />

      {addStoreModalIsVisible && (
        <AddStoreModal
          AddStoreModalIsVisible={addStoreModalIsVisible}
          onStoresChanged={() =>
            setStoreRefreshKey((currentKey) => currentKey + 1)
          }
          setAddStoreModalIsVisible={setAddStoreModalIsVisible}
        />
      )}

      <InventoryDetailModal
        colors={colors}
        inventoryItems={inventoryItems}
        item={selectedItem}
        onAddLot={addLotToSelectedItem}
        onClose={() => {
          setSelectedItemId(null);
        }}
        onDeleteItem={confirmDeleteInventoryItem}
        onDeleteLot={(lotId) => {
          const lot = selectedItem?.lots.find(
            (currentLot) => currentLot.id === lotId,
          );

          requestDeleteConfirmation({
            confirmLabel: 'Eliminar lote',
            message: `Se eliminara el lote "${lot?.brand || 'sin marca'}" de ${selectedItem?.name}.`,
            onConfirm: () => removeLotFromSelectedItem(lotId),
            title: 'Eliminar lote',
          });
        }}
        onEditItem={openEditForm}
        onOpenStoreManager={handleOpenStoreManager}
        storeRefreshKey={storeRefreshKey}
      />

      <InventoryFormModal
        colors={colors}
        form={inventoryForm}
        isVisible={formIsVisible}
        onChange={setInventoryForm}
        onClose={closeForm}
        onSave={saveInventoryItem}
        title={editingItemId ? 'Editar ingrediente' : 'Nuevo ingrediente'}
      />
      <Modal
        animationType="fade"
        onRequestClose={closeDeleteDialog}
        transparent
        visible={Boolean(deleteDialog)}
      >
        <View style={styles.deleteModalRoot}>
          <Pressable
            onPress={closeDeleteDialog}
            style={[
              styles.deleteModalBackdrop,
              { backgroundColor: colors.backdrop },
            ]}
          />
          <View
            style={[
              styles.deleteModalCard,
              {
                backgroundColor: colors.screenBackground,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={[styles.deleteModalTitle, { color: colors.textPrimary }]}
            >
              {deleteDialog?.title}
            </Text>
            <Text
              style={[styles.deleteModalMessage, { color: colors.textMuted }]}
            >
              {deleteDialog?.message}
            </Text>
            <Text
              style={[styles.deleteModalMessage, { color: colors.textMuted }]}
            >
              ¿Estas seguro de eliminar?
            </Text>
            <View style={styles.deleteModalActions}>
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={deleteIsProcessing}
                onPress={closeDeleteDialog}
                style={[
                  styles.secondaryButton,
                  styles.deleteModalButton,
                  { borderColor: colors.border },
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.secondaryButtonText,
                    { color: colors.textPrimary },
                  ]}
                >
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={deleteIsProcessing}
                onPress={confirmDeleteDialog}
                style={[
                  styles.primaryButton,
                  styles.deleteModalButton,
                  {
                    backgroundColor: deleteIsProcessing
                      ? colors.surfaceMuted
                      : colors.danger,
                  },
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.primaryButtonText,
                    {
                      color: deleteIsProcessing
                        ? colors.inactiveText
                        : colors.textInverse,
                    },
                  ]}
                >
                  {deleteIsProcessing
                    ? 'Eliminando…'
                    : deleteDialog?.confirmLabel || 'Eliminar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const InventoryDetailModal = ({
  colors,
  inventoryItems,
  item,
  onAddLot,
  onClose,
  onDeleteItem,
  onDeleteLot,
  onEditItem,
  onOpenStoreManager,
  storeRefreshKey,
}) => {
  const [lotForm, setLotForm] = useState(emptyLotForm);
  const detailScrollRef = useRef(null);
  const lotFormY = useRef(0);
  const lotFormTitleY = useRef(0);
  const lotFormScrollTimer = useRef(null);
  const [stores, setStores] = useState([]);
  const [storesHaveLoaded, setStoresHaveLoaded] = useState(false);
  const [storesAreLoading, setStoresAreLoading] = useState(false);
  const [unitPickerIsVisible, setUnitPickerIsVisible] = useState(false);
  const [storePickerIsVisible, setStorePickerIsVisible] = useState(false);
  const [datePickerIsVisible, setDatePickerIsVisible] = useState(false);
  const [editingLotId, setEditingLotId] = useState(null);
  const [isSavingLot, setIsSavingLot] = useState(false);
  const [focusedLotField, setFocusedLotField] = useState(null);
  const [feedbackLotId, setFeedbackLotId] = useState(null);
  const [lotFeedbackMessage, setLotFeedbackMessage] = useState('');
  const lotCardPositions = useRef({});
  const feedbackAnimationId = useRef(0);
  const isSavingLotRef = useRef(false);
  const updateFeedbackOpacity = useRef(new Animated.Value(0)).current;
  const isVisible = Boolean(item);
  const detailSheet = useBottomSheet(isVisible, onClose);
  const lotCreationIsActive =
    !editingLotId && (Boolean(focusedLotField) || hasLotFormChanges(lotForm));
  const lotFormIsValid = Boolean(
    lotForm.brand.trim() &&
    Number(lotForm.quantity || 0) &&
    lotForm.supplier &&
    (!lotForm.expiryApplies || lotForm.expiryDate),
  );

  useEffect(() => {
    if (isVisible) {
      setLotForm(emptyLotForm);
      setUnitPickerIsVisible(false);
      setStorePickerIsVisible(false);
      setDatePickerIsVisible(false);
      setEditingLotId(null);
      isSavingLotRef.current = false;
      setIsSavingLot(false);
      setFocusedLotField(null);
      setFeedbackLotId(null);
      setLotFeedbackMessage('');
      feedbackAnimationId.current += 1;
      updateFeedbackOpacity.setValue(0);
      lotCardPositions.current = {};
    }
  }, [isVisible, updateFeedbackOpacity]);

  useEffect(
    () => () => {
      updateFeedbackOpacity.stopAnimation();
      if (lotFormScrollTimer.current) {
        clearTimeout(lotFormScrollTimer.current);
      }
    },
    [updateFeedbackOpacity],
  );

  const loadStores = useCallback(async () => {
    setStoresAreLoading(true);

    try {
      setStores(await storeService.getAllStores());
    } catch (error) {
      console.warn('Error al cargar tiendas para inventario:', error);
    } finally {
      setStoresHaveLoaded(true);
      setStoresAreLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isVisible || storesHaveLoaded || storesAreLoading) {
      return;
    }

    loadStores();
  }, [isVisible, loadStores, storesAreLoading, storesHaveLoaded]);

  useEffect(() => {
    if (!isVisible || storeRefreshKey === 0) {
      return;
    }

    loadStores();
  }, [isVisible, loadStores, storeRefreshKey]);

  useEffect(() => {
    if (!storesHaveLoaded || storesAreLoading || !lotForm.supplierId) {
      return;
    }

    const selectedStore = stores.find(
      (store) => Number(store.storeId) === Number(lotForm.supplierId),
    );

    if (!selectedStore) {
      setLotForm((current) =>
        current.supplierId === lotForm.supplierId
          ? {
              ...current,
              supplier: '',
              supplierId: null,
            }
          : current,
      );
      return;
    }

    const nextSupplier =
      getStoreValue(selectedStore, 'Alias') ||
      getStoreValue(selectedStore, 'Name');

    if (nextSupplier && nextSupplier !== lotForm.supplier) {
      setLotForm((current) =>
        current.supplierId === lotForm.supplierId
          ? {
              ...current,
              supplier: nextSupplier,
            }
          : current,
      );
    }
  }, [
    lotForm.supplier,
    lotForm.supplierId,
    stores,
    storesAreLoading,
    storesHaveLoaded,
  ]);

  const showLotFeedback = (lotId, message) => {
    const animationId = feedbackAnimationId.current + 1;
    feedbackAnimationId.current = animationId;
    setFeedbackLotId(lotId);
    setLotFeedbackMessage(message);
    updateFeedbackOpacity.stopAnimation();
    updateFeedbackOpacity.setValue(1);

    const scrollToLot = () => {
      detailScrollRef.current?.scrollTo({
        animated: true,
        y: Math.max((lotCardPositions.current[lotId] || 0) - 10, 0),
      });
    };

    requestAnimationFrame(scrollToLot);
    setTimeout(scrollToLot, 120);
    setTimeout(scrollToLot, 280);

    Animated.sequence([
      Animated.delay(650),
      Animated.timing(updateFeedbackOpacity, {
        duration: 420,
        toValue: 0,
        useNativeDriver: false,
      }),
    ]).start(() => {
      if (feedbackAnimationId.current !== animationId) {
        return;
      }

      setFeedbackLotId((currentLotId) =>
        currentLotId === lotId ? null : currentLotId,
      );
      setLotFeedbackMessage('');
    });
  };

  const handleAddLot = async () => {
    if (isSavingLotRef.current || !lotFormIsValid) {
      return;
    }

    isSavingLotRef.current = true;
    setIsSavingLot(true);
    const lotIdBeingUpdated = editingLotId;
    const savedLot = await onAddLot(lotForm, editingLotId);

    if (savedLot) {
      setLotForm(emptyLotForm);
      setEditingLotId(null);
      setFocusedLotField(null);

      if (lotIdBeingUpdated) {
        showLotFeedback(lotIdBeingUpdated, 'Lote actualizado');
      } else {
        showLotFeedback(savedLot.id, 'Lote agregado');
      }
    }

    isSavingLotRef.current = false;
    setIsSavingLot(false);
  };

  const cancelLotEdition = () => {
    const lotIdBeingEdited = editingLotId;
    setEditingLotId(null);
    setLotForm(emptyLotForm);
    setFocusedLotField(null);

    if (lotIdBeingEdited) {
      showLotFeedback(lotIdBeingEdited, 'Edicion cancelada');
    }
  };

  const cancelLotCreation = () => {
    Keyboard.dismiss();
    setLotForm(emptyLotForm);
    setFocusedLotField(null);
    setDatePickerIsVisible(false);
  };

  const handleDetailRequestClose = () => {
    if (editingLotId) {
      cancelLotEdition();
      return;
    }

    if (lotCreationIsActive) {
      cancelLotCreation();
      return;
    }

    detailSheet.closeBottomSheet();
  };

  const duplicateLot = async (lot) => {
    setEditingLotId(null);
    const duplicatedLot = await onAddLot({
      ...emptyLotForm,
      ...lot,
      cost: String(lot.cost || '').replace('$', ''),
      expiryApplies: Boolean(lot.expiryDate),
      id: undefined,
      quantity: `${lot.quantity || ''}`,
      taxRate: `${lot.taxRate || ''}`,
    });

    if (duplicatedLot) {
      setLotForm(emptyLotForm);
      showLotFeedback(duplicatedLot.id, 'Lote agregado');
    }
  };

  const editLot = (lot) => {
    feedbackAnimationId.current += 1;
    setFeedbackLotId(null);
    setLotFeedbackMessage('');
    updateFeedbackOpacity.stopAnimation();
    updateFeedbackOpacity.setValue(0);
    setEditingLotId(lot.id);
    setLotForm({
      ...emptyLotForm,
      ...lot,
      cost: String(lot.cost || '').replace('$', ''),
      expiryApplies: Boolean(lot.expiryDate),
      quantity: `${lot.quantity || ''}`,
      taxRate: `${lot.taxRate || ''}`,
    });
    requestAnimationFrame(() => {
      detailScrollRef.current?.scrollTo({
        animated: true,
        y: Math.max(lotFormY.current - 12, 0),
      });
    });
  };

  if (!item) {
    return null;
  }

  const summary = getIngredientSummary(item);

  const scrollToLotFormStart = () => {
    const scrollToTitle = (animated = true) => {
      detailScrollRef.current?.scrollTo({
        animated,
        y: Math.max(lotFormTitleY.current - 8, 0),
      });
    };

    if (lotFormScrollTimer.current) {
      clearTimeout(lotFormScrollTimer.current);
    }

    requestAnimationFrame(() => {
      scrollToTitle(true);
    });

    lotFormScrollTimer.current = setTimeout(() => {
      scrollToTitle(true);
    }, 260);
  };

  const renderLotsSection = () => (
    <>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        Marcas y lotes
      </Text>
      {item.lots.length === 0 && (
        <View style={[styles.lotEmptyState, { borderColor: colors.border }]}>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
            Sin inventario
          </Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Este ingrediente aun no tiene lotes registrados.
          </Text>
        </View>
      )}
      {item.lots.map((lot) => {
        const daysUntilExpiry = getDaysUntilExpiry(lot.expiryDate);
        const isExpired = daysUntilExpiry !== null && daysUntilExpiry <= 0;
        const isEditingLot = editingLotId === lot.id;
        const hasFeedback = feedbackLotId === lot.id;
        const lotCostText = `$${Number(
          String(lot.cost || '0').replace(/[^0-9.]/g, '') || 0,
        ).toFixed(2)}`;

        return (
          <TouchableOpacity
            activeOpacity={0.82}
            key={lot.id}
            onLayout={(event) => {
              lotCardPositions.current[lot.id] = event.nativeEvent.layout.y;
            }}
            onPress={() => {
              if (!isEditingLot) {
                editLot(lot);
              }
            }}
            style={[
              styles.lotCard,
              {
                backgroundColor: isExpired
                  ? colors.dangerSurface
                  : colors.surface,
                borderColor: isEditingLot ? colors.primary : colors.border,
              },
              isEditingLot && styles.lotCardEditing,
            ]}
          >
            {hasFeedback && (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.lotFeedbackBorder,
                  {
                    borderColor: colors.primary,
                    opacity: updateFeedbackOpacity,
                  },
                ]}
              />
            )}
            <View style={styles.lotHeader}>
              <View style={styles.lotInfo}>
                <Text style={[styles.lotBrand, { color: colors.textPrimary }]}>
                  {lot.brand}
                </Text>
                <Text style={[styles.lotMeta, { color: colors.textMuted }]}>
                  {lot.quantity} {lot.unit}
                </Text>
              </View>
              <Text style={[styles.lotCost, { color: colors.textPrimary }]}>
                {lotCostText}
              </Text>
            </View>
            <View style={styles.lotDetails}>
              <InfoBlock
                colors={colors}
                label="Caducidad"
                style={styles.lotDetailBlock}
                value={`${formatDate(lot.expiryDate)}${
                  daysUntilExpiry === null
                    ? ''
                    : `\n${isExpired ? 'Caducado' : `${daysUntilExpiry} dias`}`
                }`}
              />
              <InfoBlock
                colors={colors}
                label="Proveedor"
                style={styles.lotDetailBlock}
                value={lot.supplier || 'Sin proveedor'}
              />
              <InfoBlock
                colors={colors}
                label="Calidad"
                style={styles.lotDetailBlock}
                value={`${lot.quality}`}
              />
            </View>
            {isEditingLot ? (
              <View
                style={[
                  styles.editingIndicator,
                  { backgroundColor: colors.primaryMuted },
                ]}
              >
                <Text
                  style={[
                    styles.editingIndicatorText,
                    { color: colors.primaryText },
                  ]}
                >
                  Actualmente en edicion
                </Text>
              </View>
            ) : hasFeedback ? (
              <Animated.View
                style={[
                  styles.successIndicator,
                  { backgroundColor: colors.primaryMuted },
                  { opacity: updateFeedbackOpacity },
                ]}
              >
                <Text
                  style={[
                    styles.successIndicatorText,
                    { color: colors.primaryText },
                  ]}
                >
                  {lotFeedbackMessage}
                </Text>
              </Animated.View>
            ) : (
              <View style={styles.lotActionRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={(event) => {
                    event.stopPropagation();
                    duplicateLot(lot);
                  }}
                  style={[
                    styles.inlineActionButton,
                    { borderColor: colors.border },
                  ]}
                >
                  <Text
                    style={[
                      styles.secondaryButtonText,
                      { color: colors.textPrimary },
                    ]}
                  >
                    Duplicar
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={(event) => {
                    event.stopPropagation();
                    onDeleteLot(lot.id);
                  }}
                  style={[
                    styles.inlineActionButton,
                    { borderColor: colors.danger },
                  ]}
                >
                  <Text
                    style={[styles.dangerButtonText, { color: colors.danger }]}
                  >
                    Eliminar
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </>
  );

  return (
    <Modal
      animationType="none"
      onRequestClose={handleDetailRequestClose}
      transparent
      visible={isVisible}
    >
      <View style={styles.sheetRoot}>
        <Animated.View
          style={[
            styles.backdrop,
            { backgroundColor: colors.backdrop },
            detailSheet.backdropStyle,
          ]}
        >
          <Pressable
            onPress={() => {
              Keyboard.dismiss();
              detailSheet.closeBottomSheet();
            }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.detailSheet,
            { backgroundColor: colors.screenBackground },
            detailSheet.sheetStyle,
          ]}
          {...detailSheet.sheetPanHandlers}
        >
          <View
            style={styles.dragHandleArea}
            {...detailSheet.handlePanHandlers}
          >
            <View
              style={[styles.dragHandle, { backgroundColor: colors.border }]}
            />
          </View>
          <View style={styles.detailHeader}>
            <View
              style={[
                styles.ingredientInitials,
                { backgroundColor: colors.primaryMuted },
              ]}
            >
              <Text
                style={[
                  styles.ingredientInitialsText,
                  { color: colors.primaryText },
                ]}
              >
                {getInitials(item.name)}
              </Text>
            </View>
            <View style={styles.detailHeaderText}>
              <View style={styles.detailTitleRow}>
                <Text
                  numberOfLines={1}
                  style={[styles.detailTitle, { color: colors.textPrimary }]}
                >
                  {item.name}
                </Text>
                <TouchableOpacity
                  accessibilityLabel="Editar ingrediente"
                  activeOpacity={0.75}
                  onPress={() => {
                    Keyboard.dismiss();
                    onEditItem(item);
                  }}
                  style={[
                    styles.editIngredientIconButton,
                    {
                      backgroundColor: colors.fieldBackground,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Edit3Icon color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text
                style={[styles.detailSubtitle, { color: colors.textMuted }]}
              >
                {item.category || 'Sin categoria'} ·{' '}
                {item.storage || 'Sin ubicacion'}
              </Text>
            </View>
          </View>

          <ScrollView
            ref={detailScrollRef}
            contentContainerStyle={styles.detailContent}
            onScroll={detailSheet.onScroll}
            keyboardShouldPersistTaps="handled"
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={[
                styles.summaryPanel,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <InfoBlock
                colors={colors}
                label="Total"
                value={summary.totalText}
              />
              <InfoBlock
                colors={colors}
                label="Marcas y lotes"
                value={`${item.lots.length}`}
              />
              <InfoBlock
                colors={colors}
                label="Caduca pronto"
                value={formatDate(summary.nextExpiry?.expiryDate)}
              />
            </View>

            {renderLotsSection()}

            <Text
              onLayout={(event) => {
                lotFormTitleY.current = event.nativeEvent.layout.y;
              }}
              style={[styles.sectionTitle, { color: colors.textPrimary }]}
            >
              {editingLotId ? 'Editar lote' : 'Agregar lote'}
            </Text>
            <View
              onLayout={(event) => {
                lotFormY.current = event.nativeEvent.layout.y;
              }}
              style={[
                styles.formPanel,
                {
                  backgroundColor: colors.surface,
                  borderColor: editingLotId ? colors.primary : colors.border,
                },
                editingLotId && styles.formPanelEditing,
              ]}
            >
              <BrandInput
                allInventoryItems={inventoryItems}
                colors={colors}
                isFocused={focusedLotField === 'brand'}
                onBlur={() => setFocusedLotField(null)}
                onFocus={() => {
                  setFocusedLotField('brand');
                  scrollToLotFormStart();
                }}
                onChangeText={(value) =>
                  setLotForm((current) => ({ ...current, brand: value }))
                }
                value={lotForm.brand}
              />
              <View style={styles.formRow}>
                <FormInput
                  colors={colors}
                  isFocused={focusedLotField === 'quantity'}
                  keyboardType="numeric"
                  label="Cantidad"
                  onBlur={() => setFocusedLotField(null)}
                  onFocus={() => {
                    setFocusedLotField('quantity');
                    scrollToLotFormStart();
                  }}
                  onChangeText={(value) =>
                    setLotForm((current) => ({ ...current, quantity: value }))
                  }
                  value={lotForm.quantity}
                />
                <UnitSelector
                  colors={colors}
                  isFocused={focusedLotField === 'unit'}
                  onPress={() => {
                    Keyboard.dismiss();
                    setFocusedLotField('unit');
                    setUnitPickerIsVisible(true);
                  }}
                  value={lotForm.unit}
                />
              </View>
              <View style={styles.formRow}>
                <FormInput
                  colors={colors}
                  isFocused={focusedLotField === 'cost'}
                  keyboardType="decimal-pad"
                  label="Costo"
                  onBlur={() => {
                    setFocusedLotField(null);
                    setLotForm((current) => ({
                      ...current,
                      cost: formatCurrencyInput(current.cost),
                    }));
                  }}
                  onChangeText={(value) =>
                    setLotForm((current) => ({ ...current, cost: value }))
                  }
                  onFocus={() => {
                    setFocusedLotField('cost');
                    scrollToLotFormStart();
                  }}
                  prefix="MXN"
                  value={lotForm.cost}
                />
                <QualitySelector
                  colors={colors}
                  isFocused={focusedLotField === 'quality'}
                  value={lotForm.quality}
                  onChange={(quality) =>
                    setLotForm((current) => ({ ...current, quality }))
                  }
                />
              </View>
              <View style={styles.formRow}>
                <ExpirySelector
                  colors={colors}
                  datePickerIsVisible={datePickerIsVisible}
                  expiryApplies={lotForm.expiryApplies}
                  expiryDate={lotForm.expiryDate}
                  isFocused={focusedLotField === 'expiry'}
                  onApplyChange={(expiryApplies) => {
                    Keyboard.dismiss();
                    setFocusedLotField('expiry');
                    if (!expiryApplies) {
                      setDatePickerIsVisible(false);
                      setLotForm((current) => ({
                        ...current,
                        expiryApplies: false,
                        expiryDate: '',
                      }));
                      return;
                    }

                    setLotForm((current) => ({
                      ...current,
                      expiryApplies: true,
                    }));
                    setDatePickerIsVisible(true);
                  }}
                  onConfirm={(date) => {
                    setLotForm((current) => ({
                      ...current,
                      expiryApplies: true,
                      expiryDate: formatDateForApi(date),
                    }));
                    setDatePickerIsVisible(false);
                  }}
                  onHidePicker={() => setDatePickerIsVisible(false)}
                  onShowPicker={() => {
                    Keyboard.dismiss();
                    setFocusedLotField('expiry');
                    setLotForm((current) => ({
                      ...current,
                      expiryApplies: true,
                    }));
                    setDatePickerIsVisible(true);
                  }}
                />
                <TaxSelector
                  colors={colors}
                  applies={lotForm.taxApplies}
                  isFocused={focusedLotField === 'tax'}
                  onChange={(taxApplies) => {
                    setFocusedLotField('tax');
                    setLotForm((current) => ({
                      ...current,
                      taxApplies,
                      taxRate: taxApplies ? current.taxRate : '',
                    }));
                  }}
                  onRateChange={(taxRate) =>
                    setLotForm((current) => ({ ...current, taxRate }))
                  }
                  onRateBlur={() => {
                    setFocusedLotField(null);
                    setLotForm((current) => ({
                      ...current,
                      taxRate: formatPercentageInput(current.taxRate),
                    }));
                  }}
                  onRateFocus={() => {
                    setFocusedLotField('tax');
                    scrollToLotFormStart();
                  }}
                  rate={lotForm.taxRate}
                />
              </View>
              <StoreSelector
                colors={colors}
                isFocused={focusedLotField === 'supplier'}
                onPress={() => {
                  Keyboard.dismiss();
                  setFocusedLotField('supplier');
                  setStorePickerIsVisible(true);
                }}
                value={lotForm.supplier}
              />
              <View style={styles.lotFormActions}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={isSavingLot || !lotFormIsValid}
                  onPress={() => {
                    Keyboard.dismiss();
                    handleAddLot();
                  }}
                  style={[
                    styles.primaryButton,
                    {
                      backgroundColor:
                        isSavingLot || !lotFormIsValid
                          ? colors.surfaceMuted
                          : colors.primary,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.primaryButtonText,
                      {
                        color:
                          isSavingLot || !lotFormIsValid
                            ? colors.inactiveText
                            : colors.textInverse,
                      },
                    ]}
                  >
                    {isSavingLot
                      ? 'Guardando...'
                      : editingLotId
                        ? 'Actualizar lote'
                        : 'Guardar lote'}
                  </Text>
                </TouchableOpacity>
                {editingLotId ? (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      Keyboard.dismiss();
                      cancelLotEdition();
                    }}
                    style={[
                      styles.secondaryButton,
                      { borderColor: colors.border },
                    ]}
                  >
                    <Text
                      style={[
                        styles.secondaryButtonText,
                        { color: colors.textPrimary },
                      ]}
                    >
                      Cancelar edicion
                    </Text>
                  </TouchableOpacity>
                ) : lotCreationIsActive ? (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={cancelLotCreation}
                    style={[
                      styles.secondaryButton,
                      { borderColor: colors.border },
                    ]}
                  >
                    <Text
                      style={[
                        styles.secondaryButtonText,
                        { color: colors.textPrimary },
                      ]}
                    >
                      Cancelar
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                Keyboard.dismiss();
                onDeleteItem(item);
              }}
              style={[
                styles.deleteIngredientButton,
                { borderColor: colors.danger },
              ]}
            >
              <Text style={[styles.dangerButtonText, { color: colors.danger }]}>
                Eliminar ingrediente
              </Text>
            </TouchableOpacity>
          </ScrollView>
          <UnitPickerModal
            colors={colors}
            isVisible={unitPickerIsVisible}
            onClose={() => setUnitPickerIsVisible(false)}
            onSelect={(unit) => {
              Keyboard.dismiss();
              setLotForm((current) => ({ ...current, unit }));
              setUnitPickerIsVisible(false);
            }}
            selectedUnit={lotForm.unit}
          />
          <StorePickerModal
            colors={colors}
            isLoading={storesAreLoading}
            isVisible={storePickerIsVisible}
            onClose={() => setStorePickerIsVisible(false)}
            onOpenStoreManager={() => {
              Keyboard.dismiss();
              setStorePickerIsVisible(false);
              setTimeout(() => {
                onOpenStoreManager?.();
              }, 120);
            }}
            onSelect={(store) => {
              Keyboard.dismiss();
              setLotForm((current) => ({
                ...current,
                supplier:
                  getStoreValue(store, 'Alias') || getStoreValue(store, 'Name'),
                supplierId: Number(store.storeId),
              }));
              setStorePickerIsVisible(false);
            }}
            selectedStoreId={lotForm.supplierId}
            stores={stores}
          />
        </Animated.View>
      </View>
    </Modal>
  );
};

const UnitSelector = ({ colors, isFocused, onPress, value }) => (
  <View style={styles.formField}>
    <Text style={[styles.formLabel, { color: colors.textMuted }]}>Unidad</Text>
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={[
        styles.selectBox,
        styles.unitSelectBox,
        {
          backgroundColor: colors.fieldBackground,
          borderColor: isFocused ? colors.primary : colors.border,
        },
      ]}
    >
      <Text style={[styles.unitSelectValue, { color: colors.textPrimary }]}>
        {value}
      </Text>
      <Text
        numberOfLines={1}
        style={[styles.unitSelectDescription, { color: colors.textMuted }]}
      >
        {getIngredientUnitLabel(value)}
      </Text>
    </TouchableOpacity>
  </View>
);

const StoreSelector = ({ colors, isFocused, onPress, value }) => (
  <View style={styles.formField}>
    <Text style={[styles.formLabel, { color: colors.textMuted }]}>
      Proveedor
    </Text>
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={[
        styles.selectBox,
        {
          backgroundColor: colors.fieldBackground,
          borderColor: isFocused ? colors.primary : colors.border,
        },
      ]}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.selectValue,
          { color: value ? colors.textPrimary : colors.textMuted },
        ]}
      >
        {value || 'Seleccionar tienda registrada'}
      </Text>
    </TouchableOpacity>
  </View>
);

const BrandInput = ({
  allInventoryItems,
  colors,
  isFocused,
  onBlur,
  onChangeText,
  onFocus,
  value,
}) => {
  const normalizedValue = value.trim().toLowerCase();
  const brandSuggestions = Array.from(
    new Map(
      (allInventoryItems || [])
        .flatMap((inventoryItem) => inventoryItem.lots || [])
        .map((lot) => lot.brand?.trim())
        .filter(Boolean)
        .map((brand) => [brand.toLowerCase(), brand]),
    ).values(),
  )
    .filter((brand) => {
      const normalizedBrand = brand.toLowerCase();

      return (
        normalizedValue.length > 0 &&
        normalizedBrand.includes(normalizedValue) &&
        normalizedBrand !== normalizedValue
      );
    })
    .slice(0, 4);

  return (
    <View style={styles.formFieldFull}>
      <Text style={[styles.formLabel, { color: colors.textMuted }]}>
        Marca del producto
      </Text>
      <TextInput
        onChangeText={onChangeText}
        onBlur={onBlur}
        onFocus={onFocus}
        placeholder="Ej. Alpura, Great Value o sin marca"
        placeholderTextColor={colors.textMuted}
        style={[
          styles.standaloneFormInput,
          {
            backgroundColor: colors.fieldBackground,
            borderColor: isFocused ? colors.primary : colors.border,
            color: colors.textPrimary,
          },
        ]}
        value={value}
      />
      {brandSuggestions.length > 0 && (
        <View style={styles.brandSuggestions}>
          {brandSuggestions.map((brand) => (
            <TouchableOpacity
              activeOpacity={0.75}
              key={brand}
              onPress={() => {
                Keyboard.dismiss();
                onChangeText(brand);
              }}
              style={[
                styles.brandSuggestionChip,
                {
                  backgroundColor: colors.surfaceMuted,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.brandSuggestionText,
                  { color: colors.textSecondary },
                ]}
              >
                {brand}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const QualitySelector = ({ colors, isFocused, onChange, value }) => (
  <View style={styles.formField}>
    <Text style={[styles.formLabel, { color: colors.textMuted }]}>Calidad</Text>
    <View
      style={[
        styles.qualityDotBar,
        {
          backgroundColor: colors.fieldBackground,
          borderColor: isFocused ? colors.primary : colors.border,
        },
      ]}
    >
      {[1, 2, 3, 4, 5].map((quality) => {
        const isActive = quality <= Number(value);
        const isSelected = quality === Number(value);

        return (
          <TouchableOpacity
            activeOpacity={0.75}
            key={quality}
            onPress={() => {
              Keyboard.dismiss();
              onChange(quality);
            }}
            style={styles.qualityDotButton}
          >
            <View
              style={[
                styles.qualityDot,
                {
                  backgroundColor: isActive ? colors.primary : colors.border,
                  transform: [{ scale: isSelected ? 1.18 : 1 }],
                },
              ]}
            />
          </TouchableOpacity>
        );
      })}
      <Text style={[styles.qualityDotValue, { color: colors.textPrimary }]}>
        {value}
      </Text>
    </View>
  </View>
);

const ExpirySelector = ({
  colors,
  datePickerIsVisible,
  expiryApplies,
  expiryDate,
  isFocused,
  onApplyChange,
  onConfirm,
  onHidePicker,
  onShowPicker,
}) => (
  <View style={styles.formField}>
    <Text style={[styles.formLabel, { color: colors.textMuted }]}>
      Caducidad
    </Text>
    <View
      style={[
        styles.taxSelector,
        {
          backgroundColor: colors.fieldBackground,
          borderColor: isFocused ? colors.primary : colors.border,
        },
      ]}
    >
      {[
        { label: 'No', value: false },
        { label: 'Si', value: true },
      ].map((option) => {
        const isSelected = expiryApplies === option.value;

        return (
          <TouchableOpacity
            activeOpacity={0.75}
            key={option.label}
            onPress={() => {
              Keyboard.dismiss();
              onApplyChange(option.value);
            }}
            style={[
              styles.taxOption,
              {
                backgroundColor: isSelected
                  ? colors.primaryMuted
                  : 'transparent',
              },
            ]}
          >
            <Text
              style={[
                styles.taxOptionText,
                {
                  color: isSelected ? colors.primaryText : colors.textSecondary,
                },
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
    {expiryApplies && (
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={onShowPicker}
        style={[
          styles.dateApplyField,
          {
            backgroundColor: colors.fieldBackground,
            borderColor: isFocused ? colors.primary : colors.border,
          },
        ]}
      >
        <Text
          style={[
            styles.dateApplyValue,
            { color: expiryDate ? colors.textPrimary : colors.textMuted },
          ]}
        >
          {expiryDate
            ? inventoryDateToSelected(expiryDate)
            : 'Seleccionar fecha'}
        </Text>
      </TouchableOpacity>
    )}
    <DatePickerComponent
      handleConfirm={onConfirm}
      hideDatePicker={onHidePicker}
      inputStyle={[
        styles.hiddenDatePickerInput,
        {
          backgroundColor: colors.fieldBackground,
          borderColor: colors.border,
          color: colors.textPrimary,
        },
      ]}
      isDatePickerVisible={datePickerIsVisible}
      label=""
      labelStyle={styles.hiddenDatePickerLabel}
      selectedDate={inventoryDateToSelected(expiryDate)}
      showDatePicker={onShowPicker}
      useCustomFieldStyle={true}
    />
  </View>
);

const TaxSelector = ({
  applies,
  colors,
  isFocused,
  onChange,
  onRateBlur,
  onRateChange,
  onRateFocus,
  rate,
}) => (
  <View style={styles.formField}>
    <Text style={[styles.formLabel, { color: colors.textMuted }]}>IVA</Text>
    <View
      style={[
        styles.taxSelector,
        {
          backgroundColor: colors.fieldBackground,
          borderColor: isFocused ? colors.primary : colors.border,
        },
      ]}
    >
      {[
        { label: 'No', value: false },
        { label: 'Si', value: true },
      ].map((option) => {
        const isSelected = applies === option.value;

        return (
          <TouchableOpacity
            activeOpacity={0.75}
            key={option.label}
            onPress={() => {
              Keyboard.dismiss();
              onChange(option.value);
            }}
            style={[
              styles.taxOption,
              {
                backgroundColor: isSelected
                  ? colors.primaryMuted
                  : 'transparent',
              },
            ]}
          >
            <Text
              style={[
                styles.taxOptionText,
                {
                  color: isSelected ? colors.primaryText : colors.textSecondary,
                },
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
    {applies && (
      <TextInput
        keyboardType="decimal-pad"
        onBlur={onRateBlur}
        onChangeText={onRateChange}
        onFocus={onRateFocus}
        placeholder="Porcentaje"
        placeholderTextColor={colors.textMuted}
        style={[
          styles.taxRateInput,
          {
            backgroundColor: colors.fieldBackground,
            borderColor: isFocused ? colors.primary : colors.border,
            color: colors.textPrimary,
          },
        ]}
        value={rate}
      />
    )}
  </View>
);

const CenteredPickerShell = ({ children, colors, isVisible, onClose }) => {
  if (!isVisible) {
    return null;
  }

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={isVisible}
    >
      <View style={styles.centeredPickerOverlay}>
        <Pressable
          onPress={onClose}
          style={[
            styles.centeredPickerBackdrop,
            { backgroundColor: colors.backdrop },
          ]}
        />
        <View
          style={[
            styles.centeredPickerCard,
            {
              backgroundColor: colors.screenBackground,
              borderColor: colors.border,
            },
          ]}
        >
          {children}
        </View>
      </View>
    </Modal>
  );
};

const UnitPickerModal = ({
  colors,
  isVisible,
  onClose,
  onSelect,
  selectedUnit,
}) => (
  <CenteredPickerShell colors={colors} isVisible={isVisible} onClose={onClose}>
    <Text style={[styles.pickerTitle, { color: colors.textPrimary }]}>
      Unidad de medida
    </Text>
    {ingredientUnits.map((unit) => {
      const isSelected = unit.key === selectedUnit;

      return (
        <TouchableOpacity
          activeOpacity={0.75}
          key={unit.key}
          onPress={() => {
            Keyboard.dismiss();
            onSelect(unit.key);
          }}
          style={[
            styles.pickerOptionRow,
            {
              backgroundColor: isSelected
                ? colors.primaryMuted
                : colors.surface,
              borderColor: isSelected ? colors.primary : colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.pickerOptionKey,
              { color: isSelected ? colors.primaryText : colors.textPrimary },
            ]}
          >
            {unit.key}
          </Text>
          <Text
            style={[
              styles.pickerOptionDescription,
              { color: colors.textSecondary },
            ]}
          >
            {unit.description}
          </Text>
        </TouchableOpacity>
      );
    })}
  </CenteredPickerShell>
);

const StorePickerModal = ({
  colors,
  isLoading,
  isVisible,
  onClose,
  onOpenStoreManager,
  onSelect,
  selectedStoreId,
  stores,
}) => {
  const [storeSearch, setStoreSearch] = useState('');
  const filteredStores = useMemo(() => {
    const normalizedSearch = storeSearch.trim().toLowerCase();

    if (!normalizedSearch) {
      return stores;
    }

    return stores.filter((store) => {
      const searchableText = [
        getStoreValue(store, 'Alias'),
        getStoreValue(store, 'Name'),
        getStoreValue(store, 'Address'),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [storeSearch, stores]);

  useEffect(() => {
    if (!isVisible) {
      setStoreSearch('');
    }
  }, [isVisible]);

  return (
    <CenteredPickerShell
      colors={colors}
      isVisible={isVisible}
      onClose={onClose}
    >
      <Text style={[styles.pickerTitle, { color: colors.textPrimary }]}>
        Seleccionar proveedor
      </Text>
      <TextInput
        onChangeText={setStoreSearch}
        placeholder="Buscar tienda..."
        placeholderTextColor={colors.textMuted}
        style={[
          styles.pickerSearchInput,
          {
            backgroundColor: colors.fieldBackground,
            borderColor: colors.border,
            color: colors.textPrimary,
          },
        ]}
        value={storeSearch}
      />
      {isLoading ? (
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          Cargando tiendas...
        </Text>
      ) : (
        <>
          {stores.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No hay tiendas registradas.
            </Text>
          ) : filteredStores.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No encontramos tiendas con ese criterio.
            </Text>
          ) : (
            <ScrollView
              contentContainerStyle={styles.storePickerList}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={true}
              style={styles.storePickerScroll}
            >
              {filteredStores.map((store) => {
                const storeAddress = getStoreValue(store, 'Address');
                const storeName = getStoreValue(store, 'Name');
                const storeAlias = getStoreValue(store, 'Alias');
                const storeId = Number(store.storeId);
                const isSelected = storeId === Number(selectedStoreId);

                return (
                  <TouchableOpacity
                    activeOpacity={0.75}
                    key={store.storeId || `${storeAlias}-${storeAddress}`}
                    onPress={() => {
                      Keyboard.dismiss();
                      setStoreSearch('');
                      onSelect(store);
                    }}
                    style={[
                      styles.storePickerOption,
                      {
                        backgroundColor: isSelected
                          ? colors.primaryMuted
                          : colors.surface,
                        borderColor: isSelected
                          ? colors.primary
                          : colors.border,
                      },
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.storePickerAlias,
                        {
                          color: isSelected
                            ? colors.primaryText
                            : colors.textPrimary,
                        },
                      ]}
                    >
                      {storeAlias || storeName}
                    </Text>
                    <Text
                      numberOfLines={2}
                      style={[
                        styles.storePickerAddress,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {storeAddress || 'Sin direccion registrada'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              Keyboard.dismiss();
              setStoreSearch('');
              onOpenStoreManager();
            }}
            style={[styles.storeManagerButton, { borderColor: colors.border }]}
          >
            <Text
              style={[
                styles.secondaryButtonText,
                { color: colors.textPrimary },
              ]}
            >
              Ir al administrador de tiendas
            </Text>
          </TouchableOpacity>
        </>
      )}
    </CenteredPickerShell>
  );
};

const InventoryFormModal = ({
  colors,
  form,
  isVisible,
  onChange,
  onClose,
  onSave,
  title,
}) => {
  const formSheet = useBottomSheet(isVisible, onClose);

  if (!isVisible) {
    return null;
  }

  const updateField = (field, value) => {
    onChange((current) => ({ ...current, [field]: value }));
  };

  return (
    <Modal
      animationType="none"
      onRequestClose={formSheet.closeBottomSheet}
      transparent
      visible={isVisible}
    >
      <View style={styles.sheetRoot}>
        <Animated.View
          style={[
            styles.backdrop,
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
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          pointerEvents="box-none"
          style={styles.sheetRoot}
        >
          <Animated.View
            style={[
              styles.inventoryFormSheet,
              { backgroundColor: colors.screenBackground },
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
            <Text
              style={[styles.formModalTitle, { color: colors.textPrimary }]}
            >
              {title}
            </Text>
            <ScrollView
              contentContainerStyle={styles.inventoryFormContent}
              keyboardShouldPersistTaps="handled"
              onScroll={formSheet.onScroll}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={false}
            >
              <FormInput
                colors={colors}
                label="Ingrediente"
                onChangeText={(value) => updateField('name', value)}
                value={form.name}
              />
              <View style={styles.formRow}>
                <FormInput
                  colors={colors}
                  label="Categoria"
                  onChangeText={(value) => updateField('category', value)}
                  value={form.category}
                />
                <FormInput
                  colors={colors}
                  label="Almacen"
                  onChangeText={(value) => updateField('storage', value)}
                  value={form.storage}
                />
              </View>
              <FormInput
                colors={colors}
                keyboardType="numeric"
                label="Stock minimo"
                onChangeText={(value) => updateField('minimumStock', value)}
                value={form.minimumStock}
              />
              <FormInput
                colors={colors}
                label="Notas"
                multiline
                onChangeText={(value) => updateField('notes', value)}
                value={form.notes}
              />
            </ScrollView>
            <View style={styles.formModalActions}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  Keyboard.dismiss();
                  formSheet.closeBottomSheet();
                }}
                style={[styles.secondaryButton, { borderColor: colors.border }]}
              >
                <Text
                  style={[
                    styles.secondaryButtonText,
                    { color: colors.textPrimary },
                  ]}
                >
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  Keyboard.dismiss();
                  onSave();
                }}
                style={[
                  styles.primaryButton,
                  styles.formModalPrimaryButton,
                  { backgroundColor: colors.primary },
                ]}
              >
                <Text style={styles.primaryButtonText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const FormInput = ({
  colors,
  isFocused,
  keyboardType,
  label,
  multiline,
  onBlur,
  onChangeText,
  onFocus,
  placeholder,
  prefix,
  value,
}) => (
  <View style={styles.formField}>
    <Text style={[styles.formLabel, { color: colors.textMuted }]}>{label}</Text>
    <View
      style={[
        styles.formInputFrame,
        multiline && styles.formInputMultiline,
        {
          backgroundColor: colors.fieldBackground,
          borderColor: isFocused ? colors.primary : colors.border,
        },
      ]}
    >
      {!!prefix && (
        <Text style={[styles.inputPrefix, { color: colors.textMuted }]}>
          {prefix}
        </Text>
      )}
      <TextInput
        keyboardType={keyboardType}
        multiline={multiline}
        onBlur={onBlur}
        onChangeText={onChangeText}
        onFocus={onFocus}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        style={[
          styles.formInput,
          prefix && styles.formInputWithPrefix,
          multiline && styles.formInputMultilineText,
          { color: colors.textPrimary },
        ]}
        value={value}
      />
    </View>
  </View>
);

const InfoBlock = ({ colors, label, style, value }) => (
  <View style={[styles.infoBlock, style]}>
    <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{label}</Text>
    <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
      {value}
    </Text>
  </View>
);

const Edit3Icon = ({ color }) => (
  <View style={styles.edit3Icon}>
    <View style={[styles.edit3Frame, { borderColor: color }]} />
    <View style={styles.edit3Pen}>
      <View style={[styles.edit3PenBody, { backgroundColor: color }]} />
      <View style={[styles.edit3PenTip, { borderLeftColor: color }]} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  addButton: {
    alignItems: 'center',
    borderRadius: 25,
    bottom: 24,
    height: 50,
    justifyContent: 'center',
    position: 'absolute',
    right: 24,
    width: 50,
  },
  addButtonText: {
    fontSize: typography.sizes.displayAmount,
    fontWeight: typography.weights.regular,
    lineHeight: 46,
  },
  backdrop: {
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
    right: 12,
    top: 12,
    width: 28,
  },
  clearButtonText: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    lineHeight: 20,
  },
  brandSuggestionChip: {
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: '100%',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  brandSuggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  brandSuggestionText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  centeredPickerBackdrop: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  centeredPickerCard: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    maxHeight: '88%',
    padding: 16,
    width: '84%',
  },
  centeredPickerOverlay: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  dangerButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  dangerButtonText: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
  },
  dateApplyField: {
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 38,
    paddingHorizontal: 12,
  },
  dateApplyValue: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
  },
  detailContent: {
    paddingBottom: 28,
  },
  detailHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 16,
  },
  detailHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  detailSheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: '94%',
    padding: 18,
    paddingTop: 0,
    width: '100%',
  },
  detailSubtitle: {
    fontSize: typography.sizes.caption,
    lineHeight: 17,
    marginTop: 4,
  },
  detailTitle: {
    flex: 1,
    fontSize: typography.sizes.bodyLarge,
    fontWeight: typography.weights.semibold,
  },
  detailTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    minWidth: 0,
  },
  deleteIngredientButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 18,
    minHeight: 46,
  },
  deleteModalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  deleteModalButton: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 8,
  },
  deleteModalBackdrop: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  deleteModalCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginHorizontal: 18,
    padding: 18,
    width: '90%',
  },
  deleteModalMessage: {
    fontSize: typography.sizes.label,
    lineHeight: 19,
    marginTop: 8,
  },
  deleteModalRoot: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  deleteModalTitle: {
    fontSize: typography.sizes.bodyLarge,
    fontWeight: typography.weights.bold,
  },
  editIngredientIconButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  edit3Frame: {
    borderRadius: 3,
    borderWidth: 1.8,
    bottom: 2,
    height: 12,
    left: 1,
    position: 'absolute',
    width: 12,
  },
  edit3Icon: {
    alignItems: 'center',
    height: 18,
    justifyContent: 'center',
    width: 18,
  },
  edit3Pen: {
    alignItems: 'center',
    flexDirection: 'row',
    height: 6,
    position: 'absolute',
    right: 0,
    top: 1,
    transform: [{ rotate: '-35deg' }],
  },
  edit3PenBody: {
    borderRadius: 2,
    height: 4,
    width: 13,
  },
  edit3PenTip: {
    borderBottomColor: 'transparent',
    borderBottomWidth: 3,
    borderLeftWidth: 5,
    borderTopColor: 'transparent',
    borderTopWidth: 3,
    marginLeft: 1,
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
  emptyText: {
    fontSize: typography.sizes.label,
    lineHeight: 19,
    marginTop: 4,
  },
  emptyTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  editingIndicator: {
    alignItems: 'center',
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 36,
    paddingHorizontal: 12,
  },
  editingIndicatorText: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
  },
  successIndicator: {
    alignItems: 'center',
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 36,
    paddingHorizontal: 12,
  },
  successIndicatorText: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
  },
  formField: {
    flex: 1,
    marginBottom: 12,
    minWidth: 0,
  },
  formFieldFull: {
    marginBottom: 12,
    minWidth: 0,
  },
  formInput: {
    flex: 1,
    fontSize: typography.sizes.label,
    height: 46,
    minHeight: 46,
    paddingVertical: 9,
  },
  formInputFrame: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 46,
    paddingHorizontal: 12,
  },
  formInputMultiline: {
    alignItems: 'flex-start',
    minHeight: 82,
  },
  formInputWithPrefix: {
    paddingLeft: 8,
  },
  inputPrefix: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    lineHeight: 18,
    marginTop: 1,
  },
  formInputMultilineText: {
    textAlignVertical: 'top',
  },
  standaloneFormInput: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: typography.sizes.label,
    height: 46,
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  formLabel: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.medium,
    marginBottom: 6,
  },
  hiddenDatePickerInput: {
    height: 0,
    opacity: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  hiddenDatePickerLabel: {
    height: 0,
    opacity: 0,
  },
  formPanel: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  formPanelEditing: {
    borderWidth: 2,
  },
  formModalActions: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 12,
  },
  formModalPrimaryButton: {
    flex: 1,
  },
  formModalTitle: {
    fontSize: typography.sizes.bodyLarge,
    fontWeight: typography.weights.semibold,
    marginBottom: 12,
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 15,
    marginTop: 15,
  },
  ingredientInfo: {
    flex: 1,
    minWidth: 0,
  },
  ingredientInitials: {
    alignItems: 'center',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    marginRight: 12,
    width: 48,
  },
  ingredientInitialsText: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.bold,
  },
  ingredientMeta: {
    fontSize: typography.sizes.caption,
    lineHeight: 17,
    marginTop: 4,
  },
  ingredientName: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  infoBlock: {
    flex: 1,
    minWidth: 90,
  },
  infoLabel: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.medium,
    marginBottom: 3,
  },
  infoValue: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
    lineHeight: 18,
  },
  inlineDangerButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    minHeight: 36,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  inlineActionButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 10,
  },
  inventoryCard: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 10,
    minHeight: 82,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  inventoryQuantity: {
    flexShrink: 0,
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.bold,
    marginLeft: 10,
    maxWidth: 118,
    textAlign: 'right',
  },
  inventoryList: {
    paddingBottom: 92,
    paddingHorizontal: 15,
  },
  inventoryFormContent: {
    paddingBottom: 4,
  },
  inventoryFormSheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: '78%',
    padding: 18,
    paddingTop: 0,
    width: '100%',
  },
  lotBrand: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  lotCard: {
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
    padding: 12,
    position: 'relative',
  },
  lotCardEditing: {
    borderWidth: 2,
  },
  lotFeedbackBorder: {
    borderRadius: 8,
    borderWidth: 2,
    bottom: -1,
    left: -1,
    position: 'absolute',
    right: -1,
    top: -1,
  },
  lotDetails: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    marginTop: 12,
  },
  lotDetailBlock: {
    flex: 1,
    minWidth: 0,
  },
  lotActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  lotFormActions: {
    gap: 10,
    marginTop: 2,
  },
  lotHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  lotEmptyState: {
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  lotInfo: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },
  lotCost: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    textAlign: 'right',
  },
  lotMeta: {
    fontSize: typography.sizes.caption,
    lineHeight: 17,
    marginTop: 4,
  },
  mainContainer: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    flex: 1,
    marginHorizontal: 8,
    marginTop: 50,
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  pickerOptionDescription: {
    flex: 1,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.regular,
  },
  pickerOptionKey: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    minWidth: 46,
  },
  pickerOptionRow: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 12,
  },
  pickerTitle: {
    fontSize: typography.sizes.bodyLarge,
    fontWeight: typography.weights.semibold,
    marginBottom: 4,
  },
  pickerSearchInput: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: typography.sizes.body,
    minHeight: 46,
    paddingHorizontal: 12,
    width: '100%',
  },
  qualityDot: {
    borderRadius: 7,
    height: 14,
    width: 14,
  },
  qualityDotBar: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 46,
    paddingHorizontal: 10,
  },
  qualityDotButton: {
    alignItems: 'center',
    flex: 1,
    height: 44,
    justifyContent: 'center',
  },
  qualityDotValue: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
    minWidth: 34,
    textAlign: 'right',
  },
  searchContainer: {
    marginBottom: 14,
    marginHorizontal: 15,
    marginTop: 16,
  },
  searchInput: {
    borderRadius: 15,
    borderWidth: 1,
    fontSize: typography.sizes.body,
    height: 52,
    paddingHorizontal: 15,
    paddingRight: 48,
  },
  secondaryButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  secondaryButtonText: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
  },
  selectBox: {
    alignItems: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 12,
  },
  selectDescription: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.regular,
    lineHeight: 16,
  },
  selectValue: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
    lineHeight: 18,
  },
  unitSelectBox: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  unitSelectDescription: {
    flex: 1,
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.regular,
    lineHeight: 16,
    textAlign: 'right',
  },
  unitSelectValue: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    minWidth: 34,
  },
  sectionTitle: {
    fontSize: typography.sizes.bodyLarge,
    fontWeight: typography.weights.semibold,
    marginBottom: 10,
    marginTop: 14,
  },
  sheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  storePickerList: {
    gap: 8,
    paddingBottom: 2,
  },
  storePickerScroll: {
    flexShrink: 1,
    maxHeight: 470,
    width: '100%',
  },
  storePickerAddress: {
    fontSize: typography.sizes.caption,
    lineHeight: 17,
    marginTop: 3,
  },
  storePickerAlias: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  storePickerOption: {
    alignItems: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 64,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  storeManagerButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 42,
    paddingHorizontal: 12,
  },
  taxOption: {
    alignItems: 'center',
    borderRadius: 7,
    flex: 1,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: 8,
  },
  taxOptionText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  taxRateInput: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: typography.sizes.label,
    height: 38,
    marginTop: 8,
    paddingHorizontal: 12,
  },
  taxSelector: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 4,
    height: 46,
    padding: 5,
  },
  summaryPanel: {
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    padding: 12,
  },
  title: {
    fontSize: typography.sizes.title,
    fontWeight: typography.weights.bold,
  },
});

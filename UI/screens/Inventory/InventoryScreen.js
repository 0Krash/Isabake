import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
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

const qualityWeight = {
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
};

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
  location: '',
  purchaseDate: '',
  quality: 4,
  quantity: '',
  supplier: '',
  supplierId: null,
  unit: 'g',
};

const allowedUnits = ['g', 'kg', 'ml', 'l', 'pza', 'cda', 'cdta'];

const normalizeUnit = (unit) => {
  const normalizedUnit = String(unit || 'g').trim().toLowerCase();
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
    return 'Sin fecha';
  }

  return new Date(`${dateValue}T00:00:00`).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
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
  const totals = lots.reduce((result, lot) => {
    const group = unitGroups[lot.unit] || lot.unit;
    result[group] = (result[group] || 0) + toBaseQuantity(lot.quantity, lot.unit);
    return result;
  }, {});
  const totalText =
    Object.entries(totals)
      .map(([group, quantity]) => formatQuantity(quantity, group))
      .join(' + ') || '0';
  const nextExpiry = lots.reduce(
    (nearest, lot) =>
      !nearest || lot.expiryDate < nearest.expiryDate ? lot : nearest,
    null
  );
  const averageQuality =
    lots.reduce((sum, lot) => sum + (qualityWeight[lot.quality] || 0), 0) /
    Math.max(lots.length, 1);
  const qualityText =
    lots.length === 0
      ? 'Sin lotes'
      : averageQuality >= 4.5
        ? 'Excelente'
        : averageQuality >= 3.5
          ? 'Buena'
          : averageQuality >= 2.5
            ? 'Media'
          : 'Revisar';

  return {
    nextExpiry,
    qualityText,
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
  const [menuIsVisible, setMenuIsVisible] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [formIsVisible, setFormIsVisible] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [inventoryForm, setInventoryForm] = useState(emptyInventoryForm);

  const selectedItem = useMemo(
    () => inventoryItems.find((item) => item.id === selectedItemId),
    [inventoryItems, selectedItemId]
  );

  const filteredItems = useMemo(() => {
    const normalizedSearch = searchText.trim().toLowerCase();

    if (!normalizedSearch) {
      return inventoryItems;
    }

    return inventoryItems.filter((item) =>
      `${item.name} ${item.category} ${item.storage}`
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [inventoryItems, searchText]);

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

    const currentItem = inventoryItems.find((item) => item.id === editingItemId);
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
          toApiInventoryItem(payload)
        );
        const updatedItem = normalizeInventoryItem(response.data.inventoryItem);
        setInventoryItems((items) =>
          items.map((item) => (item.id === updatedItem.id ? updatedItem : item))
        );
      } else {
        const response = await inventoryService.postInventoryItem(
          toApiInventoryItem(payload)
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
        'Revisa la conexion con el backend e intenta nuevamente.'
      );
    }
  };

  const persistInventoryItem = async (itemToUpdate) => {
    const response = await inventoryService.updateInventoryItemById(
      itemToUpdate.inventoryId,
      toApiInventoryItem(itemToUpdate)
    );
    const updatedItem = normalizeInventoryItem(response.data.inventoryItem);
    setInventoryItems((items) =>
      items.map((item) => (item.id === updatedItem.id ? updatedItem : item))
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

    if (!brand || !quantity || !lotForm.expiryDate.trim() || !lotForm.supplier) {
      Alert.alert(
        'Datos incompletos',
        'Agrega marca, cantidad, fecha de caducidad y proveedor para el lote.'
      );
      return false;
    }

    const nextLot = {
      ...lotForm,
      cost: lotForm.cost || '0',
      id: lotIdToUpdate || `lot-${Date.now()}`,
      quality: normalizeQuality(lotForm.quality),
      quantity,
      unit: normalizeUnit(lotForm.unit),
    };

    try {
      const nextLots = lotIdToUpdate
        ? selectedItem.lots.map((lot) =>
            lot.id === lotIdToUpdate ? nextLot : lot
          )
        : [...selectedItem.lots, nextLot];

      await persistInventoryItem({
        ...selectedItem,
        lots: nextLots,
      });
      return true;
    } catch (error) {
      console.warn('Error al guardar lote:', error);
      Alert.alert(
        'No se pudo guardar el lote',
        'Revisa la conexion con el backend e intenta nuevamente.'
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
        'Revisa la conexion con el backend e intenta nuevamente.'
      );
    }
  };

  const confirmDeleteInventoryItem = (item) => {
    Alert.alert(
      'Eliminar ingrediente',
      `Se eliminara ${item.name} y todos sus lotes del inventario.`,
      [
        { style: 'cancel', text: 'Cancelar' },
        {
          style: 'destructive',
          text: 'Eliminar',
          onPress: async () => {
            try {
              await inventoryService.deleteInventoryItemById(item.inventoryId);
              setInventoryItems((items) =>
                items.filter((currentItem) => currentItem.id !== item.id)
              );
              setSelectedItemId(null);
              refreshInventory();
            } catch (error) {
              console.warn('Error al eliminar ingrediente:', error);
              Alert.alert(
                'No se pudo eliminar',
                'Revisa la conexion con el backend e intenta nuevamente.'
              );
            }
          },
        },
      ]
    );
  };

  return (
    <View
      style={[styles.mainContainer, { backgroundColor: colors.screenBackground }]}
    >
      <View style={styles.headerContainer}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Inventario
        </Text>
        <TransactionMenuButton
          isOpen={menuIsVisible}
          onPress={() => setMenuIsVisible(true)}
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
            onPress={() => setSearchText('')}
            style={[styles.clearButton, { backgroundColor: colors.surfaceMuted }]}
          >
            <Text style={[styles.clearButtonText, { color: colors.textSecondary }]}>
              x
            </Text>
          </Pressable>
        )}
      </View>

      <FlatList
        contentContainerStyle={styles.inventoryList}
        data={filteredItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const summary = getIngredientSummary(item);
          const expiryDays = getDaysUntilExpiry(summary.nextExpiry?.expiryDate);

          return (
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => setSelectedItemId(item.id)}
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
                <Text style={[styles.ingredientName, { color: colors.textPrimary }]}>
                  {item.name}
                </Text>
                <Text style={[styles.ingredientMeta, { color: colors.textMuted }]}>
                  {summary.totalText} · {item.lots.length} marcas/lotes
                </Text>
              </View>
              <View style={styles.inventoryStatus}>
                <Text style={[styles.statusLabel, { color: colors.textMuted }]}>
                  Calidad
                </Text>
                <Text style={[styles.statusValue, { color: colors.textPrimary }]}>
                  {summary.qualityText}
                </Text>
                <Text style={[styles.expiryText, { color: colors.textMuted }]}>
                  {expiryDays === null ? 'Sin caducidad' : `${expiryDays} dias`}
                </Text>
              </View>
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
        onPress={openCreateForm}
        style={[styles.addButton, { backgroundColor: colors.primary }]}
      >
        <Text style={[styles.addButtonText, { color: colors.textInverse }]}>+</Text>
      </TouchableOpacity>

      <TransactionMenu
        isVisible={menuIsVisible}
        onClose={() => setMenuIsVisible(false)}
        onOpenStoreManager={handleOpenStoreManager}
      />

      {addStoreModalIsVisible && (
        <AddStoreModal
          AddStoreModalIsVisible={addStoreModalIsVisible}
          setAddStoreModalIsVisible={setAddStoreModalIsVisible}
        />
      )}

      <InventoryDetailModal
        colors={colors}
        item={selectedItem}
        onAddLot={addLotToSelectedItem}
        onClose={() => setSelectedItemId(null)}
        onDeleteItem={confirmDeleteInventoryItem}
        onDeleteLot={removeLotFromSelectedItem}
        onEditItem={openEditForm}
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
    </View>
  );
}

const InventoryDetailModal = ({
  colors,
  item,
  onAddLot,
  onClose,
  onDeleteItem,
  onDeleteLot,
  onEditItem,
}) => {
  const [lotForm, setLotForm] = useState(emptyLotForm);
  const detailScrollRef = useRef(null);
  const lotFormY = useRef(0);
  const [stores, setStores] = useState([]);
  const [storesHaveLoaded, setStoresHaveLoaded] = useState(false);
  const [storesAreLoading, setStoresAreLoading] = useState(false);
  const [unitPickerIsVisible, setUnitPickerIsVisible] = useState(false);
  const [storePickerIsVisible, setStorePickerIsVisible] = useState(false);
  const [datePickerIsVisible, setDatePickerIsVisible] = useState(false);
  const [editingLotId, setEditingLotId] = useState(null);
  const isVisible = Boolean(item);
  const detailSheet = useBottomSheet(isVisible, onClose);

  useEffect(() => {
    if (isVisible) {
      setLotForm(emptyLotForm);
      setUnitPickerIsVisible(false);
      setStorePickerIsVisible(false);
      setDatePickerIsVisible(false);
      setEditingLotId(null);
    }
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible || storesHaveLoaded || storesAreLoading) {
      return;
    }

    const fetchStores = async () => {
      setStoresAreLoading(true);

      try {
        setStores(await storeService.getAllStores());
      } catch (error) {
        console.warn('Error al cargar tiendas para inventario:', error);
      } finally {
        setStoresHaveLoaded(true);
        setStoresAreLoading(false);
      }
    };

    fetchStores();
  }, [isVisible, storesAreLoading, storesHaveLoaded]);

  if (!item) {
    return null;
  }

  const summary = getIngredientSummary(item);

  const handleAddLot = async () => {
    const didSaveLot = await onAddLot(lotForm, editingLotId);

    if (didSaveLot) {
      setLotForm(emptyLotForm);
      setEditingLotId(null);
    }
  };

  const duplicateLot = async (lot) => {
    setEditingLotId(null);
    const didDuplicateLot = await onAddLot({
      ...emptyLotForm,
      ...lot,
      cost: String(lot.cost || '').replace('$', ''),
      id: undefined,
      quantity: `${lot.quantity || ''}`,
    });

    if (didDuplicateLot) {
      setLotForm(emptyLotForm);
    }
  };

  const editLot = (lot) => {
    setEditingLotId(lot.id);
    setLotForm({
      ...emptyLotForm,
      ...lot,
      cost: String(lot.cost || '').replace('$', ''),
      quantity: `${lot.quantity || ''}`,
    });
    requestAnimationFrame(() => {
      detailScrollRef.current?.scrollTo({
        animated: true,
        y: Math.max(lotFormY.current - 12, 0),
      });
    });
  };

  return (
    <Modal
      animationType="none"
      onRequestClose={detailSheet.closeBottomSheet}
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
            onPress={detailSheet.closeBottomSheet}
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
          <View style={styles.dragHandleArea} {...detailSheet.handlePanHandlers}>
            <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
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
              <Text style={[styles.detailTitle, { color: colors.textPrimary }]}>
                {item.name}
              </Text>
              <Text style={[styles.detailSubtitle, { color: colors.textMuted }]}>
                {item.category || 'Sin categoria'} · {item.storage || 'Sin ubicacion'}
              </Text>
            </View>
          </View>

          <ScrollView
            ref={detailScrollRef}
            contentContainerStyle={styles.detailContent}
            onScroll={detailSheet.onScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={[
                styles.summaryPanel,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <InfoBlock colors={colors} label="Total" value={summary.totalText} />
              <InfoBlock
                colors={colors}
                label="Calidad"
                value={summary.qualityText}
              />
              <InfoBlock
                colors={colors}
                label="Caduca pronto"
                value={formatDate(summary.nextExpiry?.expiryDate)}
              />
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => onEditItem(item)}
                style={[styles.secondaryButton, { borderColor: colors.border }]}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.textPrimary }]}>
                  Editar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => onDeleteItem(item)}
                style={[styles.dangerButton, { borderColor: colors.danger }]}
              >
                <Text style={[styles.dangerButtonText, { color: colors.danger }]}>
                  Eliminar
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
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
              <FormInput
                colors={colors}
                label="Marca"
                onChangeText={(value) =>
                  setLotForm((current) => ({ ...current, brand: value }))
                }
                value={lotForm.brand}
              />
              <View style={styles.formRow}>
                <FormInput
                  colors={colors}
                  keyboardType="numeric"
                  label="Cantidad"
                  onChangeText={(value) =>
                    setLotForm((current) => ({ ...current, quantity: value }))
                  }
                  value={lotForm.quantity}
                />
                <UnitSelector
                  colors={colors}
                  onPress={() => setUnitPickerIsVisible(true)}
                  value={lotForm.unit}
                />
              </View>
              <View style={styles.formRow}>
                <DatePickerComponent
                  handleConfirm={(date) => {
                    setLotForm((current) => ({
                      ...current,
                      expiryDate: formatDateForApi(date),
                    }));
                    setDatePickerIsVisible(false);
                  }}
                  hideDatePicker={() => setDatePickerIsVisible(false)}
                  inputStyle={[
                    styles.formInput,
                    {
                      backgroundColor: colors.fieldBackground,
                      borderColor: colors.border,
                      color: colors.textPrimary,
                    },
                  ]}
                  isDatePickerVisible={datePickerIsVisible}
                  label="Caducidad"
                  labelStyle={[styles.formLabel, { color: colors.textMuted }]}
                  selectedDate={inventoryDateToSelected(lotForm.expiryDate)}
                  showDatePicker={() => setDatePickerIsVisible(true)}
                  useCustomFieldStyle={true}
                />
                <QualitySelector
                  colors={colors}
                  value={lotForm.quality}
                  onChange={(quality) =>
                    setLotForm((current) => ({ ...current, quality }))
                  }
                />
              </View>
              <View style={styles.formRow}>
                <FormInput
                  colors={colors}
                  label="Costo"
                  onChangeText={(value) =>
                    setLotForm((current) => ({ ...current, cost: value }))
                  }
                  value={lotForm.cost}
                />
                <FormInput
                  colors={colors}
                  label="Ubicacion"
                  onChangeText={(value) =>
                    setLotForm((current) => ({ ...current, location: value }))
                  }
                  value={lotForm.location}
                />
              </View>
              <StoreSelector
                colors={colors}
                onPress={() => setStorePickerIsVisible(true)}
                value={lotForm.supplier}
              />
              <View style={styles.lotFormActions}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handleAddLot}
                  style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.primaryButtonText}>
                    {editingLotId ? 'Actualizar lote' : 'Guardar lote'}
                  </Text>
                </TouchableOpacity>
                {editingLotId && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      setEditingLotId(null);
                      setLotForm(emptyLotForm);
                    }}
                    style={[styles.secondaryButton, { borderColor: colors.border }]}
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
                )}
              </View>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Marcas y lotes
            </Text>
            {item.lots.length === 0 && (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                Este ingrediente aun no tiene lotes registrados.
              </Text>
            )}
            {item.lots.map((lot) => {
              const daysUntilExpiry = getDaysUntilExpiry(lot.expiryDate);
              const isEditingLot = editingLotId === lot.id;

              return (
                <View
                  key={lot.id}
                  style={[
                    styles.lotCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: isEditingLot ? colors.primary : colors.border,
                    },
                    isEditingLot && styles.lotCardEditing,
                  ]}
                >
                  <View style={styles.lotHeader}>
                    <View style={styles.lotInfo}>
                      <Text style={[styles.lotBrand, { color: colors.textPrimary }]}>
                        {lot.brand}
                      </Text>
                      <Text style={[styles.lotMeta, { color: colors.textMuted }]}>
                        {lot.quantity} {lot.unit} · {lot.location || 'Sin ubicacion'}
                      </Text>
                    </View>
                    <View style={styles.lotQuality}>
                      <Text style={[styles.statusLabel, { color: colors.textMuted }]}>
                        Calidad
                      </Text>
                      <Text style={[styles.statusValue, { color: colors.textPrimary }]}>
                        {lot.quality}/5
                      </Text>
                    </View>
                  </View>
                  <View style={styles.lotDetails}>
                    <InfoBlock
                      colors={colors}
                      label="Caducidad"
                      value={`${formatDate(lot.expiryDate)}${
                        daysUntilExpiry === null ? '' : ` (${daysUntilExpiry} dias)`
                      }`}
                    />
                    <InfoBlock
                      colors={colors}
                      label="Proveedor"
                      value={lot.supplier || 'Sin proveedor'}
                    />
                    <InfoBlock colors={colors} label="Costo" value={lot.cost} />
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
                  ) : (
                    <View style={styles.lotActionRow}>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => duplicateLot(lot)}
                        style={[styles.inlineActionButton, { borderColor: colors.border }]}
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
                        onPress={() => editLot(lot)}
                        style={[styles.inlineActionButton, { borderColor: colors.border }]}
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
                        activeOpacity={0.8}
                        onPress={() => onDeleteLot(lot.id)}
                        style={[
                          styles.inlineActionButton,
                          { borderColor: colors.danger },
                        ]}
                      >
                        <Text style={[styles.dangerButtonText, { color: colors.danger }]}>
                          Eliminar
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
          <UnitPickerModal
            colors={colors}
            isVisible={unitPickerIsVisible}
            onClose={() => setUnitPickerIsVisible(false)}
            onSelect={(unit) => {
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
            onSelect={(store) => {
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

const UnitSelector = ({ colors, onPress, value }) => (
  <View style={styles.formField}>
    <Text style={[styles.formLabel, { color: colors.textMuted }]}>Unidad</Text>
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={[
        styles.selectBox,
        {
          backgroundColor: colors.fieldBackground,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.selectValue, { color: colors.textPrimary }]}>
        {value}
      </Text>
      <Text
        numberOfLines={1}
        style={[styles.selectDescription, { color: colors.textMuted }]}
      >
        {getIngredientUnitLabel(value)}
      </Text>
    </TouchableOpacity>
  </View>
);

const StoreSelector = ({ colors, onPress, value }) => (
  <View style={styles.formField}>
    <Text style={[styles.formLabel, { color: colors.textMuted }]}>Proveedor</Text>
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={[
        styles.selectBox,
        {
          backgroundColor: colors.fieldBackground,
          borderColor: colors.border,
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

const QualitySelector = ({ colors, onChange, value }) => (
  <View style={styles.formField}>
    <Text style={[styles.formLabel, { color: colors.textMuted }]}>Calidad</Text>
    <View
      style={[
        styles.qualityDotBar,
        {
          backgroundColor: colors.fieldBackground,
          borderColor: colors.border,
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
            onPress={() => onChange(quality)}
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

const CenteredPickerShell = ({ children, colors, isVisible, onClose }) => {
  if (!isVisible) {
    return null;
  }

  return (
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
          onPress={() => onSelect(unit.key)}
          style={[
            styles.pickerOptionRow,
            {
              backgroundColor: isSelected ? colors.primaryMuted : colors.surface,
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
            style={[styles.pickerOptionDescription, { color: colors.textSecondary }]}
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
  onSelect,
  selectedStoreId,
  stores,
}) => (
  <CenteredPickerShell colors={colors} isVisible={isVisible} onClose={onClose}>
    <Text style={[styles.pickerTitle, { color: colors.textPrimary }]}>
      Seleccionar proveedor
    </Text>
    {isLoading ? (
      <Text style={[styles.emptyText, { color: colors.textMuted }]}>
        Cargando tiendas...
      </Text>
    ) : stores.length === 0 ? (
      <Text style={[styles.emptyText, { color: colors.textMuted }]}>
        No hay tiendas registradas.
      </Text>
    ) : (
      <ScrollView
        contentContainerStyle={styles.storePickerList}
        showsVerticalScrollIndicator={true}
      >
        {stores.map((store) => {
          const storeAddress = getStoreValue(store, 'Address');
          const storeName = getStoreValue(store, 'Name');
          const storeAlias = getStoreValue(store, 'Alias');
          const storeId = Number(store.storeId);
          const isSelected = storeId === Number(selectedStoreId);

          return (
            <TouchableOpacity
              activeOpacity={0.75}
              key={store.storeId || `${storeAlias}-${storeAddress}`}
              onPress={() => onSelect(store)}
              style={[
                styles.storePickerOption,
                {
                  backgroundColor: isSelected ? colors.primaryMuted : colors.surface,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.storePickerAlias,
                  { color: isSelected ? colors.primaryText : colors.textPrimary },
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
  </CenteredPickerShell>
);

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
            onPress={formSheet.closeBottomSheet}
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
            <View style={styles.dragHandleArea} {...formSheet.handlePanHandlers}>
              <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
            </View>
            <Text style={[styles.formModalTitle, { color: colors.textPrimary }]}>
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
                onPress={formSheet.closeBottomSheet}
                style={[styles.secondaryButton, { borderColor: colors.border }]}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.textPrimary }]}>
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={onSave}
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
  keyboardType,
  label,
  multiline,
  onChangeText,
  placeholder,
  value,
}) => (
  <View style={styles.formField}>
    <Text style={[styles.formLabel, { color: colors.textMuted }]}>{label}</Text>
    <TextInput
      keyboardType={keyboardType}
      multiline={multiline}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      style={[
        styles.formInput,
        multiline && styles.formInputMultiline,
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

const InfoBlock = ({ colors, label, value }) => (
  <View style={styles.infoBlock}>
    <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{label}</Text>
    <Text style={[styles.infoValue, { color: colors.textPrimary }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
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
    maxHeight: '82%',
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
  detailContent: {
    paddingBottom: 20,
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
    maxHeight: '88%',
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
    fontSize: typography.sizes.bodyLarge,
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
  emptyText: {
    fontSize: typography.sizes.label,
    lineHeight: 19,
    marginTop: 4,
  },
  emptyTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  expiryText: {
    fontSize: typography.sizes.caption,
    marginTop: 2,
    textAlign: 'right',
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
  formField: {
    flex: 1,
    marginBottom: 12,
    minWidth: 0,
  },
  formInput: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: typography.sizes.label,
    height: 46,
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  formInputMultiline: {
    minHeight: 82,
    textAlignVertical: 'top',
  },
  formLabel: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.medium,
    marginBottom: 6,
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
  inventoryStatus: {
    alignItems: 'flex-end',
    maxWidth: 96,
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
  },
  lotCardEditing: {
    borderWidth: 2,
  },
  lotDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
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
  lotInfo: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },
  lotMeta: {
    fontSize: typography.sizes.caption,
    lineHeight: 17,
    marginTop: 4,
  },
  lotQuality: {
    alignItems: 'flex-end',
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
  statusLabel: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.medium,
  },
  statusValue: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    textAlign: 'right',
  },
  storePickerList: {
    gap: 8,
    paddingBottom: 2,
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

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Keyboard,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import CurrencyFormatter from '../../../../utils/CurrencyFormatter';
import DateFormatter from '../../../../utils/DateFormatter';
import typography from '../../../../constants/TransactionBalance/Typography';
import { useTransactionBalanceTheme } from '../../../../context/TransactionBalanceThemeContext';

const getCategoryColor = (categoryId) => {
  switch (categoryId) {
    case '1':
      return '#EA4641';
    case '2':
      return '#F59C14';
    case '3':
      return '#2AC968';
    case '4':
      return '#3F7AE3';
    default:
      return '#9777DC';
  }
};

export default function TransactionDetailModal({
  setTransactionDetailModalIsVisible,
  transactionDetailModalIsVisible,
  transactionDetail,
}) {
  const { colors } = useTransactionBalanceTheme();
  const { height: windowHeight } = useWindowDimensions();
  const sheetTranslateY = useRef(new Animated.Value(windowHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const scrollOffsetY = useRef(0);
  const [storePopupIsVisible, setStorePopupIsVisible] = useState(false);
  const {
    amount = '',
    category = {},
    description = '',
    financials,
    itemQuantity = '',
    quantity = '',
    selectedDate = '',
    store = {},
    transactionId = '',
    transactionType = '',
  } = transactionDetail;
  const categoryColor = getCategoryColor(category.categoryId);
  const itemCount = category.categoryId === '1' ? itemQuantity : quantity;
  const closeModal = () => setTransactionDetailModalIsVisible(false);
  const storeName = store.Name || store.name || 'Sin nombre';
  const storeAlias = store.alias || store.Alias || 'Sin alias';
  const storeAddress = store.Address || store.address || 'Sin direccion';

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
    ]).start(closeModal);
  }, [backdropOpacity, sheetTranslateY, windowHeight]);

  useEffect(() => {
    if (transactionDetailModalIsVisible) {
      sheetTranslateY.setValue(windowHeight);
      backdropOpacity.setValue(0);
      setStorePopupIsVisible(false);

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
    backdropOpacity,
    sheetTranslateY,
    transactionDetailModalIsVisible,
    windowHeight,
  ]);

  const shouldCaptureSheetSwipe = (_, gestureState) =>
    !storePopupIsVisible &&
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
    [closeBottomSheet, resetSwipePosition, sheetTranslateY, storePopupIsVisible]
  );

  const handlePanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          !storePopupIsVisible &&
          gestureState.dy > 6 &&
          Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onMoveShouldSetPanResponderCapture: (_, gestureState) =>
          !storePopupIsVisible &&
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
    [closeBottomSheet, resetSwipePosition, sheetTranslateY, storePopupIsVisible]
  );

  const handleRequestClose = () => {
    if (storePopupIsVisible) {
      setStorePopupIsVisible(false);
      return;
    }

    closeBottomSheet();
  };

  return (
    <Modal
      animationType="none"
      onRequestClose={handleRequestClose}
      transparent
      visible={transactionDetailModalIsVisible}
    >
      <View style={styles.sheetRoot}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.backdrop,
            { backgroundColor: colors.backdrop, opacity: backdropOpacity },
          ]}
        />
        <Pressable onPress={closeBottomSheet} style={styles.backdrop} />
        <Animated.View
          {...sheetPanResponder.panHandlers}
          style={[
            styles.sheet,
            { backgroundColor: colors.screenBackground },
            { transform: [{ translateY: sheetTranslateY }] },
          ]}
        >
          <View style={styles.dragHandleArea} {...handlePanResponder.panHandlers}>
            <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
          </View>
          <View style={styles.header}>
            <View style={styles.categoryAccentContainer}>
              <View
                style={[styles.categoryAccent, { backgroundColor: categoryColor }]}
              />
            </View>
            <View style={styles.headerTextContainer}>
              <Text
                numberOfLines={2}
                style={[styles.title, { color: colors.textPrimary }]}
              >
                {description || 'Movimiento'}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                {transactionType || category.description || 'Movimiento'}
              </Text>
            </View>
            <View style={styles.amountContainer}>
              <Text style={[styles.amount, { color: colors.textPrimary }]}>
                {CurrencyFormatter.convertCentsToCurrency(amount)}
              </Text>
              <Text style={[styles.amountLabel, { color: colors.textMuted }]}>
                Monto
              </Text>
            </View>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            onScroll={(event) => {
              scrollOffsetY.current = event.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
          >
            <DetailRow
              colors={colors}
              label="Fecha"
              value={DateFormatter.convertISOtoSelected(selectedDate)}
            />
            {financials && (
              <>
                <Text style={[styles.financialTitle, { color: colors.textPrimary }]}>
                  Conciliación de rentabilidad
                </Text>
                <DetailRow colors={colors} label="Receta" value={financials.recipeName} />
                <DetailRow
                  colors={colors}
                  label="Porciones vendidas"
                  value={`${financials.saleQuantity || quantity || 0}`}
                />
                <DetailRow
                  colors={colors}
                  label="Costo por porción"
                  value={CurrencyFormatter.convertCentsToCurrency(financials.costPerPortion)}
                />
                <DetailRow
                  colors={colors}
                  label="Costo de elaboración"
                  value={CurrencyFormatter.convertCentsToCurrency(financials.productionCost)}
                />
                <DetailRow
                  colors={colors}
                  label="Margen objetivo"
                  value={`${Number(financials.targetMargin || 0).toFixed(1)}%`}
                />
                <DetailRow
                  colors={colors}
                  label="Precio sugerido por porción"
                  value={CurrencyFormatter.convertCentsToCurrency(financials.suggestedUnitPrice)}
                />
                <DetailRow
                  colors={colors}
                  label="Total sugerido"
                  value={CurrencyFormatter.convertCentsToCurrency(financials.suggestedTotal)}
                />
                <DetailRow
                  colors={colors}
                  label="Utilidad bruta"
                  value={`${CurrencyFormatter.convertCentsToCurrency(financials.grossProfit)} · ${Number(financials.grossMargin || 0).toFixed(1)}%`}
                />
                <DetailRow
                  colors={colors}
                  label="Gastos adicionales"
                  value={CurrencyFormatter.convertCentsToCurrency(financials.extraExpenses)}
                />
                <DetailRow
                  colors={colors}
                  label="Utilidad neta estimada"
                  value={`${CurrencyFormatter.convertCentsToCurrency(financials.netProfit)} · ${Number(financials.netMargin || 0).toFixed(1)}%`}
                />
                {(financials.ingredients || []).map((ingredient, index) => (
                  <DetailRow
                    colors={colors}
                    key={`${ingredient.inventoryId || ingredient.name}-${index}`}
                    label={`Ingrediente · ${ingredient.name}`}
                    value={`${ingredient.quantity} ${ingredient.unit} · ${CurrencyFormatter.convertCentsToCurrency(ingredient.cost)}`}
                  />
                ))}
              </>
            )}
            {(category.categoryId === '1' || category.categoryId === '2') && (
              <>
                <DetailRow
                  colors={colors}
                  label="Tienda"
                  onPress={() => {
                    Keyboard.dismiss();
                    setStorePopupIsVisible(true);
                  }}
                  value={storeAlias}
                />
                <DetailRow
                  colors={colors}
                  label="Cantidad"
                  value={`${itemCount || 0}`}
                />
              </>
            )}
            <DetailRow
              colors={colors}
              label="Id de transaccion"
              selectable
              value={transactionId || 'Sin id'}
            />
          </ScrollView>
        </Animated.View>
        {storePopupIsVisible && (
          <View style={styles.storePopupOverlay}>
            <View style={[styles.storePopupBackdrop, { backgroundColor: colors.backdrop }]} />
            <View
              style={[
                styles.storePopupCard,
                { backgroundColor: colors.screenBackground, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.storePopupTitle, { color: colors.textPrimary }]}>
                Tienda
              </Text>
              <StoreInfoRow colors={colors} label="Nombre" value={storeName} />
              <StoreInfoRow colors={colors} label="Alias" value={storeAlias} />
              <StoreInfoRow colors={colors} label="Direccion" value={storeAddress} />
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => {
                  Keyboard.dismiss();
                  setStorePopupIsVisible(false);
                }}
                style={[styles.storePopupButton, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.storePopupButtonText, { color: colors.textInverse }]}>
                  Cerrar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const DetailRow = ({ colors, label, onPress, selectable = false, value }) => {
  const Container = onPress ? TouchableOpacity : View;

  return (
    <Container
      activeOpacity={onPress ? 0.75 : undefined}
      onPress={onPress}
      style={[
        styles.detailRow,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.detailLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text
        numberOfLines={selectable ? undefined : 2}
        selectable={selectable}
        style={[styles.detailValue, { color: colors.textPrimary }]}
      >
        {value}
      </Text>
    </Container>
  );
};

const StoreInfoRow = ({ colors, label, value }) => (
  <View style={styles.storeInfoRow}>
    <Text style={[styles.detailLabel, { color: colors.textMuted }]}>{label}</Text>
    <Text style={[styles.detailValue, { color: colors.textPrimary }]}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  amount: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    textAlign: 'right',
  },
  amountContainer: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  amountLabel: {
    fontSize: typography.sizes.caption,
    marginTop: 2,
  },
  backdrop: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  financialTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    marginBottom: 8,
    marginTop: 12,
  },
  categoryAccent: {
    borderRadius: 4,
    height: 58,
    width: 5,
  },
  categoryAccentContainer: {
    alignItems: 'center',
    alignSelf: 'stretch',
    justifyContent: 'center',
    marginRight: 10,
    width: 8,
  },
  content: {
    gap: 8,
    paddingBottom: 20,
  },
  detailLabel: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.medium,
    marginBottom: 3,
  },
  detailRow: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  detailValue: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    lineHeight: 20,
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
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 16,
  },
  headerTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  sheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: '82%',
    padding: 18,
    paddingTop: 0,
    width: '100%',
  },
  sheetRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  storeInfoRow: {
    gap: 2,
  },
  storePopupBackdrop: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  storePopupButton: {
    alignItems: 'center',
    borderRadius: 8,
    height: 46,
    justifyContent: 'center',
    marginTop: 4,
  },
  storePopupButtonText: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
  },
  storePopupCard: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 16,
    width: '84%',
  },
  storePopupOverlay: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  storePopupTitle: {
    fontSize: typography.sizes.bodyLarge,
    fontWeight: typography.weights.semibold,
  },
  subtitle: {
    fontSize: typography.sizes.caption,
    lineHeight: 17,
    marginTop: 4,
  },
  title: {
    fontSize: typography.sizes.bodyLarge,
    fontWeight: typography.weights.semibold,
  },
});

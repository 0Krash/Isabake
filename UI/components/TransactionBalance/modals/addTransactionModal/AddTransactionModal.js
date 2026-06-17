import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  View,
  Modal,
  KeyboardAvoidingView,
  Keyboard,
  PanResponder,
  Pressable,
  useWindowDimensions,
} from 'react-native';

import SwitchSelector from '../../SwitchSelector';
import formatter from '../../../../utils/DateFormatter';
import CategoryInputComponent from './CategoryInputComponent';
import DescriptionInputComponent from './DescriptionInputComponent';
import QuantityInputComponent from './QuantityInputComponent';
import AmountInputComponent from './AmountInputComponent';
import DatePickerComponent from './DatePickerComponent';
import StoreInputComponent from './StoreInputComponent';
import UOMInputComponent from './UOMInputComponent';
import ItemQuantityInputComponent from './ItemQuantityInputComponent';
import InsertTransactionButton from './InsertTransactionButton';
import { useTransactionBalanceTheme } from '../../../../context/TransactionBalanceThemeContext';

export default function AddTransactionModal({
  AddTransactionModalIsVisible,
  setAddTransactionModalIsVisible,
  setAddStoreModalIsVisible,
}) {
  const { colors } = useTransactionBalanceTheme();
  const { height: windowHeight } = useWindowDimensions();
  const amountInputRef = useRef(null);
  const quantityInputRef = useRef(null);
  const itemQuantityInputRef = useRef(null);
  const sheetTranslateY = useRef(new Animated.Value(windowHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const scrollOffsetY = useRef(0);
  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState('');
  const [description, setDescription] = useState('');
  const [transactionType, setTransactionType] = useState('Ventas');
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    formatter.ddmmyy(new Date())
  );
  const [category, setCategory] = useState('1');
  const [unitValue, setUnitValue] = useState('1');
  const [itemQuantity, setItemQuantity] = useState('');
  const [selected, setSelected] = useState('');

  const [validationErrorStore, setValidationErrorStore] = useState(false);
  const [validationErrorAmount, setValidationErrorAmount] = useState(false);
  const [validationErrorQuantity, setValidationErrorQuantity] = useState(false);
  const [validationErrorDescription, setValidationErrorDescription] =
    useState(false);
  const [validationErrorItemQuantity, setValidationErrorItemQuantity] =
    useState(false);
  const sheetHeight = showCategoryInput
    ? windowHeight * 0.88
    : windowHeight * 0.68;

  const handleModalOnClose = () => {
    setAddTransactionModalIsVisible(false);
    resetValidatioErrors();
    setSelectedDate(formatter.ddmmyy(new Date()));
    setTransactionType('Ventas');
    setShowCategoryInput(false);
    setCategory('1');
    setQuantity('');
    setAmount('');
    setDescription('');
    setItemQuantity('');
  };

  const resetSwipePosition = useCallback(() => {
    Animated.spring(sheetTranslateY, {
      toValue: 0,
      damping: 18,
      stiffness: 180,
      useNativeDriver: true,
    }).start();
  }, [sheetTranslateY]);

  const closeBottomSheet = useCallback(() => {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(sheetTranslateY, {
        toValue: windowHeight,
        duration: 190,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 190,
        useNativeDriver: true,
      }),
    ]).start(handleModalOnClose);
  }, [backdropOpacity, sheetTranslateY, windowHeight]);

  useEffect(() => {
    if (AddTransactionModalIsVisible) {
      sheetTranslateY.setValue(windowHeight);
      backdropOpacity.setValue(0);

      Animated.parallel([
        Animated.timing(sheetTranslateY, {
          toValue: 0,
          duration: 240,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [AddTransactionModalIsVisible, backdropOpacity, sheetTranslateY, windowHeight]);

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

  const resetValidatioErrors = () => {
    setValidationErrorDescription(false);
    setValidationErrorAmount(false);
    setValidationErrorQuantity(false);
    setValidationErrorItemQuantity(false);
    setValidationErrorStore(false);
  };

  const handleTabChange = (tabName) => {
    setValidationErrorStore(false);
    setTransactionType(tabName);
    setShowCategoryInput(tabName === 'Gastos');
    Keyboard.dismiss();
  };

  const showDatePicker = () => {
    setDatePickerVisibility(true);
  };

  const hideDatePicker = () => {
    setDatePickerVisibility(false);
  };

  const handleConfirm = (date) => {
    setSelectedDate(formatter.ddmmyy(date));
    hideDatePicker();
  };

  return (
    <Modal
      transparent={true}
      animationType="none"
      visible={AddTransactionModalIsVisible}
      onRequestClose={closeBottomSheet}
    >
      <KeyboardAvoidingView style={styles.keyboardView} behavior="height">
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
              styles.modalView,
              {
                backgroundColor: colors.screenBackground,
                height: sheetHeight,
              },
              { transform: [{ translateY: sheetTranslateY }] },
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
            <View style={styles.modalContaier}>
              <View testID="switchArea" style={styles.switchContainer}>
                <SwitchSelector onTabChange={handleTabChange} />
              </View>
              <ScrollView
                testID="inputContainer"
                style={styles.inputContainer}
                contentContainerStyle={styles.inputContentContainer}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                onScroll={(event) => {
                  scrollOffsetY.current = event.nativeEvent.contentOffset.y;
                }}
              >
                <View testID="filterArea">
                  {showCategoryInput && (
                    <CategoryInputComponent
                      category={category}
                      setCategory={setCategory}
                    />
                  )}
                  {showCategoryInput &&
                    (category === '1' || category === '2') && (
                      <StoreInputComponent
                        selected={selected}
                        setSelected={setSelected}
                        setAddStoreModalIsVisible={setAddStoreModalIsVisible}
                        setValidationErrorStore={setValidationErrorStore}
                        transactionType={transactionType}
                      />
                    )}
                </View>
                <View testID="secondRow" style={styles.secondRow}>
                  <DescriptionInputComponent
                    showCategoryInput={showCategoryInput}
                    category={category}
                    setDescription={setDescription}
                    quantityInputRef={quantityInputRef}
                    itemQuantityInputRef={itemQuantityInputRef}
                    setValidationErrorDescription={
                      setValidationErrorDescription
                    }
                  />
                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      justifyContent: 'flex-start',
                    }}
                  >
                    {showCategoryInput && category === '1' && (
                      <ItemQuantityInputComponent
                        itemQuantity={itemQuantity}
                        setItemQuantity={setItemQuantity}
                        itemQuantityInputRef={itemQuantityInputRef}
                        quantityInputRef={quantityInputRef}
                        setValidationErrorItemQuantity={
                          setValidationErrorItemQuantity
                        }
                      />
                    )}
                    <QuantityInputComponent
                      showCategoryInput={showCategoryInput}
                      category={category}
                      quantity={quantity}
                      setQuantity={setQuantity}
                      quantityInputRef={quantityInputRef}
                      amountInputRef={amountInputRef}
                      setValidationErrorQuantity={setValidationErrorQuantity}
                    />
                    {showCategoryInput && category === '1' && (
                      <UOMInputComponent
                        unitValue={unitValue}
                        setUnitValue={setUnitValue}
                      />
                    )}
                    <AmountInputComponent
                      transactionType={transactionType}
                      amount={amount}
                      setAmount={setAmount}
                      amountInputRef={amountInputRef}
                      setValidationErrorAmount={setValidationErrorAmount}
                    />
                    <DatePickerComponent
                      isDatePickerVisible={isDatePickerVisible}
                      showDatePicker={showDatePicker}
                      hideDatePicker={hideDatePicker}
                      handleConfirm={handleConfirm}
                      selectedDate={selectedDate}
                    />
                  </View>
                </View>
              </ScrollView>
              <InsertTransactionButton
                validationError={
                  transactionType === 'Gastos' && category === '1'
                    ? validationErrorDescription &&
                      validationErrorQuantity &&
                      validationErrorAmount &&
                      validationErrorItemQuantity &&
                      validationErrorStore
                    : transactionType === 'Gastos' && category === '2'
                    ? validationErrorDescription &&
                      validationErrorQuantity &&
                      validationErrorAmount &&
                      validationErrorStore
                    : validationErrorDescription &&
                      validationErrorQuantity &&
                      validationErrorAmount
                }
                itemQuantity={transactionType === 'Gastos' ? itemQuantity : ''}
                unitValue={transactionType === 'Gastos' ? unitValue : ''}
                category={transactionType === 'Gastos' ? category : ''}
                selected={transactionType === 'Gastos' ? selected : ''} //store
                transactionType={transactionType}
                selectedDate={selectedDate}
                description={description}
                quantity={quantity}
                amount={amount}
                handleModalOnClose={closeBottomSheet}
              />
            </View>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  mainContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'stretch',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  modalView: {
    width: '100%',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 15,
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
  dragHandleArea: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    paddingBottom: 10,
    paddingTop: 8,
  },
  dragHandle: {
    alignSelf: 'center',
    borderRadius: 3,
    height: 5,
    width: 44,
  },
  modalContaier: {
    paddingHorizontal: 5,
    flex: 1,
  },
  inputContainer: {
    flex: 1,
  },
  inputContentContainer: {
    paddingBottom: 12,
  },
  switchContainer: {
    height: 90,
    marginBottom: 10,
  },
});

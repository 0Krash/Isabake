import React from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import typography from '../../constants/TransactionBalance/Typography';
import { capitalizeUserEntry } from '../../utils/textEntryFormat';

const ManagedOptionPickerModal = ({
  addLabel = 'Agregar',
  canManage = true,
  colors,
  deleteAccessibilityLabel,
  emptyLabel,
  isVisible,
  newValue,
  newValuePlaceholder,
  onAdd,
  onChangeNewValue,
  onClose,
  onDelete,
  onSelect,
  options,
  selectedValue,
  title,
}) => {
  if (!isVisible) {
    return null;
  }

  const pickerOptions = [
    {
      id: 'empty-option',
      name: '',
    },
    ...options,
  ];
  const canAdd = Boolean(newValue.trim());

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={isVisible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <Pressable
          onPress={() => {
            Keyboard.dismiss();
            onClose();
          }}
          style={[styles.backdrop, { backgroundColor: colors.backdrop }]}
        />
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.screenBackground,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {title}
          </Text>
          <ScrollView
            contentContainerStyle={styles.optionsList}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator
            style={styles.optionsScroll}
          >
            {pickerOptions.map((option) => {
              const label = option.name || emptyLabel;
              const isSelected = selectedValue === option.name;

              return (
                <TouchableOpacity
                  activeOpacity={0.75}
                  key={option.id || option.name || 'empty-option'}
                  onPress={() => {
                    Keyboard.dismiss();
                    onSelect(option.name);
                  }}
                  style={[
                    styles.optionRow,
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
                      styles.optionText,
                      {
                        color: isSelected
                          ? colors.primaryText
                          : colors.textPrimary,
                      },
                    ]}
                  >
                    {label}
                  </Text>
                  {canManage && !!option.name && onDelete && (
                    <TouchableOpacity
                      accessibilityLabel={
                        deleteAccessibilityLabel
                          ? deleteAccessibilityLabel(option)
                          : `Eliminar ${option.name}`
                      }
                      activeOpacity={0.7}
                      onPress={(event) => {
                        event.stopPropagation();
                        Keyboard.dismiss();
                        onDelete(option);
                      }}
                      style={styles.deleteButton}
                    >
                      <Text
                        style={[styles.deleteText, { color: colors.danger }]}
                      >
                        Eliminar
                      </Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {canManage ? (
          <View style={styles.newOptionContainer}>
            <TextInput
              onChangeText={(value) =>
                onChangeNewValue(capitalizeUserEntry(value))
              }
              placeholder={newValuePlaceholder}
              placeholderTextColor={colors.textMuted}
              style={[
                styles.newOptionInput,
                {
                  backgroundColor: colors.fieldBackground,
                  color: colors.textPrimary,
                },
              ]}
              value={newValue}
            />
            <TouchableOpacity
              activeOpacity={0.75}
              disabled={!canAdd}
              onPress={() => {
                Keyboard.dismiss();
                onAdd();
              }}
              style={[
                styles.newOptionButton,
                {
                  backgroundColor: canAdd ? colors.primary : colors.surfaceMuted,
                },
              ]}
            >
              <Text
                style={[
                  styles.newOptionButtonText,
                  {
                    color: canAdd ? colors.textInverse : colors.inactiveText,
                  },
                ]}
              >
                {addLabel}
              </Text>
            </TouchableOpacity>
          </View>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 18,
    maxHeight: '82%',
    padding: 16,
    width: '90%',
  },
  deleteButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -4,
    minHeight: 34,
    minWidth: 62,
  },
  deleteText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    lineHeight: 16,
  },
  newOptionButton: {
    alignItems: 'center',
    borderRadius: 8,
    height: 44,
    justifyContent: 'center',
    minWidth: 88,
    paddingHorizontal: 12,
  },
  newOptionButtonText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
  },
  newOptionContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  newOptionInput: {
    borderRadius: 8,
    flex: 1,
    fontSize: typography.sizes.body,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  optionRow: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  optionText: {
    flex: 1,
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.regular,
  },
  optionsList: {
    gap: 8,
    paddingRight: 2,
  },
  optionsScroll: {
    maxHeight: 380,
  },
  overlay: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.sizes.bodyLarge,
    fontWeight: typography.weights.semibold,
    marginBottom: 12,
  },
});

export default ManagedOptionPickerModal;

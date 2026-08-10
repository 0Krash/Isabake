import React, { useMemo } from 'react';
import {
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import typography from '../../constants/TransactionBalance/Typography';
import { useTransactionBalanceTheme } from '../../context/TransactionBalanceThemeContext';
import useKeyboardBottomInset from '../../hooks/useKeyboardBottomInset';

const defaultGetOptionKey = (option) => option?.id || option?.key || option?.name;
const defaultGetOptionTitle = (option) => option?.name || option?.value || '';
const defaultGetOptionDescription = () => '';

export default function SelectionPickerModal({
  emptyText = 'No hay registros disponibles.',
  getOptionDescription = defaultGetOptionDescription,
  getOptionKey = defaultGetOptionKey,
  getOptionTitle = defaultGetOptionTitle,
  isLoading = false,
  isVisible,
  loadingText = 'Cargando...',
  managerLabel,
  noResultsText = 'No encontramos resultados con ese criterio.',
  onClose,
  onOpenManager,
  onSearchChange,
  onSelect,
  options = [],
  searchPlaceholder = 'Buscar...',
  searchValue = '',
  selectedKey,
  title,
}) {
  const { colors } = useTransactionBalanceTheme();
  const { height: windowHeight } = useWindowDimensions();
  const keyboardBottomInset = useKeyboardBottomInset();
  const hasOptions = options.length > 0;
  const optionRows = useMemo(
    () =>
      options.map((option) => ({
        description: getOptionDescription(option),
        key: `${getOptionKey(option)}`,
        option,
        title: getOptionTitle(option),
      })),
    [getOptionDescription, getOptionKey, getOptionTitle, options],
  );

  if (!isVisible) {
    return null;
  }

  const closePicker = () => {
    Keyboard.dismiss();
    onClose?.();
  };

  return (
    <Modal
      animationType="fade"
      hardwareAccelerated
      navigationBarTranslucent
      onRequestClose={closePicker}
      statusBarTranslucent
      transparent
      visible={isVisible}
    >
      <View style={styles.overlay}>
        <Pressable
          onPress={closePicker}
          style={[styles.backdrop, { backgroundColor: colors.backdrop }]}
        />
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.screenBackground,
              borderColor: colors.border,
              marginBottom: keyboardBottomInset,
              maxHeight: windowHeight - keyboardBottomInset - 48,
            },
          ]}
        >
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {title}
          </Text>
          <TextInput
            onChangeText={onSearchChange}
            placeholder={searchPlaceholder}
            placeholderTextColor={colors.textMuted}
            style={[
              styles.searchInput,
              {
                backgroundColor: colors.fieldBackground,
                borderColor: colors.border,
                color: colors.textPrimary,
              },
            ]}
            value={searchValue}
          />
          {isLoading ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {loadingText}
            </Text>
          ) : !hasOptions && searchValue.trim() ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {noResultsText}
            </Text>
          ) : !hasOptions ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {emptyText}
            </Text>
          ) : (
            <ScrollView
              contentContainerStyle={styles.optionsList}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
              style={styles.optionsScroll}
            >
              {optionRows.map(({ description, key, option, title: optionTitle }) => {
                const isSelected = `${selectedKey || ''}` === key;

                return (
                  <TouchableOpacity
                    activeOpacity={0.75}
                    key={key}
                    onPress={() => {
                      Keyboard.dismiss();
                      onSelect?.(option);
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
                      numberOfLines={1}
                      style={[
                        styles.optionTitle,
                        {
                          color: isSelected
                            ? colors.primaryText
                            : colors.textPrimary,
                        },
                      ]}
                    >
                      {optionTitle}
                    </Text>
                    {description ? (
                      <Text
                        numberOfLines={1}
                        style={[styles.optionMeta, { color: colors.textMuted }]}
                      >
                        {description}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
          {managerLabel && onOpenManager ? (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => {
                Keyboard.dismiss();
                onClose?.();
                onOpenManager();
              }}
              style={[
                styles.managerButton,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[styles.managerButtonText, { color: colors.textPrimary }]}
              >
                {managerLabel}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  card: {
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 16,
    width: '84%',
  },
  emptyText: {
    fontSize: typography.sizes.body,
    lineHeight: 22,
    paddingVertical: 8,
  },
  managerButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    marginTop: 4,
    width: '100%',
  },
  managerButtonText: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
  },
  optionMeta: {
    fontSize: typography.sizes.caption,
    lineHeight: 17,
    marginTop: 3,
  },
  optionRow: {
    alignItems: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 62,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionsList: {
    gap: 8,
    paddingBottom: 2,
  },
  optionsScroll: {
    flexShrink: 1,
    maxHeight: 470,
    width: '100%',
  },
  optionTitle: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
  },
  overlay: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  searchInput: {
    borderRadius: 8,
    borderWidth: 1,
    fontSize: typography.sizes.body,
    minHeight: 46,
    paddingHorizontal: 12,
    width: '100%',
  },
  title: {
    fontSize: typography.sizes.bodyLarge,
    fontWeight: typography.weights.semibold,
    marginBottom: 4,
  },
});

import React from 'react';
import {
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';

import typography from '../../constants/TransactionBalance/Typography';

const QuickFilterChips = ({
  colors,
  filters,
  getAccessibilityLabel,
  getKey,
  getLabel,
  getValue,
  inactiveTextColor,
  onSelect,
  scrollStyle,
  selectedKey,
  selectedTextColor,
}) => (
  <ScrollView
    contentContainerStyle={styles.filterList}
    horizontal
    keyboardShouldPersistTaps="handled"
    showsHorizontalScrollIndicator={false}
    style={[styles.filterScroll, scrollStyle]}
  >
    {filters.map((filter) => {
      const key = getKey(filter);
      const label = getLabel(filter);
      const value = getValue ? getValue(filter) : undefined;
      const isSelected = selectedKey === key;
      const displayLabel = value === undefined ? label : `${label} (${value})`;

      return (
        <TouchableOpacity
          accessibilityLabel={
            getAccessibilityLabel
              ? getAccessibilityLabel(filter)
              : `Filtrar por ${label}`
          }
          accessibilityRole="button"
          activeOpacity={0.75}
          key={key || 'all'}
          onPress={() => {
            Keyboard.dismiss();
            onSelect(filter);
          }}
          style={[
            styles.filterChip,
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
              styles.filterText,
              {
                color: isSelected
                  ? selectedTextColor || colors.primaryText
                  : inactiveTextColor || colors.textSecondary,
              },
            ]}
          >
            {displayLabel}
          </Text>
        </TouchableOpacity>
      );
    })}
  </ScrollView>
);

const styles = StyleSheet.create({
  filterChip: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    height: 30,
    justifyContent: 'center',
    maxWidth: 156,
    minWidth: 92,
    paddingHorizontal: 14,
  },
  filterList: {
    alignItems: 'center',
    gap: 8,
    height: 30,
    paddingHorizontal: 15,
  },
  filterScroll: {
    flexGrow: 0,
    flexShrink: 0,
    height: 40,
    marginBottom: 5,
    maxHeight: 40,
    minHeight: 40,
  },
  filterText: {
    fontSize: typography.sizes.label,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
    width: '100%',
  },
});

export default QuickFilterChips;
